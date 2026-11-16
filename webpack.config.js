const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: {
    background: './src/background.js',
    content: './src/content/content.js',
    popup: './src/popup/popup.js',
    sidepanel: './src/sidepanel/sidepanel.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'public', to: 'public' },
        { from: 'assets/icon.svg', to: 'assets/icon.svg' },
        { from: 'src/content/content.css', to: 'content.css' },
        { from: 'src/popup/popup.css', to: 'popup.css' },
        { from: 'src/sidepanel/sidepanel.css', to: 'sidepanel.css' },
      ],
    }),
    new HtmlWebpackPlugin({
      template: './src/popup/popup.html',
      filename: 'popup.html',
      chunks: ['popup'],
    }),
    new HtmlWebpackPlugin({
      template: './src/sidepanel/sidepanel.html',
      filename: 'sidepanel.html',
      chunks: ['sidepanel'],
    }),
  ],
  resolve: {
    extensions: ['.js'],
  },
  devtool: 'cheap-module-source-map',
  optimization: {
    minimize: false, // Keep readable for hackathon judges reviewing code
  },
};
