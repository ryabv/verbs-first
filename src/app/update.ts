/**
 * Обновление установленного приложения (PWA). На телефоне оно не перезагружается, а «просыпается» со старой
 * страницей в памяти — новая версия сайта приходила только после ручной перезагрузки.
 * Теперь при возвращении в приложение (и раз в полчаса, пока оно открыто) читаем version.json мимо кэшей
 * и, если номер сборки другой, перезагружаемся. Прогресс ученика — в IndexedDB, адрес страницы сохраняется.
 */
const CHECK_EVERY = 30 * 60 * 1000;

async function latestBuild(): Promise<string | undefined> {
  try {
    const response = await fetch(`${process.env.BASE_URL}version.json`, { cache: 'no-store' });
    if (!response.ok) return undefined;
    const { build } = (await response.json()) as { build?: string };
    return build;
  } catch {
    return undefined; // нет сети — проверим в следующий раз
  }
}

let checking = false;
async function check(): Promise<void> {
  if (checking) return;
  checking = true;
  const build = await latestBuild();
  checking = false;
  if (build && build !== process.env.BUILD_ID) window.location.reload();
}

export function watchForUpdates(): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void check();
  });
  setInterval(() => {
    if (document.visibilityState === 'visible') void check();
  }, CHECK_EVERY);
}
