const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const Dotenv = require('dotenv-webpack');   // 👈 add this

module.exports = {
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash].js',
    publicPath: '/',
    clean: true
  },
  resolve: { extensions: ['.ts', '.tsx', '.js'] },
  module: {
    rules: [
      { test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ },
      { test: /\.css$/i, use: ['style-loader', 'css-loader'] },
      { test: /\.(png|jpe?g|gif|svg|ico|woff2?|ttf|eot)$/i, type: 'asset/resource' }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
      inject: 'body'
    }),
    new Dotenv()   // 👈 yeh inject karega API_URL ko
  ],
  devServer: {
    historyApiFallback: true,
    port: 8081,
  }
};
