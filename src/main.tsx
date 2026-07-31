// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, redirect } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import './index.css';

import Layout from './components/Layout';
import { supabase } from './lib/supabase';
import CookieConsent from './components/CookiesConsent';
import PageTracker from './components/PageTracker';
import Loader from './components/Loader';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FeedbackProvider } from './components/ui/Feedback';

const Home      = React.lazy(() => import('./routes/Home'));
const Blog      = React.lazy(() => import('./routes/Blog'));
const Post      = React.lazy(() => import('./routes/Post'));
const About     = React.lazy(() => import('./routes/About'));
const Team      = React.lazy(() => import('./routes/Team'));
const Contact   = React.lazy(() => import('./routes/Contact'));
const Documents = React.lazy(() => import('./routes/Documents'));
const Materials = React.lazy(() => import('./routes/Materials'));
const NotFound  = React.lazy(() => import('./routes/NotFound'));
const Links     = React.lazy(() => import('./routes/Links'));
const ThankYou  = React.lazy(() => import('./routes/ThankYou'));
const TeamMemberCard = React.lazy(() => import('./routes/TeamMemberCard'));

const AdminLogin      = React.lazy(() => import('./routes/admin/Login'));
const AdminDashboard  = React.lazy(() => import('./routes/admin/Dashboard'));
const PostsList       = React.lazy(() => import('./routes/admin/posts/PostsList'));
const PostEdit        = React.lazy(() => import('./routes/admin/posts/PostEdit'));
const TeamList        = React.lazy(() => import('./routes/admin/team/TeamList'));
const TeamEdit        = React.lazy(() => import('./routes/admin/team/TeamEdit'));
const ContactEdit     = React.lazy(() => import('./routes/admin/pages/ContactEdit'));
const AboutEdit       = React.lazy(() => import('./routes/admin/pages/AboutEdit'));
const SocialEdit      = React.lazy(() => import('./routes/admin/pages/SocialEdit'));
const JoinUsEdit      = React.lazy(() => import('./routes/admin/pages/JoinUsEdit'));
const Media           = React.lazy(() => import('./routes/admin/Media'));
const AdminDocuments  = React.lazy(() => import('./routes/admin/Documents'));
const ResetPasswordPage = React.lazy(() => import('./routes/admin/Password'));
const MaterialsAdmin  = React.lazy(() => import('./routes/admin/pages/Materials'));

// Śledzenie stron realizuje wyłącznie gtag.js skonfigurowany w index.html
// (z poprawnym Google Consent Mode v2) + PageTracker.tsx na zmiany trasy SPA.
// Wcześniej istniała RÓWNOLEGLE druga, niezależna integracja przez `react-ga4`,
// która nigdy nie była poprawnie zainicjalizowana (martwy kod) — usunięta,
// żeby nie utrzymywać dwóch niespójnych ścieżek analitycznych naraz.

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

const requireAuth = async () => {
  const { data } = await supabase.auth.getSession();
  const session = data?.session ?? null;
  return session ? null : redirect('/admin/login');
};

const redirectIfAuthed = async () => {
  const { data } = await supabase.auth.getSession();
  const session = data?.session ?? null;
  return session ? redirect('/admin') : null;
};

const router = createBrowserRouter([
  {
    element: <PageTracker />,
    children: [

      {
        element: <Layout />,
        children: [
          { path: '/',                  element: <Home /> },
          { path: '/aktualnosci',       element: <Blog /> },
          { path: '/aktualnosci/:slug', element: <Post /> },
          { path: '/o-nas',             element: <About /> },
          { path: '/zespol',            element: <Team /> },
          { path: '/dokumenty',         element: <Documents /> },
          { path: '/kontakt',           element: <Contact /> },
          { path: '/linki',             element: <Links /> },
          { path: '/links',             element: <Links /> },
          { path: '/materialy',         element: <Materials /> },
          { path: '/wplacam',           element: <Links /> },
          { path: '/newsletter',        element: <Links /> },
          // Brakująca wcześniej trasa: success_url z api/create-stripe-session.ts
          // wskazywał tu, a bez tego wpisu darczyńca po udanej płatności lądował na 404.
          { path: '/dziekujemy',        element: <ThankYou /> },
          { path: "/w/:slug",           element: <TeamMemberCard /> },
          { path: '*',                  element: <NotFound /> },
        ],
      },

      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/admin/login', element: <AdminLogin />, loader: redirectIfAuthed },

      {
        path: '/admin',
        loader: requireAuth,
        children: [
          { index: true,                    element: <AdminDashboard /> },
          { path: 'aktualnosci',            element: <PostsList /> },
          { path: 'aktualnosci/:id',        element: <PostEdit /> },
          { path: 'zespol',                 element: <TeamList /> },
          { path: 'zespol/:id',             element: <TeamEdit /> },
          { path: 'strony/o-nas',           element: <AboutEdit /> },
          { path: 'strony/kontakt',         element: <ContactEdit /> },
          { path: 'strony/social',          element: <SocialEdit /> },
          { path: 'strony/join',            element: <JoinUsEdit /> },
          { path: 'strony/materials',       element: <MaterialsAdmin /> },
          { path: 'media',                  element: <Media /> },
          { path: 'dokumenty',              element: <AdminDocuments /> },
        ],
      },
    ],
  },
]);

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
            <RouterProvider router={router} />
            <CookieConsent />
          </React.Suspense>
        </FeedbackProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
