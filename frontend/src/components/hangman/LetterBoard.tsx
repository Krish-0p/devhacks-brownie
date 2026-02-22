/* ── Letter Board — A-Z clickable grid for Hangman ── */

import { socket } from '../../lib/socket';

interface LetterBoardProps {
  guessedLetters: string[];
  revealedWord: string[];
  disabled: boolean; // word setter or game not in drawing phase
}

export default function LetterBoard({ guessedLetters, revealedWord, disabled }: LetterBoardProps) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Determine which letters are correct (appear in the revealed word)
  const correctLetters = new Set(
    revealedWord.filter(c => c !== '_' && c !== ' ').map(c => c.toLowerCase())
  );

  const handleClick = (letter: string) => {
    if (disabled) return;
    const l = letter.toLowerCase();
    if (guessedLetters.includes(l)) return;
    socket.send('guess_letter', { letter: l });
  };

  return (
    <div className="grid grid-cols-9 gap-1.5 sm:gap-2 w-full max-w-md mx-auto">
      {alphabet.map((letter) => {
        const l = letter.toLowerCase();
        const isGuessed = guessedLetters.includes(l);
        const isCorrect = isGuessed && correctLetters.has(l);
        const isWrong = isGuessed && !correctLetters.has(l);

        let btnClass = 'bg-white border-dark-outline text-dark-outline hover:bg-purple-100 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none cursor-pointer';

        if (isCorrect) {
          btnClass = 'bg-green-400 border-green-600 text-white cursor-default scale-95';
        } else if (isWrong) {
          btnClass = 'bg-red-400 border-red-600 text-white cursor-default scale-95 opacity-60';
        } else if (disabled) {
          btnClass = 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed';
        }

        return (
          <button
            key={letter}
            onClick={() => handleClick(letter)}
            disabled={isGuessed || disabled}
            className={`font-display font-black text-sm sm:text-base rounded-xl border-2 shadow-[2px_2px_0_0_rgba(0,0,0,0.2)] py-2 transition-all duration-150 ${btnClass}`}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}
