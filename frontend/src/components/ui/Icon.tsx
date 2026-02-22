/* ── Material Symbol Icon ── */

interface IconProps {
  name: string;
  filled?: boolean;
  className?: string;
  size?: string;
}

export function Icon({ name, filled, className = '', size }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${filled ? 'icon-filled' : ''} ${className}`}
      style={size ? { fontSize: size } : undefined}
    >
      {name}
    </span>
  );
}
