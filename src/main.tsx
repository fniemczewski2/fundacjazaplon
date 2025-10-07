// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

import './index.css';

import Layout from './components/Layout';
import Home from './routes/Home';
import Blog from './routes/Blog';
import Post from './routes/Post';
import About from './routes/About';
import Team from './routes/Team';
import Contact from './routes/Contact';

import AdminLogin from './routes/admin/Login';
import AdminDashboard from './routes/admin/Dashboard';
import PostsList from './routes/admin/posts/PostsList';
import PostEdit from './routes/admin/posts/PostEdit';
import TeamList from './routes/admin/team/TeamList';
import TeamEdit from './routes/admin/team/TeamEdit';
import ContactEdit from './routes/admin/pages/ContactEdit';
import AboutEdit from './routes/admin/pages/AboutEdit';
import SocialEdit from './routes/admin/pages/SocialEdit';
import Media from './routes/admin/Media';
import JoinUsEdit from './routes/admin/pages/JoinUsEdit';
import Documents from './routes/Documents';
import AdminDocuments from './routes/admin/Documents';

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/aktualnosci', element: <Blog /> },
      { path: '/aktualnosci/:slug', element: <Post /> },
      { path: '/o-nas', element: <About /> },
      { path: '/zespol', element: <Team /> },
      { path: '/dokumenty', element: <Documents/> },
      { path: '/kontakt', element: <Contact /> },
    ],
  },

  { path: '/admin/login', element: <AdminLogin /> },
  {
    path: '/admin',
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
);
