import { useEffect, useRef } from 'react';
import {
  createBrowserRouter,
  Outlet,
  RouterProvider,
  ScrollRestoration,
  useLocation,
  useMatches,
} from 'react-router-dom';
import { domAnimation, LazyMotion, MotionConfig } from 'motion/react';
import { AuthProvider, useAuth } from './app/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { Wordmark } from './components/Masthead';
import Landing from './pages/Landing';
import { PAGE_TITLES } from './content';
import NotFound from './pages/NotFound';

// Landing ships in the entry chunk because it is what most visitors see
// first; the signed-in pages load on demand.
const page = (load) => async () => ({ Component: (await load()).default });

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status" aria-label="Loading">
      <Wordmark className="animate-pulse text-3xl" />
    </div>
  );
}

/**
 * What a full page load does for free and a client-side navigation doesn't:
 * the tab title changes (from the route's handle) and focus moves to the new
 * page, so a screen reader announces it and Tab starts from the top instead
 * of from wherever the old page left focus. Only the path counts: the quiz
 * changes ?q= per question and manages its own focus.
 */
function usePageChange() {
  const { pathname } = useLocation();
  const matches = useMatches();
  const title = [...matches].reverse().find((m) => m.handle?.title)?.handle.title ?? PAGE_TITLES.landing;
  const firstPath = useRef(pathname);

  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => {
    // The first load keeps the browser's own behavior (focus at the top).
    if (pathname === firstPath.current) return;
    firstPath.current = null;
    const main = document.getElementById('main');
    if (!main) return;
    main.setAttribute('tabindex', '-1');
    main.focus({ preventScroll: true });
  }, [pathname]);
}

function RootLayout() {
  const { loading } = useAuth();
  usePageChange();
  return (
    // LazyMotion + <m.*> ships only the animation features we use (no layout
    // or drag), and strict mode throws if a full <motion.*> sneaks back in.
    // reducedMotion="user" makes every component honor the OS setting
    // without each page having to remember to check it.
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <a
          href="#main"
          className="sr-only z-50 bg-ink px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        {loading ? <Splash /> : <Outlet />}
        <ScrollRestoration />
      </MotionConfig>
    </LazyMotion>
  );
}

// Data router (not <BrowserRouter>) because the viewTransition option on
// navigate()/<Link> only works with a data router.
// don't touch / '/result' is also the OAuth success redirect target in
// server/routes/authRoutes.js; renaming it breaks sign-in.
const router = createBrowserRouter([
  {
    element: <RootLayout />,
    hydrateFallbackElement: <Splash />,
    children: [
      { path: '/', element: <Landing />, handle: { title: PAGE_TITLES.landing } },
      {
        element: (
          <ProtectedRoute>
            <Outlet />
          </ProtectedRoute>
        ),
        children: [
          {
            path: '/onboarding',
            lazy: page(() => import('./pages/Onboarding')),
            handle: { title: PAGE_TITLES.onboarding },
          },
          { path: '/loading', lazy: page(() => import('./pages/Loading')), handle: { title: PAGE_TITLES.loading } },
          { path: '/result', lazy: page(() => import('./pages/Result')), handle: { title: PAGE_TITLES.result } },
          { path: '/issues', lazy: page(() => import('./pages/Issues')), handle: { title: PAGE_TITLES.issues } },
        ],
      },
      { path: '*', element: <NotFound />, handle: { title: PAGE_TITLES.notFound } },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
