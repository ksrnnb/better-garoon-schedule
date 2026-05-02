import { Configuration } from 'webpack';
import path from 'path';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import ESLintPlugin from 'eslint-webpack-plugin';

const devEnv = 'development';
const env = process.env.NODE_ENV || devEnv;
const isDev = env === devEnv;

if (isDev) {
  console.info('development mode');
}

const config: Configuration = {
  mode: 'production',
  devtool: 'inline-source-map',
  entry: {
    content_scripts: path.resolve(__dirname, 'src/content_scripts.ts'),
    options: path.resolve(__dirname, 'src/options.ts'),
  },
  output: {
    path: path.join(__dirname, 'dist'),
    clean: true,
  },
  module: {
    rules: [
      {
        test: /.ts$/,
        use: 'ts-loader',
        exclude: '/node_modules/',
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  plugins: [
    new ESLintPlugin({
      configType: 'flat',
      extensions: ['ts'],
      failOnError: !isDev,
    }),
    new CopyWebpackPlugin({
      patterns: [{ from: 'public', to: '.' }],
    }),
  ],
};

export default config;
