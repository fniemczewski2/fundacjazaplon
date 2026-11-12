import React from 'react';
import { Route, Switch, useLocation } from 'wouter';
import Layout from '../components/Layout';
import PageTracker from '../components/PageTracker';
import { ErrorBoundary } from '../components/ErrorBoundary';
import ProtectedAdminRoute from './ProtectedAdminRoute';

const Home = React.lazy(() => import('../routes/Home'));
const Blog = React.lazy(() => import('../routes/Blog'));
const Post = React.lazy(() => import('../routes/Post'));
const About = React.lazy(() => import('../routes/About'));
const Team = React.lazy(() => import('../routes/Team'));
const Contact = React.lazy(() => import('../routes/Contact'));
const Documents = React.lazy(() => import('../routes/Documents'));
const Materials = React.lazy(() => import('../routes/Materials'));
const NotFound = React.lazy(() => import('../routes/NotFound'));
const Links = React.lazy(() => import('../routes/Links'));
const Settlement = React.lazy(() => import('../routes/Settlement'));
const Agreement = React.lazy(() => import('../routes/Agreement'));
const AgreementSign = React.lazy(() => import('../routes/AgreementSign'));
const ThankYou = React.lazy(() => import('../routes/ThankYou'));
const TeamMemberCard = React.lazy(() => import('../routes/TeamMemberCard'));
const PrivacyPolicy = React.lazy(() => import('../routes/PrivacyPolicy'));
const Terms = React.lazy(() => import('../routes/Terms'));

const AdminLogin = React.lazy(() => import('../routes/admin/Login'));
const ResetPasswordPage = React.lazy(() => import('../routes/admin/Password'));
const AdminDashboard = React.lazy(() => import('../routes/admin/Dashboard'));
const PostsList = React.lazy(() => import('../routes/admin/posts/PostsList'));
const PostEdit = React.lazy(() => import('../routes/admin/posts/PostEdit'));
const TeamList = React.lazy(() => import('../routes/admin/team/TeamList'));
const TeamEdit = React.lazy(() => import('../routes/admin/team/TeamEdit'));
const ContactEdit = React.lazy(() => import('../routes/admin/pages/ContactEdit'));
const AboutEdit = React.lazy(() => import('../routes/admin/pages/AboutEdit'));
const SocialEdit = React.lazy(() => import('../routes/admin/pages/SocialEdit'));
const JoinUsEdit = React.lazy(() => import('../routes/admin/pages/JoinUsEdit'));
const MaterialsAdmin = React.lazy(() => import('../routes/admin/pages/Materials'));
const Media = React.lazy(() => import('../routes/admin/Media'));
const AdminDocuments = React.lazy(() => import('../routes/admin/Documents'));
const AdminSettlements = React.lazy(() => import('../routes/admin/Settlements'));
const AdminAgreements = React.lazy(() => import('../routes/admin/Agreements'));

/** Trasy panelu: każda ma tytuł karty i jest chroniona przez `ProtectedAdminRoute`. */
const ADMIN_ROUTES: ReadonlyArray<{ path: string; title: string; component: React.ComponentType }> = [
  { path: '/admin', title: 'Panel', component: AdminDashboard },
  { path: '/admin/aktualnosci', title: 'Aktualności', component: PostsList },
  { path: '/admin/aktualnosci/:id', title: 'Edycja wpisu', component: PostEdit },
  { path: '/admin/zespol', title: 'Zespół', component: TeamList },
  { path: '/admin/zespol/:id', title: 'Edycja osoby', component: TeamEdit },
  { path: '/admin/strony/o-nas', title: 'Strona: O nas', component: AboutEdit },
  { path: '/admin/strony/kontakt', title: 'Strona: Kontakt', component: ContactEdit },
  { path: '/admin/strony/social', title: 'Linki społecznościowe', component: SocialEdit },
  { path: '/admin/strony/join', title: 'Dołącz do nas', component: JoinUsEdit },
  { path: '/admin/strony/materials', title: 'Materiały do pobrania', component: MaterialsAdmin },
  { path: '/admin/media', title: 'Media', component: Media },
  { path: '/admin/rozliczenia', title: 'Rozliczenia faktur', component: AdminSettlements },
  { path: '/admin/umowy', title: 'Umowy i zgody', component: AdminAgreements },
  { path: '/admin/dokumenty', title: 'Dokumenty', component: AdminDocuments },
];

const PUBLIC_ROUTES: ReadonlyArray<{ path: string; component: React.ComponentType }> = [
  { path: '/', component: Home },
  { path: '/aktualnosci', component: Blog },
  { path: '/aktualnosci/:slug', component: Post },
  { path: '/o-nas', component: About },
  { path: '/zespol', component: Team },
  { path: '/dokumenty', component: Documents },
  { path: '/kontakt', component: Contact },
  { path: '/linki', component: Links },
  { path: '/links', component: Links },
  { path: '/materialy', component: Materials },
  { path: '/wplacam', component: Links },
  { path: '/newsletter', component: Links },
  { path: '/rozliczenia', component: Settlement },
  { path: '/wspolpraca', component: Agreement },
  { path: '/umowa/:token?', component: AgreementSign },
  { path: '/dziekujemy', component: ThankYou },
  { path: '/polityka-prywatnosci', component: PrivacyPolicy },
  { path: '/regulamin', component: Terms },
  { path: '/w/:slug', component: TeamMemberCard },
];

export default function AppRoutes() {
  const [location] = useLocation();

  return (
    <PageTracker>
      <ErrorBoundary variant="route" resetKey={location}>
        <Switch>
          {/* Trasy bez głównego Layoutu (logowanie i panel) */}
          <Route path="/reset-password" component={ResetPasswordPage} />
          <Route path="/admin/login" component={AdminLogin} />

          {ADMIN_ROUTES.map(({ path, title, component }) => (
            <Route key={path} path={path}>
              <ProtectedAdminRoute title={title} component={component} />
            </Route>
          ))}

          {/* Trasy publiczne otoczone Layoutem */}
          <Route>
            <Layout>
              <Switch>
                {PUBLIC_ROUTES.map(({ path, component }) => (
                  <Route key={path} path={path} component={component} />
                ))}
                <Route component={NotFound} />
              </Switch>
            </Layout>
          </Route>
        </Switch>
      </ErrorBoundary>
    </PageTracker>
  );
}
