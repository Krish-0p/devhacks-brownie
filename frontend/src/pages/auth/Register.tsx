/* ── Register Page ── */

import { useState, useRef, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { GameBtn, Icon } from '../../components/ui';

export default function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Username availability check
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const checkTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const checkUsername = (value: string) => {
    setUsername(value);
    if (checkTimer.current) clearTimeout(checkTimer.current);

    if (value.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');
    checkTimer.current = setTimeout(async () => {
      try {
        const res = await api.get<{ available: boolean }>(`/auth/check-username/${value}`);
        setUsernameStatus(res.available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 400);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (usernameStatus === 'taken') {
      setError('Username is taken');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', { email, username, password });
      navigate('/verify-email', { state: { email } });
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-6xl md:text-7xl font-black font-display text-white logo-text flex items-center justify-center gap-3">
          <span className="transform -rotate-2">DOODLE</span>
          <span className="text-secondary transform rotate-2">DASH</span>
        </h1>
      </div>

      <div className="w-full max-w-md bg-surface-card rounded-3xl border-4 border-dark-outline shadow-chunky-lg p-6 md:p-8 relative">
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-neon-green text-dark-outline font-black px-6 py-1.5 rounded-full border-2 border-dark-outline text-sm uppercase tracking-wider shadow-chunky-sm whitespace-nowrap z-10">
          Create Account
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-1">
            <label className="text-sm font-black text-gray-500 ml-1 uppercase tracking-wide">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="w-full bg-gray-50 border-4 border-dark-outline text-dark-outline font-bold text-lg rounded-2xl py-3 px-4 focus:ring-0 focus:border-primary outline-none shadow-inner-chunky"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-black text-gray-500 ml-1 uppercase tracking-wide">Username</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={e => checkUsername(e.target.value.toLowerCase())}
                required
                minLength={3}
                placeholder="cool_username"
                className={`w-full bg-gray-50 border-4 text-dark-outline font-bold text-lg rounded-2xl py-3 px-4 pr-10 focus:ring-0 outline-none shadow-inner-chunky transition-all
                  ${usernameStatus === 'available' ? 'border-green-500' : usernameStatus === 'taken' ? 'border-red-500' : 'border-dark-outline focus:border-primary'}
                `}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatus === 'checking' && <Icon name="hourglass_empty" className="text-gray-400 animate-spin" />}
                {usernameStatus === 'available' && <Icon name="check_circle" className="text-green-500" />}
                {usernameStatus === 'taken' && <Icon name="cancel" className="text-red-500" />}
              </span>
            </div>
            <p className="text-xs text-gray-400 font-bold ml-1">lowercase letters, numbers, underscores only</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-black text-gray-500 ml-1 uppercase tracking-wide">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full bg-gray-50 border-4 border-dark-outline text-dark-outline font-bold text-lg rounded-2xl py-3 px-4 focus:ring-0 focus:border-primary outline-none shadow-inner-chunky"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-black text-gray-500 ml-1 uppercase tracking-wide">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-gray-50 border-4 border-dark-outline text-dark-outline font-bold text-lg rounded-2xl py-3 px-4 focus:ring-0 focus:border-primary outline-none shadow-inner-chunky"
            />
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-300 text-red-700 font-bold text-sm rounded-xl px-4 py-2">
              {error}
            </div>
          )}

          <GameBtn type="submit" variant="green" size="lg" fullWidth disabled={loading}>
            <Icon name="person_add" className="text-2xl" />
            {loading ? 'Creating...' : 'CREATE ACCOUNT'}
          </GameBtn>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500 font-bold">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-black hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
