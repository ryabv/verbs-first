// Скрипты импортируют слайсы через index.ts, где есть UI с CSS-модулями: подменяем CSS пустым объектом.
import { register } from 'node:module';

register(
  'data:text/javascript,' +
    encodeURIComponent(`
export async function load(url, context, next) {
  if (url.endsWith('.css')) return { format: 'module', source: 'export default {};', shortCircuit: true };
  return next(url, context);
}`),
);
