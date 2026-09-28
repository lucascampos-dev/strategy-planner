import { useState, type ReactNode } from 'react';
import { HEALTH_COLOR } from '../components/tones';
import { Icon } from '../components/Icon';
import { EmptyState, PageHeader } from '../components/PageHeader';
import { addDays, daysBetween, monthEnd, monthStart, monthsInRange } from '../domain/dates';
import { formatCompactCurrency, formatDate, formatMonth, HEALTH_LABEL } from '../domain/format';
import type { Health } from '../domain/types';
import { useDerived, usePlan, type InitiativeRow } from '../state/usePlan';

const LEGEND: Health[] = ['on_track', 'at_risk', 'late', 'done', 'not_started', 'cancelled'];

export function TimelinePage() {
  const { plan, today } = usePlan();
  const { initiatives } = useDerived();
  const [objective, setObjective] = useState('all');
  const [showCancelled, setShowCancelled] = useState(false);

  const visible = initiatives.filter(
    (i) =>
      (objective === 'all' || i.objectiveId === objective) &&
      (showCancelled || i.status !== 'cancelled'),
  );

  // Time window: whole months covering every visible initiative and today.
  const range = (() => {
    if (visible.length === 0) return null;
    const starts = visible.map((i) => i.startDate).concat(today);
    const ends = visible.map((i) => i.endDate).concat(today);
    const start = monthStart(starts.sort()[0]!);
    const end = monthEnd(ends.sort()[ends.length - 1]!);
    return { start, end, days: daysBetween(start, end) + 1 };
  })();

  const groups = plan.objectives
    .map((o) => ({ objective: o, rows: visible.filter((i) => i.objectiveId === o.id) }))
    .filter((g) => g.rows.length > 0);

  const pct = (iso: string) => (range ? (daysBetween(range.start, iso) / range.days) * 100 : 0);

  return (
    <>
      <PageHeader
        eyebrow="Roadmap"
        title="Timeline"
        subtitle="Gantt view of initiatives grouped by objective. Bar fill shows reported progress; color shows health."
        actions={
          <>
            <label>
              <span className="sr-only">Filter by objective</span>
              <select
                className="select"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
              >
                <option value="all">All objectives</option>
                {plan.objectives.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.code} — {o.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn"
              aria-pressed={showCancelled}
              onClick={() => setShowCancelled((v) => !v)}
            >
              {showCancelled ? <Icon name="check" size={16} /> : null}
              Show cancelled
            </button>
          </>
        }
      />

      <div className="legend" style={{ marginBottom: 12 }}>
        {LEGEND.map((h) => (
          <span key={h} className="legend-item">
            <span className="swatch" style={{ background: HEALTH_COLOR[h] }} />
            {HEALTH_LABEL[h]}
          </span>
        ))}
        <span className="legend-item">
          <span
            className="swatch"
            style={{ background: 'var(--critical)', width: 2, height: 12 }}
          />
          Today
        </span>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        {!range || groups.length === 0 ? (
          <EmptyState title="No initiatives to show" />
        ) : (
          <div className="gantt">
            <div className="gantt-grid" role="table" aria-label="Initiative timeline">
              <div className="gantt-header" role="row">
                <div
                  className="gantt-label-col cell-sub"
                  role="columnheader"
                  style={{ fontWeight: 650 }}
                >
                  Initiative
                </div>
                <div
                  className="gantt-months"
                  role="columnheader"
                  style={{ position: 'relative', height: 48 }}
                >
                  {monthsInRange(range.start, range.end).map((m) => {
                    const left = pct(m);
                    const width = pct(addDays(monthEnd(m), 1)) - left;
                    const isJan = m.slice(5, 7) === '01';
                    return (
                      <div
                        key={m}
                        className={`gantt-month ${isJan ? 'year-start' : ''}`}
                        style={{
                          position: 'absolute',
                          left: `${left}%`,
                          width: `${width}%`,
                          top: 0,
                          bottom: 0,
                        }}
                      >
                        <span className="gantt-year">
                          {isJan || m === range.start ? m.slice(0, 4) : '\u00a0'}
                        </span>
                        {formatMonth(m)}
                      </div>
                    );
                  })}
                  <div className="gantt-today-label" style={{ left: `${pct(today)}%` }}>
                    Today
                  </div>
                </div>
              </div>

              {groups.map((g) => (
                <div key={g.objective.id} role="rowgroup">
                  <div className="gantt-group" role="row">
                    <div className="gantt-label-col" role="rowheader">
                      <span className="tag" style={{ marginRight: 8 }}>
                        {g.objective.code}
                      </span>
                      {g.objective.title}
                    </div>
                    <Track range={range} pct={pct} today={today} />
                  </div>
                  {g.rows.map((i) => (
                    <div key={i.id} className="gantt-row" role="row">
                      <div className="gantt-label-col" role="rowheader">
                        <span className="cell-title" title={i.title}>
                          {i.title}
                        </span>
                        <span className="cell-sub">
                          {i.code} · {i.owner}
                        </span>
                      </div>
                      <Track range={range} pct={pct} today={today}>
                        <Bar row={i} left={pct(i.startDate)} right={pct(addDays(i.endDate, 1))} />
                      </Track>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Track({
  range,
  pct,
  today,
  children,
}: {
  range: { start: string; end: string };
  pct: (iso: string) => number;
  today: string;
  children?: ReactNode;
}) {
  return (
    <div className="gantt-track" role="cell" style={children ? undefined : { minHeight: 36 }}>
      {monthsInRange(range.start, range.end).map((m) => (
        <div key={m} className="gantt-gridline" style={{ left: `${pct(m)}%` }} />
      ))}
      <div className="gantt-today" style={{ left: `${pct(today)}%` }} />
      {children}
    </div>
  );
}

function Bar({ row, left, right }: { row: InitiativeRow; left: number; right: number }) {
  const { health } = row.assessment;
  const width = Math.max(0.8, right - left);
  const labelOutsideLeft = right > 86;
  const tooltip = [
    `${row.code} · ${row.title}`,
    `${formatDate(row.startDate)} → ${formatDate(row.endDate)}`,
    `Health: ${HEALTH_LABEL[health]} · Progress ${row.progress}% (expected ${Math.round(row.assessment.expected)}%)`,
    `Budget ${formatCompactCurrency(row.budget)} · ${Math.round(row.assessment.burn)}% spent`,
    ...row.assessment.reasons,
  ].join('\n');

  return (
    <>
      <div
        className={`gantt-bar ${health === 'cancelled' ? 'cancelled' : ''}`}
        style={{ left: `${left}%`, width: `${width}%`, ['--bar' as string]: HEALTH_COLOR[health] }}
        title={tooltip}
        aria-label={tooltip}
        role="img"
      >
        {health !== 'cancelled' && (
          <div className="gantt-bar-fill" style={{ width: `${row.progress}%` }} />
        )}
      </div>
      <span
        className="cell-sub"
        style={{
          position: 'absolute',
          top: '50%',
          transform: 'translateY(-50%)',
          fontWeight: 650,
          whiteSpace: 'nowrap',
          ...(labelOutsideLeft
            ? { right: `calc(${100 - left}% + 8px)` }
            : { left: `calc(${left + width}% + 8px)` }),
        }}
      >
        {health === 'cancelled' ? 'Cancelled' : `${row.progress}%`}
      </span>
    </>
  );
}
