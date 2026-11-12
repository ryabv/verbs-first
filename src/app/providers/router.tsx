import { createBrowserRouter, Navigate, Outlet, RouterProvider, ScrollRestoration, useMatch } from 'react-router';
import { AlphabetPage } from '@/pages/alphabet';
import { CardsPage } from '@/pages/cards';
import { HomePage } from '@/pages/home';
import { LessonPage } from '@/pages/lesson';
import { GrammarPage, GrammarTopicPage } from '@/pages/grammar';
import { ChapterRoute, StoryPage } from '@/pages/story';
import { TextPage, TextsPage } from '@/pages/texts';
import { AppFooter } from '@/widgets/app-footer';
import { AppHeader } from '@/widgets/app-header';
import { AudioPlayer } from '@/widgets/audio-player';

function Layout() {
  // Карта «Истории» (главная) занимает весь экран под шапкой — подвал там не нужен (иначе появится прокрутка).
  const fullScreen = useMatch('/');
  return (
    <>
      <AppHeader />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
      {!fullScreen && <AppFooter />}
      {/* На карте «Истории» озвучки нет, а левый нижний угол занят карточкой главы. */}
      {!fullScreen && <AudioPlayer />}
      <ScrollRestoration />
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      // Главная — карта «Истории». Уроки и тексты из шапки убраны, но открываются по прямым ссылкам.
      { path: '/', element: <StoryPage /> },
      { path: '/lessons', element: <HomePage /> },
      { path: '/lesson/:lessonId', element: <LessonPage /> },
      { path: '/cards', element: <CardsPage /> },
      { path: '/alphabet', element: <AlphabetPage /> },
      { path: '/texts', element: <TextsPage /> },
      { path: '/texts/:textId', element: <TextPage /> },
      { path: '/grammar', element: <GrammarPage /> },
      { path: '/grammar/:topicId', element: <GrammarTopicPage /> },
      { path: '/story', element: <Navigate to="/" replace /> },
      { path: '/story/:chapterId', element: <ChapterRoute /> },
      { path: '/story/:chapterId/:step', element: <ChapterRoute /> },
      { path: '/story/:chapterId/cat/:branch', element: <ChapterRoute /> },
    ],
  },
], { basename: process.env.BASE_URL.replace(/\/$/, '') || '/' });

export function AppRouter() {
  return <RouterProvider router={router} />;
}
