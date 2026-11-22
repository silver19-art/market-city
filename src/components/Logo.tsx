/**
 * Market City mark: three towers that step up like a rising chart. The short one closed down
 * (coral crown), the middle one up (teal), and the tallest wears a gold spire, the searchlight
 * colour for stocks you own. A thin waterline sits underneath, like the island.
 */
export function LogoMark({ size = 40, title, tile = false }: { size?: number; title?: string; tile?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      {tile && <rect width="64" height="64" rx="14" fill="#0b1230" stroke="rgb(186 200 255 / 0.18)" />}
      <g transform={tile ? "translate(4 3) scale(0.875)" : undefined}>
      {/* Left tower, down month */}
      <rect x="7" y="34" width="13" height="22" rx="1.5" fill="#3a4677" />
      <rect x="7" y="31" width="13" height="3.5" rx="1" fill="#ff6b57" />
      {/* Middle tower with a setback, up month */}
      <rect x="24" y="24" width="15" height="32" rx="1.5" fill="#46538a" />
      <rect x="27" y="18" width="9" height="7" rx="1" fill="#46538a" />
      <rect x="27" y="15" width="9" height="3.5" rx="1" fill="#3cc6a8" />
      {/* Tallest tower with spire */}
      <rect x="43" y="14" width="14" height="42" rx="1.5" fill="#5562a0" />
      <path d="M50 1.5 L53.2 13 H46.8 Z" fill="#ffb547" />
      <rect x="45" y="11.5" width="10" height="3" rx="1" fill="#ffb547" />
      {/* Lit windows */}
      <g fill="#ffcf86">
        <rect x="10" y="39" width="2.5" height="3" rx="0.5" />
        <rect x="14.5" y="45" width="2.5" height="3" rx="0.5" opacity="0.7" />
        <rect x="28" y="29" width="2.5" height="3" rx="0.5" />
        <rect x="32.5" y="35" width="2.5" height="3" rx="0.5" opacity="0.7" />
        <rect x="28" y="43" width="2.5" height="3" rx="0.5" opacity="0.8" />
        <rect x="47" y="20" width="2.5" height="3" rx="0.5" />
        <rect x="51.5" y="27" width="2.5" height="3" rx="0.5" opacity="0.8" />
        <rect x="47" y="35" width="2.5" height="3" rx="0.5" opacity="0.7" />
        <rect x="51.5" y="43" width="2.5" height="3" rx="0.5" />
      </g>
      {/* Waterline */}
      <rect x="4" y="58" width="56" height="2.5" rx="1.25" fill="#ffb547" opacity="0.85" />
      </g>
    </svg>
  );
}

/** Mark plus the condensed wordmark. */
export function Logo({ size = 44 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-3">
      <LogoMark size={size} tile />
      <span className="sign leading-none font-extrabold tracking-tight text-text" style={{ fontSize: size * 0.62 }}>
        Market City
      </span>
    </span>
  );
}
