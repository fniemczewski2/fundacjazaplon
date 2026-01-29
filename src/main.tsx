// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, redirect } from 'react-router-dom';

import './index.css';

import Layout from './components/Layout';
import { supabase } from './lib/supabase';
import Links from './routes/Links';

// --- Lazy loaded public routes ---
const Home = React.lazy(() => import('./routes/Home'));
const Blog = React.lazy(() => import('./routes/Blog'));
const Post = React.lazy(() => import('./routes/Post'));
const About = React.lazy(() => import('./routes/About'));
const Team = React.lazy(() => import('./routes/Team'));
const Contact = React.lazy(() => import('./routes/Contact'));
const Documents = React.lazy(() => import('./routes/Documents'));

// --- Lazy loaded admin routes ---
const AdminLogin = React.lazy(() => import('./routes/admin/Login'));
const AdminDashboard = React.lazy(() => import('./routes/admin/Dashboard'));
const PostsList = React.lazy(() => import('./routes/admin/posts/PostsList'));
const PostEdit = React.lazy(() => import('./routes/admin/posts/PostEdit'));
const TeamList = React.lazy(() => import('./routes/admin/team/TeamList'));
const TeamEdit = React.lazy(() => import('./routes/admin/team/TeamEdit'));
const ContactEdit = React.lazy(() => import('./routes/admin/pages/ContactEdit'));
const AboutEdit = React.lazy(() => import('./routes/admin/pages/AboutEdit'));
const SocialEdit = React.lazy(() => import('./routes/admin/pages/SocialEdit'));
const JoinUsEdit = React.lazy(() => import('./routes/admin/pages/JoinUsEdit'));
const Media = React.lazy(() => import('./routes/admin/Media'));
const AdminDocuments = React.lazy(() => import('./routes/admin/Documents'));
const ResetPasswordPage = React.lazy(() => import('./routes/admin/Password'));

// --- Auth guards ---
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

// --- Router ---
const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/aktualnosci', element: <Blog /> },
      { path: '/aktualnosci/:slug', element: <Post /> },
      { path: '/o-nas', element: <About /> },
      { path: '/zespol', element: <Team /> },
      { path: '/dokumenty', element: <Documents /> },
      { path: '/kontakt', element: <Contact /> },
      { path: '/links', element: <Links /> },
    ],
  },

  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/admin/login', element: <AdminLogin />, loader: redirectIfAuthed },

  {
    path: '/admin',
    loader: requireAuth,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'aktualnosci', element: <PostsList /> },
      { path: 'aktualnosci/:id', element: <PostEdit /> },
      { path: 'zespol', element: <TeamList /> },
      { path: 'zespol/:id', element: <TeamEdit /> },
      { path: 'strony/o-nas', element: <AboutEdit /> },
      { path: 'strony/kontakt', element: <ContactEdit /> },
      { path: 'strony/social', element: <SocialEdit /> },
      { path: 'strony/join', element: <JoinUsEdit /> },
      { path: 'media', element: <Media /> },
      { path: 'dokumenty', element: <AdminDocuments /> },
    ],
  },
]);

// --- Render ---
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.Suspense fallback={<div className="p-6">Ładowanie…</div>}>
    <RouterProvider router={router} />
  </React.Suspense>
);
