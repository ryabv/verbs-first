import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration } from 'react-router';
import { AlphabetPage } from '@/pages/alphabet';
import { CardsPage } from '@/pages/cards';
import { HomePage } from '@/pages/home';
import { LessonPage } from '@/pages/lesson';
import { ChapterRoute, StoryPage } from '@/pages/story';
import { TextPage, TextsPage } from '@/pages/texts';
import { AppFooter } from '@/widgets/app-footer';
import { AppHeader } from '@/widgets/app-header';

function Layout() {
  return (
    <>
      <AppHeader />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
      <AppFooter />
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
      { path: '/story', element: <StoryPage /> },
      { path: '/story/:chapterId', element: <ChapterRoute /> },
      { path: '/story/:chapterId/:step', element: <ChapterRoute /> },
    ],
  },
], { basename: process.env.BASE_URL.replace(/\/$/, '') || '/' });

export function AppRouter() {
  return <RouterProvider router={router} />;
}
