/* ── Game Button (chunky press-down style) ── */

import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface GameBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'green' | 'orange' | 'purple' | 'pink' | 'red' | 'blue' | 'cyan' | 'yellow';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
}

const variantClasses: Record<string, string> = {
  green: 'bg-neon-green hover:bg-[#a3e635] text-dark-outline',
  orange: 'bg-electric-orange hover:bg-[#fb923c] text-white',
  purple: 'bg-primary hover:bg-purple-600 text-white',
  pink: 'bg-game-pink hover:bg-pink-400 text-white',
  red: 'bg-red-500 hover:bg-red-400 text-white',
  blue: 'bg-blue-500 hover:bg-blue-400 text-white',
  cyan: 'bg-secondary hover:bg-cyan-300 text-dark-outline',
  yellow: 'bg-accent hover:bg-yellow-300 text-dark-outline',
};

const sizeClasses: Record<string, string> = {
  sm: 'text-sm py-2 px-4 rounded-xl',
  md: 'text-xl py-3 px-6 rounded-2xl',
  lg: 'text-2xl py-3 px-6 rounded-2xl',
  xl: 'text-3xl py-4 px-6 rounded-2xl',
};

export function GameBtn({
  children,
  variant = 'green',
  size = 'md',
  fullWidth,
  className = '',
  ...rest
}: GameBtnProps) {
  return (
    <button
      className={`
        font-display font-black border-4 border-dark-outline shadow-chunky
        hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#18181b]
        active:translate-y-1 active:shadow-none
        transition-all flex items-center justify-center gap-3
        ${variantClasses[variant] ?? variantClasses.green}
        ${sizeClasses[size] ?? sizeClasses.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...rest}
    >
      {children}
    </button>
  );
}
