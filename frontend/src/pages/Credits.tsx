/* ── Credits Store Page (matches doodle_dash_credits_store) ── */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { Icon, GameBtn } from '../components/ui';
import type { Transaction } from '../lib/types';

const PACKS = [
  { credits: 100, price: 100, label: 'Starter Pack', icon: 'monetization_on', iconColor: 'text-blue-500', bgColor: 'bg-blue-100', dotColor: '#3B82F6' },
  { credits: 500, price: 500, label: 'Pro Stash', icon: 'savings', iconColor: 'text-purple-600', bgColor: 'bg-purple-100', dotColor: '#A855F7', featured: true },
  { credits: 1000, price: 1000, label: 'Baller Pack', icon: 'diamond', iconColor: 'text-yellow-500', bgColor: 'bg-yellow-100', dotColor: '#EAB308' },
];

export default function Credits() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const updateCredits = useAuthStore(s => s.updateCredits);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [buying, setBuying] = useState<number | null>(null);

  useEffect(() => {
    loadBalance();
    loadHistory();
  }, []);

  const loadBalance = async () => {
    try {
      const res = await api.get<{ credits: number }>('/credits/balance');
      updateCredits(res.credits);
    } catch { /* ignore */ }
  };

  const loadHistory = async () => {
    try {
      const res = await api.get<{ transactions: Transaction[] }>('/credits/history');
      setTransactions(res.transactions);
    } catch { /* ignore */ }
  };

  const buyPack = async (pack: number) => {
    setBuying(pack);
    try {
      const res = await api.post<{ redirectUrl: string }>('/credits/buy', { pack });
      window.location.href = res.redirectUrl;
    } catch {
      setBuying(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen flex flex-col font-body">
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between z-20 relative bg-surface-dark/50 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="bg-white border-2 border-black shadow-comic px-4 py-2 rounded-xl text-sm font-bold text-black hover:bg-gray-100 hover:shadow-comic-hover hover:-translate-y-0.5 transition-all flex items-center gap-2"
          >
            <Icon name="arrow_back" className="text-lg" /> Back
          </button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">✏️</span>
            <h1 className="text-2xl font-display font-black text-white uppercase tracking-wider drop-shadow-md">Doodle Dash</h1>
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8 max-w-6xl flex flex-col relative z-10">
        {/* Balance + Title */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-6">
          {/* Balance Bubble */}
          <div className="relative group cursor-pointer transform hover:-rotate-1 transition-transform duration-300 self-start md:ml-4">
            <div className="relative bg-accent border-[3px] border-black rounded-[2rem] rounded-bl-none px-6 py-3 flex items-center gap-3 shadow-comic">
              <div className="absolute -bottom-3 left-0 w-4 h-4 bg-accent border-b-[3px] border-r-[3px] border-black transform rotate-45 skew-x-12 translate-x-2" />
              <div className="absolute bottom-[2px] left-[6px] w-6 h-3 bg-accent z-10" />
              <div className="bg-white rounded-full p-1 border-2 border-black">
                <Icon name="local_mall" className="text-black" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-wider text-black leading-none">Balance</span>
                <span className="text-2xl font-display font-black text-black leading-none">{user?.credits ?? 0}</span>
              </div>
            </div>
          </div>

          <div className="text-center md:text-right flex-grow">
            <h2 className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-wider drop-shadow-[4px_4px_0px_#FF0099] transform -rotate-2">
              Get Credits
            </h2>
            <p className="text-secondary font-bold text-lg mt-2 drop-shadow-md">Stock up & keep playing!</p>
          </div>
        </div>

        {/* Pack Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full mb-16 px-2 md:px-0 items-end">
          {PACKS.map((pack) => (
            <div
              key={pack.credits}
              className={`comic-card bg-white rounded-3xl p-0 flex flex-col shadow-comic hover:shadow-comic-hover h-auto relative group
                ${pack.featured ? 'scale-105 z-10 !border-[4px] border-black shadow-[8px_8px_0px_0px_#FF0099] hover:shadow-[10px_10px_0px_0px_#FF0099] transform -rotate-1 hover:rotate-0 transition-transform duration-300' : 'hover:-rotate-1 hover:scale-[1.02] transition-transform'}
              `}
            >
              {pack.featured && (
                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 z-20 w-full text-center">
                  <span className="bg-accent border-2 border-black text-black text-sm font-black px-6 py-2 rounded-full uppercase tracking-widest shadow-comic rotate-2 inline-block">
                    Best Value!
                  </span>
                </div>
              )}

              {/* Icon Area */}
              <div className={`${pack.bgColor} ${pack.featured ? 'p-8 h-48 border-b-4' : 'p-6 h-40 border-b-2'} border-black flex items-center justify-center relative overflow-hidden rounded-t-3xl`}>
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `radial-gradient(${pack.dotColor} 2px, transparent 2px)`, backgroundSize: '10px 10px' }} />
                <div className="transform group-hover:scale-110 transition-transform duration-300">
                  <Icon name={pack.icon} filled className={`${pack.iconColor} drop-shadow-[3px_3px_0px_#000]`} size={pack.featured ? '96px' : '80px'} />
                </div>
              </div>

              {/* Body */}
              <div className={`${pack.featured ? 'p-8' : 'p-6'} flex flex-col items-center flex-grow text-center`}>
                <h3 className={`${pack.featured ? 'text-6xl' : 'text-4xl'} font-display font-black text-black mb-1`}>{pack.credits}</h3>
                <span className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4">{pack.label}</span>
                <GameBtn
                  variant={pack.featured ? 'pink' : 'cyan'}
                  size={pack.featured ? 'lg' : 'md'}
                  fullWidth
                  onClick={() => buyPack(pack.credits)}
                  disabled={buying === pack.credits}
                >
                  {buying === pack.credits ? 'Redirecting...' : `₹${pack.price}`}
                </GameBtn>

              </div>
            </div>
          ))}
        </div>

        {/* Transaction History */}
        <div className="w-full max-w-4xl self-center bg-white border-[3px] border-black rounded-2xl shadow-comic p-6 mb-8 transform rotate-1">
          <div className="flex items-center gap-3 mb-6 border-b-2 border-black pb-4">
            <Icon name="history" className="text-3xl text-game-pink" />
            <h3 className="text-2xl font-black text-black uppercase tracking-wider">Transaction History</h3>
          </div>

          {transactions.length === 0 ? (
            <p className="text-center text-gray-400 font-bold py-4">No transactions yet</p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {transactions.map(txn => (
                <div key={txn._id} className="flex items-center justify-between p-4 bg-gray-50 border-2 border-gray-200 rounded-xl hover:border-black hover:bg-yellow-50 transition-colors cursor-default">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg border-2 border-black ${txn.state === 'COMPLETED' ? 'bg-green-100' : txn.state === 'FAILED' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                      <Icon
                        name={txn.state === 'COMPLETED' ? 'add' : txn.state === 'FAILED' ? 'close' : 'hourglass_empty'}
                        className={txn.state === 'COMPLETED' ? 'text-green-600' : txn.state === 'FAILED' ? 'text-red-600' : 'text-yellow-600'}
                      />
                    </div>
                    <div>
                      <p className="font-bold text-black font-display text-lg">
                        {txn.state === 'COMPLETED' ? `Purchased ${txn.credits} Credits` : txn.state === 'FAILED' ? `Failed — ${txn.credits} Credits` : `Pending — ${txn.credits} Credits`}
                      </p>
                      <p className="text-xs text-gray-500 font-bold uppercase">{formatDate(txn.createdAt)}</p>
                    </div>
                  </div>
                  <span className="font-black text-black text-xl">
                    {txn.state === 'COMPLETED' ? '+' : ''}{txn.credits}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
