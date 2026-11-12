import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';

import './index.css';

import AppRoutes from './app/routes';
import { queryClient } from './app/queryClient';
import CookieConsent from './components/CookiesConsent';
import Loader from './components/Loader';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FeedbackProvider } from './components/ui/Feedback';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Nie znaleziono elementu #root w index.html.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <FeedbackProvider>
          <React.Suspense fallback={<Loader />}>
            <AppRoutes />
            <CookieConsent />
          </React.Suspense>
        </FeedbackProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
