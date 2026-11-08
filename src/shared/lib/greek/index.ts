export { normalizeGreek, stripAccents } from './normalize';
export { compareAnswer, type AnswerVerdict } from './compare';

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
