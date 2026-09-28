interface ProgressBarProps {
  /** 0–100, or null when there is nothing to measure. */
  value: number | null;
  /** Optional schedule marker (0–100). */
  expected?: number;
  variant?: 'execution' | 'results';
  label?: string;
}

export function ProgressBar({ value, expected, variant = 'execution', label }: ProgressBarProps) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className={`progress ${variant === 'results' ? 'results' : ''}`}>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value === null ? undefined : Math.round(pct)}
      >
        <div className="progress-fill" style={{ width: `${pct}%` }} />
        {expected !== undefined && (
          <div
            className="progress-expected"
            style={{ left: `calc(${Math.min(100, expected)}% - 1px)` }}
            title={`Expected by today: ${Math.round(expected)}%`}
          />
        )}
      </div>
      <span className="progress-value">{value === null ? '—' : `${Math.round(pct)}%`}</span>
    </div>
  );
}
