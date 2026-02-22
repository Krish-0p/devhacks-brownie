/* ── FnScoreboard.tsx — Between-round / game-end overlay for Fruit Ninja ── */

import { useGameStore } from '../../stores/gameStore';
import { socket } from '../../lib/socket';
import { Icon } from '../ui';

export default function FnScoreboard() {
  const fnResult   = useGameStore(s => s.fnRoundResult);
  const players    = useGameStore(s => s.players);

  if (!fnResult) return null;

  const me  = players.find(p => p.id === socket.socketId);
  const opp = players.find(p => p.id !== socket.socketId);

  const myId    = me?.id  ?? '';
  const oppId   = opp?.id ?? '';
  const myName  = me?.username  ?? 'You';
  const oppName = opp?.username ?? 'Opponent';
  const myLoc   = me?.location?.name;
  const oppLoc  = opp?.location?.name;

  const myScore  = fnResult.scores[myId]    ?? 0;
  const oppScore = fnResult.scores[oppId]   ?? 0;
  const myWins   = fnResult.roundWins[myId]  ?? 0;
  const oppWins  = fnResult.roundWins[oppId] ?? 0;

  const iWon  = fnResult.winner === myId;
  const theyWon = fnResult.winner === oppId;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto animate-in fade-in duration-300">
      <div className="bg-gray-900/95 rounded-3xl border-4 border-emerald-500/50 shadow-chunky-lg p-6 w-full max-w-md text-center mx-4">

        {/* Title */}
        <h2 className="font-display font-black text-3xl mb-1 text-white">
          {iWon ? '🎉 YOU WIN!' : theyWon ? '😢 ROUND LOST' : '🤝 DRAW'}
        </h2>
        <p className="text-white/50 font-bold text-sm mb-5">Round complete</p>

        {/* Score comparison */}
        <div className="flex items-center justify-around mb-4">
          {/* Me */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-emerald-400 font-display font-black text-xs tracking-wider">{myName}</span>
            {myLoc && <span className="text-emerald-300/40 text-[9px] font-bold block truncate">📍 {myLoc}</span>}
            <span className="text-white font-display font-black text-5xl">{myScore}</span>
            <span className="text-white/40 text-xs font-bold">points</span>
          </div>

          <span className="text-white/20 font-display font-black text-2xl">VS</span>

          {/* Opponent */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-white/60 font-display font-black text-xs tracking-wider">{oppName}</span>
            {oppLoc && <span className="text-white/30 text-[9px] font-bold block truncate">📍 {oppLoc}</span>}
            <span className="text-white/80 font-display font-black text-5xl">{oppScore}</span>
            <span className="text-white/40 text-xs font-bold">points</span>
          </div>
        </div>

        {/* Round wins */}
        <div className="bg-black/30 rounded-xl px-4 py-3 border border-white/10">
          <p className="text-white/50 font-bold text-xs mb-2 uppercase tracking-wider">Series wins</p>
          <div className="flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-display font-black text-sm">{myName}</span>
              <div className="flex gap-1">
                {[0, 1].map(i => (
                  <Icon
                    key={i}
                    name="emoji_events"
                    filled
                    className={`text-xl ${i < myWins ? 'text-yellow-400' : 'text-gray-700'}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[0, 1].map(i => (
                  <Icon
                    key={i}
                    name="emoji_events"
                    filled
                    className={`text-xl ${i < oppWins ? 'text-yellow-400' : 'text-gray-700'}`}
                  />
                ))}
              </div>
              <span className="text-white/60 font-display font-black text-sm">{oppName}</span>
            </div>
          </div>
        </div>

        <p className="text-white/30 font-bold text-xs mt-4 animate-pulse">Next round starting soon…</p>
      </div>
    </div>
  );
}
