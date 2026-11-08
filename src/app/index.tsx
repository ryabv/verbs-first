import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initTheme } from '@/features/theme-switcher';
import { AppRouter } from './providers/router';
import './styles/global.css';

initTheme();

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');

createRoot(root).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
);
