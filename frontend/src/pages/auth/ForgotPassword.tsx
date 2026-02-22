/* ── Forgot Password Page (2-step) ── */

import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { GameBtn, Icon } from '../../components/ui';
import { toast } from 'sonner';

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast.success('Reset code sent to your email!');
      setStep(2);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword });
      toast.success('Password reset! Please sign in.');
      navigate('/login');
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
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-electric-orange text-white font-black px-6 py-1.5 rounded-full border-2 border-dark-outline text-sm uppercase tracking-wider shadow-chunky-sm whitespace-nowrap z-10">
          Reset Password
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendCode} className="space-y-5 mt-4">
            <div className="text-center mb-2">
              <Icon name="lock_reset" className="text-electric-orange text-5xl" />
              <p className="text-gray-500 font-bold mt-2">Enter your email to receive a reset code</p>
            </div>

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

            {error && (
              <div className="bg-red-50 border-2 border-red-300 text-red-700 font-bold text-sm rounded-xl px-4 py-2">
                {error}
              </div>
            )}

            <GameBtn type="submit" variant="orange" size="lg" fullWidth disabled={loading}>
              <Icon name="send" className="text-2xl" />
              {loading ? 'Sending...' : 'SEND CODE'}
            </GameBtn>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-5 mt-4">
            <div className="text-center mb-2">
              <p className="text-gray-500 font-bold">
                Code sent to <span className="text-dark-outline">{email}</span>
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-black text-gray-500 ml-1 uppercase tracking-wide">Reset Code</label>
              <input
                type="text"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                placeholder="000000"
                maxLength={6}
                className="w-full bg-gray-50 border-4 border-dark-outline text-dark-outline font-black text-2xl text-center tracking-[0.4em] rounded-2xl py-3 px-4 focus:ring-0 focus:border-primary outline-none shadow-inner-chunky"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-black text-gray-500 ml-1 uppercase tracking-wide">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full bg-gray-50 border-4 border-dark-outline text-dark-outline font-bold text-lg rounded-2xl py-3 px-4 focus:ring-0 focus:border-primary outline-none shadow-inner-chunky"
              />
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-300 text-red-700 font-bold text-sm rounded-xl px-4 py-2">
                {error}
              </div>
            )}

            <GameBtn type="submit" variant="orange" size="lg" fullWidth disabled={loading}>
              <Icon name="lock_reset" className="text-2xl" />
              {loading ? 'Resetting...' : 'RESET PASSWORD'}
            </GameBtn>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm font-bold text-primary hover:underline">
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
