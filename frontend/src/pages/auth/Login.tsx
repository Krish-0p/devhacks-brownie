/* ── Login Page ── */

import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';
import { GameBtn, Icon } from '../../components/ui';
import type { User } from '../../lib/types';

interface LoginResponse {
  user?: User;
  mfaRequired?: boolean;
  tempToken?: string;
  email?: string;
}

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore(s => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<LoginResponse>('/auth/login', { email, password });

      if (res.mfaRequired) {
        navigate('/mfa', { state: { tempToken: res.tempToken } });
      } else if (res.user) {
        login(res.user);
        navigate('/');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        // Backend returns 403 + code EMAIL_NOT_VERIFIED for unverified accounts
        if (err.code === 'EMAIL_NOT_VERIFIED') {
          navigate('/verify-email', { state: { email } });
        } else {
          setError(err.message);
        }
      } else {
        setError('Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="text-6xl md:text-7xl font-black font-display text-white logo-text flex items-center justify-center gap-3">
          <span className="transform -rotate-2">DOODLE</span>
          <span className="text-secondary transform rotate-2">DASH</span>
        </h1>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-surface-card rounded-3xl border-4 border-dark-outline shadow-chunky-lg p-6 md:p-8 relative">
        {/* Badge */}
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-accent text-dark-outline font-black px-6 py-1.5 rounded-full border-2 border-dark-outline text-sm uppercase tracking-wider shadow-chunky-sm whitespace-nowrap z-10">
          Sign In
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-1">
            <label className="text-sm font-black text-gray-500 ml-1 uppercase tracking-wide">Email</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full bg-gray-50 border-4 border-dark-outline text-dark-outline font-bold text-lg rounded-2xl py-3 px-4 focus:ring-0 focus:border-primary outline-none shadow-inner-chunky transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-black text-gray-500 ml-1 uppercase tracking-wide">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-gray-50 border-4 border-dark-outline text-dark-outline font-bold text-lg rounded-2xl py-3 px-4 focus:ring-0 focus:border-primary outline-none shadow-inner-chunky transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-300 text-red-700 font-bold text-sm rounded-xl px-4 py-2">
              {error}
            </div>
          )}

          <GameBtn type="submit" variant="green" size="lg" fullWidth disabled={loading}>
            <Icon name="login" className="text-2xl" />
            {loading ? 'Signing in...' : 'SIGN IN'}
          </GameBtn>
        </form>

        <div className="mt-6 space-y-3 text-center">
          <Link to="/forgot-password" className="block text-sm font-bold text-primary hover:underline">
            Forgot password?
          </Link>
          <div className="text-sm text-gray-500 font-bold">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-black hover:underline">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
