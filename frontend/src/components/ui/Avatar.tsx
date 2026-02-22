/* ── Avatar (circular with border, hover overlay, fallback initial) ── */

interface AvatarProps {
  src?: string;
  username?: string;
  size?: number;
  borderColor?: string;
  className?: string;
  editable?: boolean;
  onClick?: () => void;
}

export function Avatar({
  src,
  username = '?',
  size = 48,
  borderColor = 'border-primary',
  className = '',
  editable = false,
  onClick,
}: AvatarProps) {
  const initial = username.charAt(0).toUpperCase();

  return (
    <div
      onClick={onClick}
      className={`
        relative rounded-full border-4 ${borderColor} overflow-hidden
        flex items-center justify-center bg-purple-100 group
        ${editable ? 'cursor-pointer' : ''}
        ${className}
      `}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img
          src={src}
          alt={username}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
      ) : (
        <span
          className="font-display font-black text-primary"
          style={{ fontSize: size * 0.4 }}
        >
          {initial}
        </span>
      )}
      {editable && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
          <span className="material-symbols-outlined text-white text-2xl">edit</span>
        </div>
      )}
    </div>
  );
}
