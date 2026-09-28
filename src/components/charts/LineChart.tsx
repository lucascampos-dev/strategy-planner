import { useState, type MouseEvent } from 'react';
import { formatPeriod, formatValue } from '../../domain/format';
import type { Measurement } from '../../domain/types';
import { useElementWidth } from './useElementWidth';

interface LineChartProps {
  series: Measurement[];
  baseline: number;
  target: number;
  unit: string;
  height?: number;
}

const PAD = { top: 16, right: 16, bottom: 26, left: 44 };

/** Indicator history with baseline and target reference lines and a hover crosshair. */
export function LineChart({ series, baseline, target, unit, height = 220 }: LineChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>(360);
  const [hover, setHover] = useState<number | null>(null);

  if (series.length === 0) {
    return <div className="empty">No measurements yet.</div>;
  }

  const values = series.map((m) => m.value);
  const lo = Math.min(...values, baseline, target);
  const hi = Math.max(...values, baseline, target);
  const margin = (hi - lo || 1) * 0.12;
  const min = lo - margin;
  const max = hi + margin;

  const innerW = Math.max(60, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const x = (i: number) =>
    PAD.left + (series.length === 1 ? innerW / 2 : (i / (series.length - 1)) * innerW);
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * innerH;

  const ticks = niceTicks(min, max, 4);
  const path = series.map((m, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(m.value)}`).join(' ');
  const labelEvery = Math.ceil(series.length / Math.max(1, Math.floor(innerW / 64)));
  const hovered = hover === null ? undefined : series[hover];

  const onMove = (e: MouseEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - box.left;
    const ratio = series.length === 1 ? 0 : px / box.width;
    setHover(Math.max(0, Math.min(series.length - 1, Math.round(ratio * (series.length - 1)))));
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label="Indicator history"
        style={{ display: 'block' }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={PAD.left + innerW} y1={y(t)} y2={y(t)} stroke="var(--border)" />
            <text x={PAD.left - 8} y={y(t) + 4} fontSize={11} textAnchor="end" fill="var(--ink-3)">
              {Number(t.toFixed(2))}
            </text>
          </g>
        ))}

        <line
          x1={PAD.left}
          x2={PAD.left + innerW}
          y1={y(target)}
          y2={y(target)}
          stroke="var(--good)"
          strokeWidth={1.5}
          strokeDasharray="6 4"
        />
        <text
          x={PAD.left + innerW}
          y={y(target) - 6}
          fontSize={11}
          fontWeight={650}
          textAnchor="end"
          fill="var(--good-ink)"
        >
          Target {formatValue(target, unit)}
        </text>
        <line
          x1={PAD.left}
          x2={PAD.left + innerW}
          y1={y(baseline)}
          y2={y(baseline)}
          stroke="var(--ink-3)"
          strokeWidth={1}
          strokeDasharray="2 4"
        />
        <text x={PAD.left + 4} y={y(baseline) - 6} fontSize={11} fill="var(--ink-3)">
          Baseline {formatValue(baseline, unit)}
        </text>

        <path
          d={path}
          fill="none"
          stroke="var(--series-2)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {series.map((m, i) => (
          <circle
            key={m.id}
            cx={x(i)}
            cy={y(m.value)}
            r={hover === i ? 5.5 : 4}
            fill="var(--series-2)"
            stroke="#fff"
            strokeWidth={2}
          />
        ))}

        {series.map((m, i) =>
          (series.length - 1 - i) % labelEvery === 0 ? (
            <text
              key={m.id}
              x={x(i)}
              y={height - 8}
              fontSize={11}
              textAnchor={
                series.length > 1 && i === 0
                  ? 'start'
                  : series.length > 1 && i === series.length - 1
                    ? 'end'
                    : 'middle'
              }
              fill="var(--ink-3)"
            >
              {formatPeriod(m.period).replace(' 20', " '")}
            </text>
          ) : null,
        )}

        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={PAD.top}
            y2={PAD.top + innerH}
            stroke="var(--ink-3)"
            strokeDasharray="3 3"
          />
        )}

        <rect
          x={PAD.left}
          y={PAD.top}
          width={innerW}
          height={innerH}
          fill="transparent"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        />
      </svg>

      {hovered && hover !== null && (
        <div
          className="chart-tooltip"
          style={{ left: Math.min(Math.max(x(hover), 80), width - 80), top: y(hovered.value) }}
        >
          <div className="tt-title">{formatPeriod(hovered.period)}</div>
          <div className="tt-row">
            Value <b>{formatValue(hovered.value, unit)}</b>
          </div>
          {hovered.note && <div className="tt-row">{hovered.note}</div>}
        </div>
      )}
    </div>
  );
}

function niceTicks(min: number, max: number, count: number): number[] {
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let t = Math.ceil(min / step) * step; t <= max + 1e-9; t += step) {
    ticks.push(Math.round(t * 1e6) / 1e6);
  }
  return ticks;
}
