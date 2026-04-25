import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import Loading from './pages/Loading';
import Result from './pages/Result';

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-5">
        <div className="text-xl font-bold text-white tracking-tight">
          Career<span className="text-indigo-400">AI</span>
        </div>
        <div className="w-9 h-9 border-2 border-slate-800 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-slate-500 text-sm">Initializing career neural network...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/onboarding" element={
        <ProtectedRoute><Onboarding /></ProtectedRoute>
      } />
      <Route path="/loading" element={
        <ProtectedRoute><Loading /></ProtectedRoute>
      } />
      <Route path="/result" element={
        <ProtectedRoute><Result /></ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
