import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration } from 'react-router';
import { HomePage } from '@/pages/home';
import { LessonPage } from '@/pages/lesson';
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
    ],
  },
], { basename: process.env.BASE_URL.replace(/\/$/, '') || '/' });

export function AppRouter() {
  return <RouterProvider router={router} />;
}
