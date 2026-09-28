import { useState } from 'react';

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface DonutProps {
  slices: DonutSlice[];
  centerValue: string;
  centerLabel: string;
  size?: number;
}

/** Hand-drawn SVG donut with 2px gaps between segments and a legend with counts. */
export function Donut({ slices, centerValue, centerLabel, size = 168 }: DonutProps) {
  const [active, setActive] = useState<string | null>(null);
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = slices.reduce((s, x) => s + x.value, 0);
  const visible = slices.filter((s) => s.value > 0);
  const gap = visible.length > 1 ? 3 : 0;

  let offset = 0;
  const arcs = visible.map((s) => {
    const len = (s.value / total) * c;
    const arc = { ...s, dash: Math.max(0, len - gap), offset };
    offset += len;
    return arc;
  });

  const activeSlice = slices.find((s) => s.key === active);

  return (
    <div className="row" style={{ gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${centerLabel}: ${centerValue}`}
      >
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="#eef2f7"
            strokeWidth={stroke}
          />
          {arcs.map((a) => (
            <circle
              key={a.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={a.color}
              strokeWidth={active === a.key ? stroke + 4 : stroke}
              strokeDasharray={`${a.dash} ${c - a.dash}`}
              strokeDashoffset={-a.offset}
              onMouseEnter={() => setActive(a.key)}
              onMouseLeave={() => setActive(null)}
              style={{ transition: 'stroke-width 0.15s' }}
            >
              <title>{`${a.label}: ${a.value}`}</title>
            </circle>
          ))}
        </g>
        <text x="50%" y="48%" textAnchor="middle" fontSize={28} fontWeight={700} fill="var(--ink)">
          {activeSlice ? activeSlice.value : centerValue}
        </text>
        <text x="50%" y="62%" textAnchor="middle" fontSize={11.5} fill="var(--ink-3)">
          {activeSlice ? activeSlice.label : centerLabel}
        </text>
      </svg>

      <ul
        className="legend"
        style={{ flexDirection: 'column', margin: 0, padding: 0, listStyle: 'none', minWidth: 150 }}
      >
        {slices.map((s) => (
          <li
            key={s.key}
            className="legend-item"
            onMouseEnter={() => setActive(s.key)}
            onMouseLeave={() => setActive(null)}
            style={{
              justifyContent: 'space-between',
              gap: 16,
              fontWeight: active === s.key ? 650 : 400,
            }}
          >
            <span className="legend-item">
              <span className="swatch" style={{ background: s.color }} />
              {s.label}
            </span>
            <b style={{ color: 'var(--ink)' }}>{s.value}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
