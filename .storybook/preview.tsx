import type { Decorator, Preview } from '@storybook/react-vite';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { loadSnapshot, type Snapshot } from '@/shared/lib/db';
import { AppFooter } from '@/widgets/app-footer';
import { AppHeader } from '@/widgets/app-header';
import { TODAY } from './fixtures';
import '@/app/styles/global.css';

/**
 * Параметры историй (docs/ARCHITECTURE.md, «Storybook»):
 * - `db` — снимок данных ученика (`.storybook/fixtures.ts`); по умолчанию — новый ученик;
 * - `storage` — настройки устройства в localStorage (`{ ключ: значение }`);
 * - `route` — адрес экрана: `{ path: '/story/:chapterId/:step', url: '/story/1/practice' }`;
 * - `today` — дата «сегодня» (по умолчанию TODAY), время — 10:00;
 * - `shell: 'app'` — экран в рамке сайта: шапка (на телефоне — нижнее меню) и подвал.
 * Тема — переключатель «Тема» в панели Storybook.
 */
declare module '@storybook/react-vite' {
  interface Parameters {
    db?: Snapshot;
    storage?: Record<string, string>;
    route?: { path: string; url: string };
    today?: string;
    shell?: 'app';
  }
}

const RealDate = Date;
/** Часы идут от «сегодня 10:00» — анимации на Date.now() живые, а даты на экране — одни и те же. */
function freezeToday(day: string) {
  const start = RealDate.now();
  const fixed = new RealDate(`${day}T10:00:00`).getTime();
  const now = () => fixed + (RealDate.now() - start);
  class StoryDate extends RealDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) super(now());
      else super(...(args as [string]));
    }
    static override now = now;
  }
  globalThis.Date = StoryDate as DateConstructor;
}

/** Настройки устройства сайта — убрать перед историей (ключи Storybook не трогаем). */
function resetStorage(values: Record<string, string> = {}) {
  try {
    for (const key of Object.keys(localStorage)) if (!key.includes('storybook')) localStorage.removeItem(key);
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
  } catch {
    /* без localStorage — по умолчанию */
  }
}

const withTheme: Decorator = (Story, { globals }) => {
  document.documentElement.dataset.theme = globals.theme === 'dark' ? 'dark' : 'light';
  return <Story />;
};

const withRouter: Decorator = (Story, { parameters }) => {
  const { path = '*', url = '/' } = parameters.route ?? {};
  const page =
    parameters.shell === 'app' ? (
      // #root — как на сайте: от него считаются высота экрана и отступ под нижнее меню.
      <div id="root">
        <AppHeader />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Story />
        </main>
        <AppFooter />
      </div>
    ) : (
      <Story />
    );
  const router = createMemoryRouter(
    [
      { path, element: page },
      // Переход по ссылке внутри истории — остаёмся на том же экране.
      { path: '*', element: page },
    ],
    { initialEntries: [url] },
  );
  return <RouterProvider router={router} />;
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Тема',
      toolbar: {
        title: 'Тема',
        icon: 'contrast',
        items: [
          { value: 'light', title: 'Светлая', icon: 'sun' },
          { value: 'dark', title: 'Тёмная', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  parameters: {
    layout: 'padded',
    controls: { expanded: true },
    viewport: {
      options: {
        phone: { name: 'Телефон', styles: { width: '390px', height: '844px' }, type: 'mobile' },
        tablet: { name: 'Планшет', styles: { width: '820px', height: '1180px' }, type: 'tablet' },
        desktop: { name: 'Компьютер', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
      },
    },
    options: {
      storySort: { order: ['Экраны', 'Виджеты', 'Фичи', 'Сущности', 'Общее'] },
    },
  },
  beforeEach({ parameters }) {
    freezeToday(parameters.today ?? TODAY);
    resetStorage(parameters.storage);
    loadSnapshot(parameters.db ?? {});
    return () => {
      globalThis.Date = RealDate;
    };
  },
  decorators: [withRouter, withTheme],
};

export default preview;
