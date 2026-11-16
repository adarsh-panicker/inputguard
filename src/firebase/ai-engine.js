/**
 * AI Engine — Hybrid Inference Manager for InputGuard
 * 
 * Uses Firebase AI Logic to route between:
 * - On-device (Gemini Nano) for privacy-critical tasks
 * - Cloud (Gemini Flash) for deep analysis
 */

import { getGenerativeModel, InferenceMode } from 'firebase/ai';
import { ai } from './config.js';

/**
 * Create model instances for different privacy/capability needs.
 * 
 * InputGuard uses multiple models with different inference modes:
 * 
 * 1. localOnlyModel  — ONLY_ON_DEVICE: For keystroke/PII analysis (NEVER leaves device)
 * 2. preferLocalModel — PREFER_ON_DEVICE: For form analysis (local first, cloud fallback)
 * 3. cloudModel       — ONLY_IN_CLOUD: For deep site analysis (needs cloud power)
 */

// 🔒 STRICT LOCAL: PII detection & input analysis — data NEVER leaves device
let localOnlyModel = null;
export function getLocalOnlyModel() {
  if (!localOnlyModel) {
    localOnlyModel = getGenerativeModel(ai, {
      mode: InferenceMode.ONLY_ON_DEVICE,
    });
  }
  return localOnlyModel;
}

// ⚡ PREFER LOCAL: Form context analysis — fast local, cloud fallback
let preferLocalModel = null;
export function getPreferLocalModel() {
  if (!preferLocalModel) {
    preferLocalModel = getGenerativeModel(ai, {
      mode: InferenceMode.PREFER_ON_DEVICE,
    });
  }
  return preferLocalModel;
}

// ☁️ CLOUD ONLY: Deep analysis — privacy policies, site reputation
let cloudModel = null;
export function getCloudModel() {
  if (!cloudModel) {
    cloudModel = getGenerativeModel(ai, {
      mode: InferenceMode.ONLY_IN_CLOUD,
    });
  }
  return cloudModel;
}

/**
 * Analyze input text for PII — runs ONLY on-device
 * @param {string} inputText - The text the user is typing
 * @returns {Promise<Object>} PII analysis result
 */
export async function analyzePII(inputText) {
  const model = getLocalOnlyModel();

  const prompt = `You are a PII (Personally Identifiable Information) detection engine.
Analyze the following text and identify any sensitive data.

Respond ONLY with valid JSON in this exact format:
{
  "hasPII": boolean,
  "severity": "none" | "low" | "medium" | "high" | "critical",
  "detections": [
    {
      "type": "ssn" | "credit_card" | "phone" | "email" | "address" | "name" | "dob" | "password" | "api_key" | "financial" | "medical" | "other",
      "value_preview": "first 2 chars + ***",
      "confidence": 0.0-1.0
    }
  ]
}

Text to analyze:
"${inputText}"`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    // If on-device model isn't available, use regex fallback (still local)
    console.warn('[InputGuard] On-device PII analysis unavailable, using regex fallback:', error.message);
    return regexPIIFallback(inputText);
  }
}

/**
 * Analyze form context — what data does this form actually need?
 * Prefers on-device, falls back to cloud
 * @param {Object} formData - Form metadata (fields, labels, page URL, title)
 * @returns {Promise<Object>} Form necessity analysis
 */
export async function analyzeFormContext(formData) {
  const model = getPreferLocalModel();

  const prompt = `You are a web form privacy analyzer.
Given the following form information, determine which fields are NECESSARY for the form's purpose and which are UNNECESSARY data collection.

Form context:
- Page URL: ${formData.url}
- Page title: ${formData.title}
- Form action: ${formData.action || 'same page'}
- Form purpose (best guess): ${formData.inferredPurpose || 'unknown'}

Form fields:
${formData.fields.map(f => `- Field name: "${f.name}", type: "${f.type}", label: "${f.label}", required: ${f.required}`).join('\n')}

Respond ONLY with valid JSON:
{
  "formPurpose": "string describing the form's likely purpose",
  "overallRisk": "low" | "medium" | "high",
  "fields": [
    {
      "name": "field_name",
      "necessity": "required" | "expected" | "optional" | "suspicious" | "unnecessary",
      "reason": "brief explanation",
      "riskLevel": "safe" | "caution" | "warning" | "danger"
    }
  ],
  "warnings": ["array of privacy concerns about this form"]
}`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    console.error('[InputGuard] Form context analysis failed:', error.message);
    return null;
  }
}

/**
 * Deep site analysis — runs in cloud only
 * @param {string} url - The site URL to analyze
 * @param {string} pageContent - Relevant page content (sanitized)
 * @returns {Promise<Object>} Site trust analysis
 */
export async function analyzesite(url, pageContent) {
  const model = getCloudModel();

  const prompt = `You are a web privacy and trust analyst.
Analyze the following website information and provide a trust/privacy assessment.

URL: ${url}
Page content excerpt (sanitized, no PII):
${pageContent.substring(0, 2000)}

Respond ONLY with valid JSON:
{
  "trustScore": 0-100,
  "trustLevel": "trusted" | "moderate" | "suspicious" | "dangerous",
  "privacyConcerns": ["array of specific concerns"],
  "dataCollection": {
    "necessary": ["data types that are expected"],
    "suspicious": ["data types that seem unnecessary"],
    "excessive": ["data types that are red flags"]
  },
  "recommendation": "brief user-friendly recommendation"
}`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    return JSON.parse(responseText);
  } catch (error) {
    console.warn('[InputGuard] Site analysis AI failed, using intelligent heuristic fallback:', error.message);
    return heuristicSiteFallback(url);
  }
}

/**
 * Heuristic site reputation fallback
 * Analyzes domain patterns when cloud model is unreachable
 */
function heuristicSiteFallback(rawUrl) {
  let hostname = '';
  try {
    hostname = new URL(rawUrl).hostname.toLowerCase();
  } catch (_) {
    hostname = String(rawUrl).toLowerCase();
  }

  const suspiciousTLDs = ['.xyz', '.top', '.buzz', '.tk', '.ml', '.ga', '.cf', '.gq', '.icu'];
  const hasSuspiciousTLD = suspiciousTLDs.some(tld => hostname.endsWith(tld));
  const isIPAddress = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname);
  const isDemoSketchy = /sketchy|phish|verify-account|bank-update|secure-login|demo-untrusted/i.test(hostname) || /untrusted=true/i.test(rawUrl);

  if (isDemoSketchy || isIPAddress || hasSuspiciousTLD) {
    return {
      trustScore: 20,
      trustLevel: 'dangerous',
      privacyConcerns: [
        'Domain flagged by automated heuristic inspection',
        'Suspicious or untrusted hostname pattern',
        'Potential data exfiltration or phishing indicator'
      ],
      dataCollection: {
        necessary: ['none'],
        suspicious: ['credentials', 'financial'],
        excessive: ['SSN', 'passwords', 'financial identifiers']
      },
      recommendation: 'Do NOT submit sensitive PII or credentials on this site.'
    };
  }

  return {
    trustScore: 75,
    trustLevel: 'moderate',
    privacyConcerns: ['Unranked or third-party web domain'],
    dataCollection: {
      necessary: ['basic interaction data'],
      suspicious: [],
      excessive: []
    },
    recommendation: 'Standard caution advised when submitting personal data.'
  };
}

/**
 * Regex-based PII fallback (100% local, no AI needed)
 * Used when Gemini Nano is not available on the device
 */
function regexPIIFallback(text) {
  const detections = [];

  // SSN patterns
  if (/\b\d{3}-?\d{2}-?\d{4}\b/.test(text)) {
    detections.push({ type: 'ssn', value_preview: text.substring(0, 2) + '***', confidence: 0.9 });
  }

  // Credit card patterns (Luhn-compatible)
  if (/\b(?:\d[ -]*?){13,19}\b/.test(text)) {
    const nums = text.replace(/\D/g, '');
    if (nums.length >= 13 && nums.length <= 19) {
      detections.push({ type: 'credit_card', value_preview: nums.substring(0, 2) + '***', confidence: 0.85 });
    }
  }

  // Email
  if (/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(text)) {
    detections.push({ type: 'email', value_preview: text.match(/\b([A-Za-z0-9._%+-]+)@/)?.[1]?.substring(0, 2) + '***', confidence: 0.95 });
  }

  // Phone numbers
  if (/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(text)) {
    detections.push({ type: 'phone', value_preview: '**', confidence: 0.8 });
  }

  // API keys / tokens (long alphanumeric strings)
  if (/\b[A-Za-z0-9_-]{32,}\b/.test(text)) {
    detections.push({ type: 'api_key', value_preview: text.substring(0, 2) + '***', confidence: 0.7 });
  }

  const severity = detections.length === 0 ? 'none' :
    detections.some(d => ['ssn', 'credit_card'].includes(d.type)) ? 'critical' :
    detections.some(d => ['password', 'api_key'].includes(d.type)) ? 'high' :
    detections.length > 2 ? 'medium' : 'low';

  return {
    hasPII: detections.length > 0,
    severity,
    detections,
    source: 'regex_fallback'
  };
}
