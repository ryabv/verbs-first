import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initTheme } from '@/features/theme-switcher';
import { AppRouter } from './providers/router';
import './styles/global.css';

initTheme();

// PWA: офлайн-режим и установка на телефон. В разработке не нужен — мешал бы горячей перезагрузке.
if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${process.env.BASE_URL}sw.js`).catch(() => {
      /* без офлайна сайт всё равно работает */
    });
  });
}

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');

createRoot(root).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
);
