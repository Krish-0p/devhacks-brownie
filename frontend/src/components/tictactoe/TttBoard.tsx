/* ── Tic-Tac-Toe Board — 3x3 interactive grid ── */

import { socket } from '../../lib/socket';

interface TttBoardProps {
  board: string[];          // 9 cells: '' | 'X' | 'O'
  currentMark: 'X' | 'O';
  isMyTurn: boolean;
  myMark: 'X' | 'O' | null;
  winLine: number[] | null;
  disabled: boolean;
}

export default function TttBoard({ board, currentMark: _currentMark, isMyTurn, myMark, winLine, disabled }: TttBoardProps) {
  void _currentMark; // reserved for future hover-preview
  const handleClick = (cell: number) => {
    if (disabled || !isMyTurn || board[cell] !== '') return;
    socket.send('ttt_move', { cell });
  };

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-xs mx-auto aspect-square">
      {board.map((mark, i) => {
        const isWinCell = winLine?.includes(i);
        const isEmpty = mark === '';
        const canClick = isMyTurn && isEmpty && !disabled;

        return (
          <button
            key={i}
            onClick={() => handleClick(i)}
            disabled={!canClick}
            className={`
              relative flex items-center justify-center
              rounded-2xl border-4 font-display font-black
              text-4xl sm:text-5xl md:text-6xl
              transition-all duration-200
              ${isWinCell
                ? 'bg-green-100 border-green-400 scale-105 shadow-[4px_4px_0_0_rgba(34,197,94,0.5)]'
                : isEmpty
                  ? canClick
                    ? 'bg-white border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 hover:scale-105 hover:shadow-[4px_4px_0_0_rgba(79,70,229,0.3)] cursor-pointer'
                    : 'bg-gray-50 border-gray-200 cursor-default'
                  : 'bg-white border-gray-300 shadow-[3px_3px_0_0_rgba(0,0,0,0.1)]'
              }
            `}
          >
            {mark === 'X' && (
              <span className={`${isWinCell ? 'text-green-600' : 'text-red-500'} drop-shadow-sm select-none`}>
                ✕
              </span>
            )}
            {mark === 'O' && (
              <span className={`${isWinCell ? 'text-green-600' : 'text-blue-500'} drop-shadow-sm select-none`}>
                ○
              </span>
            )}
            {isEmpty && canClick && (
              <span className="text-gray-200 opacity-0 hover:opacity-40 transition-opacity select-none">
                {myMark === 'X' ? '✕' : '○'}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
