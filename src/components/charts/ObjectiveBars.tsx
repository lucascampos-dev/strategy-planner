import { useState } from 'react';
import { useElementWidth } from './useElementWidth';

export interface ObjectiveBarDatum {
  id: string;
  code: string;
  title: string;
  /** Initiative roll-up, 0–100 or null. */
  execution: number | null;
  /** Indicator roll-up, 0–100 or null. */
  results: number | null;
}

const ROW_H = 66;
const BAR_H = 10;
const TOP = 26;
const VALUE_W = 58;

/**
 * Paired horizontal bars per objective: execution (initiative progress) vs
 * results (indicator achievement). One shared 0–100% axis, no dual scales.
 */
export function ObjectiveBars({ data }: { data: ObjectiveBarDatum[] }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const plotW = Math.max(120, width - VALUE_W);
  const x = (v: number) => (Math.max(0, Math.min(100, v)) / 100) * plotW;
  const height = TOP + data.length * ROW_H;
  const hovered = hover === null ? undefined : data[hover];

  const bar = (value: number | null, y: number, color: string) => (
    <g>
      <rect x={0} y={y} width={plotW} height={BAR_H} rx={4} fill="#eef2f7" />
      {value !== null && value > 0 && (
        <rect x={0} y={y} width={Math.max(4, x(value))} height={BAR_H} rx={4} fill={color} />
      )}
      <text
        x={width}
        y={y + BAR_H - 1}
        fontSize={11.5}
        fontWeight={650}
        textAnchor="end"
        fill={value === null ? 'var(--ink-3)' : 'var(--ink)'}
      >
        {value === null ? 'n/a' : `${Math.round(value)}%`}
      </text>
    </g>
  );

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label="Execution progress and results achievement by objective"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Axis grid */}
        {[0, 25, 50, 75, 100].map((t) => (
          <g key={t}>
            <line
              x1={x(t)}
              x2={x(t)}
              y1={TOP - 6}
              y2={height - 8}
              stroke="var(--border)"
              strokeDasharray={t === 0 ? undefined : '3 4'}
            />
            <text
              x={x(t)}
              y={12}
              fontSize={11}
              fill="var(--ink-3)"
              textAnchor={t === 0 ? 'start' : t === 100 ? 'end' : 'middle'}
            >
              {t}%
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const y0 = TOP + i * ROW_H;
          return (
            <g
              key={d.id}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              opacity={hover === null || hover === i ? 1 : 0.55}
              style={{ transition: 'opacity 0.15s' }}
            >
              {/* Hit target larger than the marks */}
              <rect x={-4} y={y0} width={width + 8} height={ROW_H - 4} fill="transparent" />
              <text x={0} y={y0 + 14} fontSize={12.5} fill="var(--ink)">
                <tspan fontWeight={700} fill="var(--ink-3)">
                  {d.code}
                </tspan>
                <tspan dx={8} fontWeight={600}>
                  {truncate(d.title, Math.floor(plotW / 7.2) - 8)}
                </tspan>
              </text>
              {bar(d.execution, y0 + 24, 'var(--series-1)')}
              {bar(d.results, y0 + 24 + BAR_H + 4, 'var(--series-2)')}
            </g>
          );
        })}
      </svg>

      {hovered && hover !== null && (
        <div
          className="chart-tooltip"
          style={{
            left: Math.min(Math.max(90, width / 2), width - 90),
            top: TOP + hover * ROW_H + 4,
          }}
        >
          <div className="tt-title">
            {hovered.code} · {truncate(hovered.title, 38)}
          </div>
          <div className="tt-row">
            <span className="swatch" style={{ background: 'var(--series-1)' }} />
            Execution <b>{fmt(hovered.execution)}</b>
          </div>
          <div className="tt-row">
            <span className="swatch" style={{ background: 'var(--series-2)' }} />
            Results <b>{fmt(hovered.results)}</b>
          </div>
        </div>
      )}
    </div>
  );
}

const fmt = (v: number | null) => (v === null ? 'no data' : `${Math.round(v)}%`);

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, Math.max(8, max - 1))}…` : text;
}
