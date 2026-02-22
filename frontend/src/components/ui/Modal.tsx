/* ── Modal (overlay + comic card content) ── */

import { useEffect, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, children, className = '' }: ModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open || !onClose) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-[fadeIn_0.2s_ease]"
        onClick={onClose}
      />
      {/* Content */}
      <div className={`
        relative bg-surface-card rounded-3xl border-4 border-dark-outline
        shadow-chunky-lg p-6 md:p-8 max-w-lg w-full
        animate-[modalIn_0.3s_ease] z-10
        ${className}
      `}>
        {children}
      </div>
    </div>
  );
}
