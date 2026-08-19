import React from 'react';
import ReactDOM from 'react-dom/client';
import { Route, Switch, Redirect } from 'wouter';
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

function ProtectedAdminRoute({ component: Component }: Readonly<{ component: React.ComponentType }>) {
  const [authed, setAuthed] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data?.session);
    });
  }, []);

  if (authed === null) return <Loader />;
  if (!authed) return <Redirect to="/admin/login" />;
  return <Component />;
}

export default function AppRoutes() {
  return (
    <PageTracker>
      <Switch>
        {/* === Trasy bez głównego Layoutu (Panel Admina & Login) === */}
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/admin/login" component={AdminLogin} />

        <Route path="/admin">
          <ProtectedAdminRoute component={AdminDashboard} />
        </Route>
        <Route path="/admin/aktualnosci">
          <ProtectedAdminRoute component={PostsList} />
        </Route>
        <Route path="/admin/aktualnosci/:id">
          <ProtectedAdminRoute component={PostEdit} />
        </Route>
        <Route path="/admin/zespol">
          <ProtectedAdminRoute component={TeamList} />
        </Route>
        <Route path="/admin/zespol/:id">
          <ProtectedAdminRoute component={TeamEdit} />
        </Route>
        <Route path="/admin/strony/o-nas">
          <ProtectedAdminRoute component={AboutEdit} />
        </Route>
        <Route path="/admin/strony/kontakt">
          <ProtectedAdminRoute component={ContactEdit} />
        </Route>
        <Route path="/admin/strony/social">
          <ProtectedAdminRoute component={SocialEdit} />
        </Route>
        <Route path="/admin/strony/join">
          <ProtectedAdminRoute component={JoinUsEdit} />
        </Route>
        <Route path="/admin/strony/materials">
          <ProtectedAdminRoute component={MaterialsAdmin} />
        </Route>
        <Route path="/admin/media">
          <ProtectedAdminRoute component={Media} />
        </Route>
        <Route path="/admin/dokumenty">
          <ProtectedAdminRoute component={AdminDocuments} />
        </Route>

        {/* === Publiczne trasy produkcyjne otoczone Layoutem === */}
        <Route>
          <Layout>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/aktualnosci" component={Blog} />
              <Route path="/aktualnosci/:slug" component={Post} />
              <Route path="/o-nas" component={About} />
              <Route path="/zespol" component={Team} />
              <Route path="/dokumenty" component={Documents} />
              <Route path="/kontakt" component={Contact} />
              <Route path="/linki" component={Links} />
              <Route path="/links" component={Links} />
              <Route path="/materialy" component={Materials} />
              <Route path="/wplacam" component={Links} />
              <Route path="/newsletter" component={Links} />
              <Route path="/dziekujemy" component={ThankYou} />
              <Route path="/w/:slug" component={TeamMemberCard} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </Route>
      </Switch>
    </PageTracker>
  );
}

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
  </React.StrictMode>
);