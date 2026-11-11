import { createBrowserRouter, Outlet, RouterProvider, ScrollRestoration } from 'react-router-dom';
import { domAnimation, LazyMotion, MotionConfig } from 'motion/react';
import { AuthProvider, useAuth } from './app/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { Wordmark } from './components/Masthead';
import Landing from './pages/Landing';
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

function RootLayout() {
  const { loading } = useAuth();
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
      { path: '/', element: <Landing /> },
      {
        element: (
          <ProtectedRoute>
            <Outlet />
          </ProtectedRoute>
        ),
        children: [
          { path: '/onboarding', lazy: page(() => import('./pages/Onboarding')) },
          { path: '/loading', lazy: page(() => import('./pages/Loading')) },
          { path: '/result', lazy: page(() => import('./pages/Result')) },
          { path: '/issues', lazy: page(() => import('./pages/Issues')) },
        ],
      },
      { path: '*', element: <NotFound /> },
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
