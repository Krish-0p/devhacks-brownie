/* ── App Root — Routing + Auth Guard + Socket Connection ── */

import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useSocketConnection } from './hooks/useSocket';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import MfaLogin from './pages/auth/MfaLogin';
import VerifyEmail from './pages/auth/VerifyEmail';
import ForgotPassword from './pages/auth/ForgotPassword';

// Protected pages
import Landing from './pages/Landing';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import HangmanGame from './pages/HangmanGame';
import TicTacToeGame from './pages/TicTacToeGame';
import FruitNinjaGame from './pages/FruitNinjaGame';
import Profile from './pages/Profile';
import Credits from './pages/Credits';
import Nearby from './pages/Nearby';
import PaymentStatus from './pages/PaymentStatus';
import { useGameStore } from './stores/gameStore';

/** Thin router: dispatches to the right game arena based on gameType */
function GameRouter() {
  const gameType = useGameStore(s => s.gameType);
  if (gameType === 'hangman') return <HangmanGame />;
  if (gameType === 'tictactoe') return <TicTacToeGame />;
  if (gameType === 'fruitninja') return <FruitNinjaGame />;
  return <Game />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl font-display font-black text-white logo-text mb-4">
            <span className="inline-block transform -rotate-2">DOODLE</span>{' '}
            <span className="inline-block text-secondary transform rotate-2">DASH</span>
          </div>
          <p className="text-white/60 font-bold text-lg animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  // Socket connection for authenticated users — hooks into all global events
  useSocketConnection();

  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/mfa" element={<PublicRoute><MfaLogin /></PublicRoute>} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

      {/* Protected routes */}
      <Route path="/" element={<ProtectedRoute><Landing /></ProtectedRoute>} />
      <Route path="/doodle" element={<ProtectedRoute><Home gameType="doodle" /></ProtectedRoute>} />
      <Route path="/hangman" element={<ProtectedRoute><Home gameType="hangman" /></ProtectedRoute>} />
      <Route path="/tictactoe" element={<ProtectedRoute><Home gameType="tictactoe" /></ProtectedRoute>} />
      <Route path="/fruitninja" element={<ProtectedRoute><Home gameType="fruitninja" /></ProtectedRoute>} />
      <Route path="/lobby" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
      <Route path="/game" element={<ProtectedRoute><GameRouter /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/credits" element={<ProtectedRoute><Credits /></ProtectedRoute>} />
      <Route path="/nearby" element={<ProtectedRoute><Nearby /></ProtectedRoute>} />
      <Route path="/payment-status/:orderId" element={<PaymentStatus />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const checkAuth = useAuthStore(s => s.checkAuth);
  const location = useLocation();

  // Check auth on app boot
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return <AppRoutes />;
}
