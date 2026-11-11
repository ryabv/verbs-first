import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration, useMatch } from 'react-router';
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
  // Карта «Истории» занимает весь экран под шапкой — подвал там не нужен (иначе появится прокрутка).
  const fullScreen = useMatch('/story');
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
      { path: '/', element: <HomePage /> },
      { path: '/lesson/:lessonId', element: <LessonPage /> },
      { path: '/cards', element: <CardsPage /> },
      { path: '/alphabet', element: <AlphabetPage /> },
      { path: '/texts', element: <TextsPage /> },
      { path: '/texts/:textId', element: <TextPage /> },
      { path: '/grammar', element: <GrammarPage /> },
      { path: '/grammar/:topicId', element: <GrammarTopicPage /> },
      { path: '/story', element: <StoryPage /> },
      { path: '/story/:chapterId', element: <ChapterRoute /> },
      { path: '/story/:chapterId/:step', element: <ChapterRoute /> },
    ],
  },
], { basename: process.env.BASE_URL.replace(/\/$/, '') || '/' });

export function AppRouter() {
  return <RouterProvider router={router} />;
}
