/* ── Hangman Figure — SVG gallows + body parts ── */

interface HangmanFigureProps {
  wrongGuesses: number;
  maxWrongGuesses: number;
}

export default function HangmanFigure({ wrongGuesses, maxWrongGuesses }: HangmanFigureProps) {
  // Parts appear in order: head, body, left arm, right arm, left leg, right leg
  const parts = [
    // Head
    <circle
      key="head"
      cx="200"
      cy="70"
      r="25"
      className="stroke-dark-outline fill-yellow-100 transition-all duration-300"
      strokeWidth="4"
    />,
    // Body
    <line
      key="body"
      x1="200"
      y1="95"
      x2="200"
      y2="170"
      className="stroke-dark-outline transition-all duration-300"
      strokeWidth="4"
      strokeLinecap="round"
    />,
    // Left arm
    <line
      key="left-arm"
      x1="200"
      y1="120"
      x2="160"
      y2="145"
      className="stroke-dark-outline transition-all duration-300"
      strokeWidth="4"
      strokeLinecap="round"
    />,
    // Right arm
    <line
      key="right-arm"
      x1="200"
      y1="120"
      x2="240"
      y2="145"
      className="stroke-dark-outline transition-all duration-300"
      strokeWidth="4"
      strokeLinecap="round"
    />,
    // Left leg
    <line
      key="left-leg"
      x1="200"
      y1="170"
      x2="165"
      y2="210"
      className="stroke-dark-outline transition-all duration-300"
      strokeWidth="4"
      strokeLinecap="round"
    />,
    // Right leg
    <line
      key="right-leg"
      x1="200"
      y1="170"
      x2="235"
      y2="210"
      className="stroke-dark-outline transition-all duration-300"
      strokeWidth="4"
      strokeLinecap="round"
    />,
  ];

  // Face expressions based on wrong guesses
  const face = wrongGuesses >= maxWrongGuesses ? (
    // Dead face
    <g key="face-dead">
      <line x1="189" y1="62" x2="197" y2="70" className="stroke-red-500" strokeWidth="3" strokeLinecap="round" />
      <line x1="197" y1="62" x2="189" y2="70" className="stroke-red-500" strokeWidth="3" strokeLinecap="round" />
      <line x1="203" y1="62" x2="211" y2="70" className="stroke-red-500" strokeWidth="3" strokeLinecap="round" />
      <line x1="211" y1="62" x2="203" y2="70" className="stroke-red-500" strokeWidth="3" strokeLinecap="round" />
      <path d="M188 82 Q200 76 212 82" className="stroke-red-500 fill-none" strokeWidth="2" strokeLinecap="round" />
    </g>
  ) : wrongGuesses >= 4 ? (
    // Worried face
    <g key="face-worried">
      <circle cx="192" cy="66" r="2" className="fill-dark-outline" />
      <circle cx="208" cy="66" r="2" className="fill-dark-outline" />
      <path d="M190 82 Q200 78 210 82" className="stroke-dark-outline fill-none" strokeWidth="2" strokeLinecap="round" />
    </g>
  ) : wrongGuesses >= 1 ? (
    // Neutral face
    <g key="face-neutral">
      <circle cx="192" cy="66" r="2" className="fill-dark-outline" />
      <circle cx="208" cy="66" r="2" className="fill-dark-outline" />
      <line x1="192" y1="80" x2="208" y2="80" className="stroke-dark-outline" strokeWidth="2" strokeLinecap="round" />
    </g>
  ) : null;

  return (
    <div className="flex items-center justify-center">
      <svg viewBox="0 0 300 240" className="w-full max-w-[280px] h-auto">
        {/* Gallows */}
        {/* Base */}
        <line x1="40" y1="230" x2="140" y2="230" className="stroke-dark-outline" strokeWidth="5" strokeLinecap="round" />
        {/* Vertical post */}
        <line x1="90" y1="230" x2="90" y2="20" className="stroke-dark-outline" strokeWidth="5" strokeLinecap="round" />
        {/* Top beam */}
        <line x1="90" y1="20" x2="200" y2="20" className="stroke-dark-outline" strokeWidth="5" strokeLinecap="round" />
        {/* Rope */}
        <line x1="200" y1="20" x2="200" y2="45" className="stroke-amber-600" strokeWidth="3" strokeLinecap="round" />
        {/* Brace */}
        <line x1="90" y1="50" x2="120" y2="20" className="stroke-dark-outline" strokeWidth="3" strokeLinecap="round" />

        {/* Body parts — only show up to wrongGuesses count */}
        {parts.slice(0, wrongGuesses)}

        {/* Face — only shown when head is visible */}
        {wrongGuesses >= 1 && face}
      </svg>
    </div>
  );
}
