/* ── FnHud.tsx — Heads-Up Display overlay for Fruit Ninja ── */

import { useGameStore } from '../../stores/gameStore';
import { socket } from '../../lib/socket';
import { Icon } from '../ui';

export default function FnHud() {
  const timeLeft   = useGameStore(s => s.timeLeft);
  const round      = useGameStore(s => s.currentRound);
  const maxRounds  = useGameStore(s => s.maxRounds);
  const players    = useGameStore(s => s.players);
  const fnScores   = useGameStore(s => s.fnScores);
  const fnLives    = useGameStore(s => s.fnLives);
  const fnSlowmo   = useGameStore(s => s.fnSlowmo);

  const me  = players.find(p => p.id === socket.socketId);
  const opp = players.find(p => p.id !== socket.socketId);

  const myId    = me?.id  ?? '';
  const oppId   = opp?.id ?? '';
  const myName  = me?.username  ?? 'You';
  const oppName = opp?.username ?? 'Opponent';
  const myLoc   = me?.location?.name;
  const oppLoc  = opp?.location?.name;

  const myScore  = fnScores[myId]  ?? 0;
  const oppScore = fnScores[oppId] ?? 0;
  const myLives  = fnLives[myId]   ?? 3;
  const oppLives = fnLives[oppId]  ?? 3;
  const isSlow   = fnSlowmo[myId]  ?? false;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10">

      {/* ── Top bar: timer + round ── */}
      <div className="flex items-center justify-center gap-4 pt-3">
        {/* Round badge */}
        <div className="bg-black/40 backdrop-blur-sm text-white font-display font-black text-xs px-3 py-1 rounded-full border border-emerald-500/30">
          ROUND {round}/{maxRounds}
        </div>

        {/* Timer */}
        <div className={`bg-black/50 backdrop-blur-sm font-display font-black text-2xl px-5 py-1.5 rounded-xl border-2 ${
          timeLeft <= 10 ? 'border-red-500 text-red-400 animate-pulse' : 'border-emerald-500/40 text-white'
        }`}>
          <Icon name="timer" className="text-base align-middle mr-1" />
          {timeLeft}s
        </div>
      </div>

      {/* ── Score panels: left = me, right = opponent ── */}
      <div className="absolute top-16 left-3 right-3 flex justify-between items-start">

        {/* My panel */}
        <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-emerald-500/30 px-4 py-2 min-w-[130px]">
          <p className="text-emerald-400 font-display font-black text-xs tracking-wider mb-0.5 truncate max-w-[110px]">
            {myName} (YOU)
          </p>
          {myLoc && <p className="text-emerald-300/50 text-[9px] font-bold truncate max-w-[110px] mb-0.5">📍 {myLoc}</p>}
          <p className="text-white font-display font-black text-3xl leading-none">{myScore}</p>
          {/* Lives */}
          <div className="flex gap-0.5 mt-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <Icon
                key={i}
                name="favorite"
                filled
                className={`text-lg ${i < myLives ? 'text-red-500' : 'text-gray-700'}`}
              />
            ))}
          </div>
        </div>

        {/* Opponent panel */}
        <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-white/10 px-4 py-2 min-w-[130px] text-right">
          <p className="text-white/60 font-display font-black text-xs tracking-wider mb-0.5 truncate max-w-[110px] ml-auto">
            {oppName}
          </p>
          {oppLoc && <p className="text-white/30 text-[9px] font-bold truncate max-w-[110px] ml-auto mb-0.5">📍 {oppLoc}</p>}
          <p className="text-white/80 font-display font-black text-3xl leading-none">{oppScore}</p>
          <div className="flex gap-0.5 mt-1 justify-end">
            {Array.from({ length: 3 }).map((_, i) => (
              <Icon
                key={i}
                name="favorite"
                filled
                className={`text-lg ${i < oppLives ? 'text-red-500/60' : 'text-gray-700'}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Slow-mo indicator ── */}
      {isSlow && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-emerald-500/30 backdrop-blur-sm text-emerald-300 font-display font-black text-sm px-5 py-1.5 rounded-full border border-emerald-400/40 animate-pulse">
          <Icon name="slow_motion_video" className="text-base align-middle mr-1" />
          SLOW-MO ACTIVE
        </div>
      )}
    </div>
  );
}
