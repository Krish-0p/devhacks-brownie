/* ── Comic Card (white, black bordered, chunky shadow) ── */

import type { ReactNode } from 'react';

interface ComicCardProps {
  children: ReactNode;
  className?: string;
  borderColor?: string;
  rotate?: boolean;
  onClick?: () => void;
}

export function ComicCard({ children, className = '', borderColor, rotate, onClick }: ComicCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-surface-card rounded-3xl border-4 ${borderColor || 'border-dark-outline'} shadow-chunky-lg
        relative overflow-visible
        ${rotate ? 'hover:-rotate-1 hover:scale-[1.02] transition-transform' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
