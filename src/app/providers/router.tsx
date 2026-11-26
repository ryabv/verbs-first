import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration, useLocation } from 'react-router';
import { AlphabetPage } from '@/pages/alphabet';
import { CardsPage } from '@/pages/cards';
import { DayRoute, TodayPage } from '@/pages/daily';
import { HomePage } from '@/pages/home';
import { LessonPage } from '@/pages/lesson';
import { MainPage } from '@/pages/main';
import { CollectionPage, ProfilePage } from '@/pages/profile';
import { GrammarPage, GrammarTopicPage } from '@/pages/grammar';
import { ChapterRoute, StoryPage } from '@/pages/story';
import { TextPage, TextsPage } from '@/pages/texts';
import { AppFooter } from '@/widgets/app-footer';
import { AppHeader } from '@/widgets/app-header';
import { AudioPlayer } from '@/widgets/audio-player';
import { routes } from '@/shared/config/routes';

function Layout() {
  const { pathname } = useLocation();
  // Карта «Истории» занимает весь экран под шапкой — подвал там не нужен (иначе появится прокрутка).
  const fullScreen = pathname === routes.story();
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
      // Главная — прогресс по зонам; карта «Истории» — /story. Уроки и тексты открываются по прямым ссылкам.
      { path: '/', element: <MainPage /> },
      { path: '/island', element: <StoryPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/profile/collection', element: <CollectionPage /> },
      { path: '/lessons', element: <HomePage /> },
      { path: '/lesson/:lessonId', element: <LessonPage /> },
      { path: '/cards', element: <CardsPage /> },
      { path: '/today', element: <TodayPage /> },
      { path: '/today/:date', element: <DayRoute /> },
      { path: '/alphabet', element: <AlphabetPage /> },
      { path: '/alphabet/:step', element: <AlphabetPage /> },
      { path: '/alphabet/note/:note', element: <AlphabetPage /> },
      { path: '/texts', element: <TextsPage /> },
      { path: '/texts/:textId', element: <TextPage /> },
      { path: '/grammar', element: <GrammarPage /> },
      { path: '/grammar/:topicId', element: <GrammarTopicPage /> },
      { path: '/story/:chapterId', element: <ChapterRoute /> },
      { path: '/story/:chapterId/:step', element: <ChapterRoute /> },
      { path: '/story/:chapterId/cat/:branch', element: <ChapterRoute /> },
    ],
  },
], { basename: process.env.BASE_URL.replace(/\/$/, '') || '/' });

export function AppRouter() {
  return <RouterProvider router={router} />;
}
