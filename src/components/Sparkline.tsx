/** A small price chart up to the current month only: no peeking at the future. */
export function Sparkline({ values, width = 280, height = 72 }: { values: (number | null)[]; width?: number; height?: number }) {
  const pts = values.map((v, i) => [i, v] as const).filter((p): p is readonly [number, number] => p[1] != null);
  if (pts.length < 2) return <div style={{ height }} className="grid place-items-center text-xs text-dim">Not enough history yet</div>;
  const ys = pts.map((p) => p[1]);
  const lo = Math.min(...ys);
  const hi = Math.max(...ys);
  const span = Math.max(1, values.length - 1);
  const x = (i: number) => (i / span) * width;
  const y = (v: number) => height - 4 - ((v - lo) / (hi - lo || 1)) * (height - 8);
  const d = pts.map((p, k) => `${k ? "L" : "M"}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(" ");
  const up = pts[pts.length - 1][1] >= pts[0][1];
  const color = up ? "var(--color-up)" : "var(--color-down)";
  const last = pts[pts.length - 1];
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ height }} role="img" aria-label={up ? "Price is up over this period" : "Price is down over this period"}>
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${x(last[0])},${height} L${x(pts[0][0])},${height} Z`} fill="url(#spark-fill)" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={x(last[0])} cy={y(last[1])} r="3.5" fill={color} />
    </svg>
  );
}
