/* ── Tic-Tac-Toe Scoreboard — round counter & series score ── */

interface TttScoreboardProps {
  round: number;
  totalRounds: number;
  playerXName: string;
  playerOName: string;
  playerXLocation?: string;
  playerOLocation?: string;
  roundWins: { X: number; O: number };
  currentMark: 'X' | 'O';
  myMark: 'X' | 'O' | null;
}

export default function TttScoreboard({
  round,
  totalRounds,
  playerXName,
  playerOName,
  playerXLocation,
  playerOLocation,
  roundWins,
  currentMark,
  myMark,
}: TttScoreboardProps) {
  return (
    <div className="flex items-center justify-between gap-3 w-full max-w-md mx-auto px-3 py-2 bg-white/80 backdrop-blur rounded-2xl border-2 border-gray-200 shadow-[3px_3px_0_0_rgba(0,0,0,0.06)]">
      {/* Player X side */}
      <div className={`flex items-center gap-2 min-w-0 flex-1 ${currentMark === 'X' ? 'opacity-100' : 'opacity-50'}`}>
        <span className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 text-red-500 font-black text-lg border-2 border-red-300">
          ✕
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold text-gray-800 truncate">
            {playerXName || '???'}
            {myMark === 'X' && <span className="ml-1 text-indigo-500">(you)</span>}
          </p>
          {playerXLocation && <p className="text-[9px] text-gray-400 font-bold truncate">📍 {playerXLocation}</p>}
          <p className="text-lg font-black text-red-500 leading-none">{roundWins.X}</p>
        </div>
      </div>

      {/* Center — round badge */}
      <div className="shrink-0 text-center px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-200">
        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Round</p>
        <p className="text-sm font-black text-indigo-600 leading-none">{round}/{totalRounds}</p>
      </div>

      {/* Player O side */}
      <div className={`flex items-center gap-2 min-w-0 flex-1 justify-end text-right ${currentMark === 'O' ? 'opacity-100' : 'opacity-50'}`}>
        <div className="min-w-0">
          <p className="text-xs font-bold text-gray-800 truncate">
            {myMark === 'O' && <span className="mr-1 text-indigo-500">(you)</span>}
            {playerOName || '???'}
          </p>
          {playerOLocation && <p className="text-[9px] text-gray-400 font-bold truncate">📍 {playerOLocation}</p>}
          <p className="text-lg font-black text-blue-500 leading-none">{roundWins.O}</p>
        </div>
        <span className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-blue-100 text-blue-500 font-black text-lg border-2 border-blue-300">
          ○
        </span>
      </div>
    </div>
  );
}
