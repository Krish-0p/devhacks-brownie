/* ── Word Reveal — displays the hangman word with hidden/revealed letters ── */

interface WordRevealProps {
  revealedWord: string[];   // e.g. ['_','a','_','_','l','e']  or full word
  currentWord?: string;     // the actual word (shown to word setter)
  isWordSetter: boolean;
}

export default function WordReveal({ revealedWord, currentWord, isWordSetter }: WordRevealProps) {
  // If we're the word setter, display the full word
  const letters = isWordSetter && currentWord
    ? currentWord.split('')
    : revealedWord;

  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3 w-full max-w-lg mx-auto py-3">
      {letters.map((char, i) => {
        if (char === ' ') {
          return <div key={i} className="w-4 sm:w-6" />;
        }

        const isRevealed = char !== '_';
        const isSetterView = isWordSetter && currentWord;

        return (
          <div
            key={i}
            className={`
              flex items-center justify-center
              w-9 h-11 sm:w-12 sm:h-14
              rounded-xl border-3 font-display font-black text-xl sm:text-2xl
              transition-all duration-300
              ${isRevealed
                ? isSetterView
                  ? 'bg-blue-100 border-blue-400 text-blue-700'
                  : 'bg-green-100 border-green-400 text-green-700 scale-105'
                : 'bg-white border-dark-outline text-dark-outline'
              }
              shadow-[2px_3px_0_0_rgba(0,0,0,0.2)]
            `}
          >
            {isRevealed ? char.toUpperCase() : '_'}
          </div>
        );
      })}
    </div>
  );
}
