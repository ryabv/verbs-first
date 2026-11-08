/**
 * Текст, который реально произносится: без «/», «→», кавычек и скобок.
 * Используется и в браузере (поиск файла в манифесте), и в скрипте генерации аудио,
 * поэтому здесь нет зависимостей от DOM/React.
 */
export function speechText(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[()«»"]/g, '')
    .split(/\s*(?:\/|→)\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, i, parts) => (i < parts.length - 1 && !/[.!?;,]$/.test(part) ? `${part},` : part))
    .join(' ');
}
