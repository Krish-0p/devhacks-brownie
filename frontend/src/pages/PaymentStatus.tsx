/* ── Payment Status Page – Doodle Dash ── */

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { GameBtn, Icon } from '../components/ui';

type PaymentState = 'LOADING' | 'COMPLETED' | 'FAILED' | 'PENDING' | 'ERROR';

interface StatusResponse {
  state: string;
  credits?: number;
  error?: string;
  orderId?: string;
}

export default function PaymentStatus() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const updateCredits = useAuthStore(s => s.updateCredits);

  const [state, setState] = useState<PaymentState>('LOADING');
  const [credits, setCredits] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(5);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!orderId) {
      setState('ERROR');
      setErrorMsg('No order ID found');
      return;
    }
    checkPayment();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [orderId]);

  const checkPayment = async () => {
    try {
      const res = await api.get<StatusResponse>(`/credits/check/${orderId}`);

      if (res.state === 'COMPLETED') {
        setState('COMPLETED');
        setCredits(res.credits ?? 0);
        // Refresh balance in store
        try {
          const balance = await api.get<{ credits: number }>('/credits/balance');
          updateCredits(balance.credits);
        } catch { /* ignore */ }
        startCountdown();
      } else if (res.state === 'FAILED') {
        setState('FAILED');
        setErrorMsg(res.error || 'Payment failed');
        startCountdown();
      } else if (res.state === 'PENDING') {
        setState('PENDING');
        // Poll every 4 seconds
        if (!pollRef.current) {
          pollRef.current = setInterval(async () => {
            try {
              const poll = await api.get<StatusResponse>(`/credits/check/${orderId}`);
              if (poll.state === 'COMPLETED') {
                if (pollRef.current) clearInterval(pollRef.current);
                setState('COMPLETED');
                setCredits(poll.credits ?? 0);
                try {
                  const balance = await api.get<{ credits: number }>('/credits/balance');
                  updateCredits(balance.credits);
                } catch { /* ignore */ }
                startCountdown();
              } else if (poll.state === 'FAILED') {
                if (pollRef.current) clearInterval(pollRef.current);
                setState('FAILED');
                setErrorMsg(poll.error || 'Payment failed');
                startCountdown();
              }
            } catch { /* keep polling */ }
          }, 4000);
        }
      } else {
        setState('ERROR');
        setErrorMsg(res.error || 'Something went wrong');
      }
    } catch {
      setState('ERROR');
      setErrorMsg('Failed to check payment status');
    }
  };

  const startCountdown = () => {
    setCountdown(5);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          navigate('/credits', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="text-5xl md:text-6xl font-black font-display text-white logo-text flex items-center justify-center gap-3">
          <span className="transform -rotate-2">DOODLE</span>
          <span className="text-secondary transform rotate-2">DASH</span>
        </h1>
      </div>

      {/* Status Card */}
      <div className="w-full max-w-md bg-surface-card rounded-3xl border-4 border-dark-outline shadow-chunky-lg p-8 relative text-center">
        {/* Badge */}
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-purple-500 text-white font-black px-6 py-1.5 rounded-full border-2 border-dark-outline text-sm uppercase tracking-wider shadow-chunky-sm whitespace-nowrap z-10">
          Payment Status
        </div>

        <div className="mt-4 space-y-6">
          {/* ── LOADING ── */}
          {state === 'LOADING' && (
            <>
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center border-4 border-purple-300 animate-pulse">
                  <Icon name="sync" className="text-4xl text-purple-500 animate-spin" />
                </div>
              </div>
              <h2 className="font-display font-black text-2xl text-slate-800">Checking Payment...</h2>
              <p className="text-gray-500 font-bold">Please wait a moment</p>
            </>
          )}

          {/* ── PENDING ── */}
          {state === 'PENDING' && (
            <>
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center border-4 border-yellow-400 animate-bounce">
                  <Icon name="hourglass_top" className="text-4xl text-yellow-600" />
                </div>
              </div>
              <h2 className="font-display font-black text-2xl text-slate-800">Processing Payment...</h2>
              <p className="text-gray-500 font-bold">
                Waiting for confirmation from payment gateway.
                <br />
                <span className="text-sm">This page refreshes automatically.</span>
              </p>
              <div className="flex items-center justify-center gap-2 text-yellow-600 font-bold">
                <Icon name="sync" className="text-lg animate-spin" />
                <span>Checking status...</span>
              </div>
            </>
          )}

          {/* ── COMPLETED ── */}
          {state === 'COMPLETED' && (
            <>
              <div className="flex justify-center">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center border-4 border-green-400 animate-bounce">
                  <Icon name="check_circle" filled className="text-5xl text-green-500" />
                </div>
              </div>
              <h2 className="font-display font-black text-2xl text-green-700">Payment Successful!</h2>
              <div className="bg-green-50 border-3 border-green-300 rounded-2xl p-4">
                <div className="font-display font-black text-4xl text-green-600">
                  +{credits}
                </div>
                <div className="text-green-600 font-bold text-sm mt-1">Credits Added</div>
              </div>
              <p className="text-sm text-gray-400 font-bold">
                Order: <span className="font-mono text-xs">{orderId}</span>
              </p>
              <div className="text-purple-500 font-bold animate-pulse">
                Redirecting in {countdown}s...
              </div>
              <GameBtn variant="green" size="md" fullWidth onClick={() => navigate('/credits', { replace: true })}>
                <Icon name="arrow_forward" className="text-lg" /> GO TO CREDITS
              </GameBtn>
            </>
          )}

          {/* ── FAILED ── */}
          {state === 'FAILED' && (
            <>
              <div className="flex justify-center">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center border-4 border-red-400">
                  <Icon name="cancel" filled className="text-5xl text-red-500" />
                </div>
              </div>
              <h2 className="font-display font-black text-2xl text-red-600">Payment Failed</h2>
              <p className="text-gray-500 font-bold">{errorMsg || 'Your payment could not be processed.'}</p>
              <p className="text-sm text-gray-400 font-bold">
                Order: <span className="font-mono text-xs">{orderId}</span>
              </p>
              <div className="text-purple-500 font-bold animate-pulse">
                Redirecting in {countdown}s...
              </div>
              <GameBtn variant="red" size="md" fullWidth onClick={() => navigate('/credits', { replace: true })}>
                <Icon name="arrow_back" className="text-lg" /> BACK TO CREDITS
              </GameBtn>
            </>
          )}

          {/* ── ERROR ── */}
          {state === 'ERROR' && (
            <>
              <div className="flex justify-center">
                <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center border-4 border-orange-400">
                  <Icon name="warning" filled className="text-5xl text-orange-500" />
                </div>
              </div>
              <h2 className="font-display font-black text-2xl text-orange-600">Oops!</h2>
              <p className="text-gray-500 font-bold">{errorMsg || 'Something went wrong.'}</p>
              <GameBtn variant="purple" size="md" fullWidth onClick={() => navigate('/credits', { replace: true })}>
                <Icon name="arrow_back" className="text-lg" /> BACK TO CREDITS
              </GameBtn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
