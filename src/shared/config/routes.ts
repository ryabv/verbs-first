export const routes = {
  home: () => '/',
  lesson: (id: number | string) => `/lesson/${id}`,
} as const;
