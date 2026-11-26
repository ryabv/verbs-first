import path from 'node:path';
import type { StorybookConfig } from '@storybook/react-vite';

/**
 * Storybook (docs/ARCHITECTURE.md, «Storybook»): все компоненты и экраны в разных состояниях — в одном месте.
 * Сборка своя (Vite), сайт по-прежнему собирает rspack; общие только исходники, алиас `@` и глобальные стили.
 */
const root = path.resolve(import.meta.dirname, '..');

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  framework: { name: '@storybook/react-vite', options: {} },
  // Озвучка, картинки музея, иконки — из public, как на сайте.
  staticDirs: ['../public'],
  core: { disableTelemetry: true },
  typescript: { reactDocgen: false },
  viteFinal(vite) {
    vite.resolve = { ...vite.resolve, alias: { ...vite.resolve?.alias, '@': path.join(root, 'src'), '@sb': path.join(root, '.storybook') } };
    vite.define = {
      ...vite.define,
      'process.env.BASE_URL': JSON.stringify(process.env.STORYBOOK_BASE ?? './'),
      'process.env.BUILD_ID': JSON.stringify('storybook'),
    };
    return vite;
  },
};

export default config;
