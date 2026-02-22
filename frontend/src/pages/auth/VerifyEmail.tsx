/* ── Verify Email Page ── */

import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { GameBtn, Icon } from '../../components/ui';
import { toast } from 'sonner';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string })?.email || '';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/verify-email', { email, otp });
      toast.success('Email verified! Please sign in.');
      navigate('/login');
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.post('/auth/resend-verification', { email });
      toast.success('Verification code resent!');
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
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
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-secondary text-dark-outline font-black px-6 py-1.5 rounded-full border-2 border-dark-outline text-sm uppercase tracking-wider shadow-chunky-sm whitespace-nowrap z-10">
          Verify Email
        </div>

        <div className="text-center mt-4 mb-6">
          <Icon name="mark_email_read" className="text-secondary text-5xl" />
          <p className="text-gray-500 font-bold mt-2">
            We sent a code to <span className="text-dark-outline">{email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="text"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            placeholder="000000"
            maxLength={6}
            className="w-full bg-gray-50 border-4 border-dark-outline text-dark-outline font-black text-3xl text-center tracking-[0.5em] rounded-2xl py-4 px-4 focus:ring-0 focus:border-primary outline-none shadow-inner-chunky"
          />

          {error && (
            <div className="bg-red-50 border-2 border-red-300 text-red-700 font-bold text-sm rounded-xl px-4 py-2">
              {error}
            </div>
          )}

          <GameBtn type="submit" variant="cyan" size="lg" fullWidth disabled={loading}>
            <Icon name="verified" className="text-2xl" />
            {loading ? 'Verifying...' : 'VERIFY EMAIL'}
          </GameBtn>
        </form>

        <div className="mt-6 space-y-3 text-center">
          <button onClick={handleResend} className="text-sm font-bold text-primary hover:underline">
            Resend code
          </button>
          <div>
            <Link to="/login" className="text-sm font-bold text-gray-500 hover:underline">
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
