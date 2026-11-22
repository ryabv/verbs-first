import path from 'node:path';
import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';
import { ReactRefreshRspackPlugin } from '@rspack/plugin-react-refresh';

const isDev = process.env.NODE_ENV !== 'production';
/** Префикс адреса сайта: '/' локально, '/verbs-first/' на GitHub Pages. */
const BASE_URL = process.env.BASE_URL ?? '/';
/** Номер сборки: зашит в код и лежит в version.json — приложение сравнивает их и узнаёт, что вышло обновление. */
const BUILD_ID = Date.now().toString(36);

/** Кладёт в сборку version.json с номером сборки. */
const versionFile = {
  apply(compiler: import('@rspack/core').Compiler) {
    compiler.hooks.thisCompilation.tap('version-file', (compilation) => {
      compilation.hooks.processAssets.tap({ name: 'version-file', stage: rspack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL }, () => {
        compilation.emitAsset('version.json', new rspack.sources.RawSource(JSON.stringify({ build: BUILD_ID })));
      });
    });
  },
};

export default defineConfig({
  entry: { main: './src/app/index.tsx' },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  module: {
    parser: {
      'css/auto': { namedExports: false },
    },
    rules: [
      { test: /\.css$/, type: 'css/auto' },
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: 'builtin:swc-loader',
        options: {
          jsc: {
            parser: { syntax: 'typescript', tsx: true },
            transform: {
              react: { runtime: 'automatic', development: isDev, refresh: isDev },
            },
          },
        },
      },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({ template: './public/index.html', templateParameters: { BASE_URL } }),
    // GitHub Pages отдаёт 404.html на любой неизвестный адрес — так работают прямые ссылки на уроки.
    !isDev &&
      new rspack.HtmlRspackPlugin({ template: './public/index.html', filename: '404.html', templateParameters: { BASE_URL } }),
    new rspack.DefinePlugin({ 'process.env.BASE_URL': JSON.stringify(BASE_URL), 'process.env.BUILD_ID': JSON.stringify(BUILD_ID) }),
    !isDev && versionFile,
    // Всё из public (в т.ч. сгенерированная озвучка public/audio) — как есть в dist.
    new rspack.CopyRspackPlugin({
      patterns: [{ from: 'public', globOptions: { ignore: ['**/index.html'] } }],
    }),
    isDev && new ReactRefreshRspackPlugin(),
  ].filter(Boolean),
  devServer: { historyApiFallback: true, port: 3000 },
  output: { publicPath: BASE_URL, clean: true },
});
