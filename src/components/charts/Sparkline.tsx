interface SparklineProps {
  values: number[];
  target?: number;
  width?: number;
  height?: number;
  label?: string;
}

/** Minimal trend line with an end dot and an optional dashed target reference. */
export function Sparkline({ values, target, width = 104, height = 30, label }: SparklineProps) {
  if (values.length < 2) {
    return <span className="muted">—</span>;
  }
  const pad = 4;
  const domain = target === undefined ? values : [...values, target];
  const min = Math.min(...domain);
  const max = Math.max(...domain);
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (values.length - 1)) * (width - pad * 2);
  const y = (v: number) => height - pad - ((v - min) / span) * (height - pad * 2);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = values[values.length - 1]!;

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={label ?? 'Trend'}
      style={{ display: 'block' }}
    >
      {target !== undefined && (
        <line
          x1={pad}
          x2={width - pad}
          y1={y(target)}
          y2={y(target)}
          stroke="var(--ink-3)"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      )}
      <polyline
        points={points}
        fill="none"
        stroke="var(--series-2)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={x(values.length - 1)}
        cy={y(last)}
        r={3.5}
        fill="var(--series-2)"
        stroke="#fff"
        strokeWidth={2}
      />
    </svg>
  );
}
