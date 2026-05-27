interface AlchemistIconProps {
  className?: string;
  size?: number;
}

/**
 * Alchemist app icon — a stylized alembic / flask with a neon glow,
 * matching the neon-purple brand palette.
 */
export function AlchemistIcon({ className, size = 32 }: AlchemistIconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Alchemist"
    >
      {/* Flask body */}
      <path
        d="M10 26 L22 26 L26 10 L6 10 Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        className="text-violet-500"
        fill="rgba(139,92,246,0.08)"
      />
      {/* Flask neck */}
      <path
        d="M13 10 L13 5 L19 5 L19 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        className="text-violet-500"
        fill="none"
      />
      {/* Liquid */}
      <rect
        x="12"
        y="16"
        width="8"
        height="8"
        rx="1"
        className="text-violet-400"
        fill="currentColor"
        opacity="0.35"
      />
      {/* Bubbles */}
      <circle cx="14" cy="20" r="1" fill="currentColor" className="text-violet-300" opacity="0.6" />
      <circle cx="18" cy="18" r="0.7" fill="currentColor" className="text-violet-300" opacity="0.5" />
      <circle cx="16" cy="22" r="0.5" fill="currentColor" className="text-violet-300" opacity="0.4" />
      {/* Glow dot */}
      <circle
        cx="16"
        cy="26"
        r="3"
        fill="currentColor"
        className="text-violet-400"
        opacity="0.15"
      />
      <circle cx="16" cy="26" r="1.5" fill="currentColor" className="text-violet-400" opacity="0.4" />
    </svg>
  );
}

/**
 * Flattened favicon version — smaller, no glow.
 */
export function AlchemistFavicon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={32}
      height={32}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10 27 L22 27 L27 9 L5 9 Z"
        stroke="#8A4AFB"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="#1A1725"
      />
      <path
        d="M13 9 L13 4 L19 4 L19 9"
        stroke="#8A4AFB"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      <rect x="12" y="15" width="8" height="9" rx="1" fill="#8A4AFB" opacity="0.3" />
      <circle cx="16" cy="25" r="2" fill="#8A4AFB" opacity="0.5" />
      <circle cx="16" cy="25" r="1" fill="#8A4AFB" />
    </svg>
  );
}
