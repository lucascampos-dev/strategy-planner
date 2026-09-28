import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { HealthBadge } from '../components/Badges';
import { Donut } from '../components/charts/Donut';
import { ObjectiveBars, type ObjectiveBarDatum } from '../components/charts/ObjectiveBars';
import { Icon, type IconName } from '../components/Icon';
import { EmptyState, PageHeader } from '../components/PageHeader';
import { ProgressBar } from '../components/ProgressBar';
import { HEALTH_COLOR, INDICATOR_COLOR } from '../components/tones';
import {
  formatCompactCurrency,
  formatDate,
  HEALTH_LABEL,
  INDICATOR_STATUS_LABEL,
} from '../domain/format';
import {
  budgetSummary,
  countByHealth,
  countByIndicatorStatus,
  isAtRisk,
  objectiveProgress,
  rollUpAchievement,
  rollUpProgress,
} from '../domain/logic';
import { COMPANY_NAME } from '../domain/seed';
import type { Health, IndicatorStatus } from '../domain/types';
import { useDerived, usePlan } from '../state/usePlan';

const HEALTH_ORDER: Health[] = ['on_track', 'at_risk', 'late', 'done', 'not_started', 'cancelled'];
const INDICATOR_ORDER: IndicatorStatus[] = [
  'achieved',
  'on_track',
  'attention',
  'critical',
  'no_data',
];

export function DashboardPage() {
  const { plan, today } = usePlan();
  const { initiatives } = useDerived();

  const execution = rollUpProgress(plan.initiatives);
  const achievementAll = rollUpAchievement(plan.indicators, plan.measurements);
  const budget = budgetSummary(plan.initiatives);
  const health = countByHealth(plan.initiatives, today);
  const indicatorCounts = countByIndicatorStatus(plan.indicators, plan.measurements);
  const openCount = plan.initiatives.filter(
    (i) => i.status !== 'completed' && i.status !== 'cancelled',
  ).length;

  const bars: ObjectiveBarDatum[] = plan.objectives.map((o) => {
    const results = rollUpAchievement(
      plan.indicators.filter((k) => k.objectiveId === o.id),
      plan.measurements,
    );
    return {
      id: o.id,
      code: o.code,
      title: o.title,
      execution: objectiveProgress(o.id, plan.initiatives),
      results: results === null ? null : results * 100,
    };
  });

  const attention = initiatives
    .filter((i) => isAtRisk(i.assessment.health))
    .sort((a, b) => {
      // Late first, then the biggest schedule gap.
      if (a.assessment.health !== b.assessment.health)
        return a.assessment.health === 'late' ? -1 : 1;
      return b.assessment.expected - b.progress - (a.assessment.expected - a.progress);
    });

  const onTarget = indicatorCounts.achieved + indicatorCounts.on_track;
  const withData = plan.indicators.length - indicatorCounts.no_data;

  return (
    <>
      <PageHeader
        eyebrow={`${COMPANY_NAME} · Strategic plan`}
        title="Dashboard"
        subtitle={`Execution and results snapshot as of ${formatDate(today)}.`}
        actions={
          <>
            <Link className="btn" to="/timeline">
              <Icon name="timeline" size={16} /> Timeline
            </Link>
            <Link className="btn btn-primary" to="/initiatives?new=1">
              <Icon name="plus" size={16} /> New initiative
            </Link>
          </>
        }
      />

      <section className="grid kpi-grid" aria-label="Key figures">
        <KpiTile
          icon="rocket"
          label="Plan execution"
          value={execution === null ? '—' : `${Math.round(execution)}%`}
        >
          <ProgressBar value={execution} label="Overall execution" />
          <span className="kpi-foot">Budget-weighted progress of {openCount} open initiatives</span>
        </KpiTile>
        <KpiTile
          icon="gauge"
          label="Results achievement"
          value={achievementAll === null ? '—' : `${Math.round(achievementAll * 100)}%`}
        >
          <ProgressBar
            value={achievementAll === null ? null : achievementAll * 100}
            variant="results"
            label="Results achievement"
          />
          <span className="kpi-foot">
            {onTarget} of {withData} indicators on track or achieved
          </span>
        </KpiTile>
        <KpiTile icon="alert" label="Need attention" value={String(health.at_risk + health.late)}>
          <span className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <HealthBadge health="late" /> <b>{health.late}</b>
            <span style={{ width: 6 }} />
            <HealthBadge health="at_risk" /> <b>{health.at_risk}</b>
          </span>
          <span className="kpi-foot">Out of {plan.initiatives.length} initiatives in the plan</span>
        </KpiTile>
        <KpiTile icon="wallet" label="Budget consumed" value={formatCompactCurrency(budget.spent)}>
          <ProgressBar value={budget.burn} label="Budget consumed" />
          <span className="kpi-foot">
            of {formatCompactCurrency(budget.budget)} approved (excl. cancelled)
          </span>
        </KpiTile>
      </section>

      <section className="grid dash-grid">
        <article className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Progress by objective</h2>
              <p className="card-sub">
                Execution = initiative progress · Results = indicator achievement
              </p>
            </div>
            <div className="legend" aria-hidden="true">
              <span className="legend-item">
                <span className="swatch" style={{ background: 'var(--series-1)' }} /> Execution
              </span>
              <span className="legend-item">
                <span className="swatch" style={{ background: 'var(--series-2)' }} /> Results
              </span>
            </div>
          </div>
          <div className="card-body">
            {bars.length > 0 ? (
              <ObjectiveBars data={bars} />
            ) : (
              <EmptyState title="No objectives yet" />
            )}
          </div>
        </article>

        <article className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Indicator achievement</h2>
              <p className="card-sub">Latest measurement vs. target, polarity-aware</p>
            </div>
            <Link to="/indicators" className="link-btn">
              Details
            </Link>
          </div>
          <div className="card-body">
            <Donut
              centerValue={`${onTarget}/${plan.indicators.length}`}
              centerLabel="on track"
              slices={INDICATOR_ORDER.map((s) => ({
                key: s,
                label: INDICATOR_STATUS_LABEL[s],
                value: indicatorCounts[s],
                color: INDICATOR_COLOR[s],
              }))}
            />
            <h3 className="section-title" style={{ marginTop: 22 }}>
              Initiative health
            </h3>
            <HealthStrip counts={health} />
          </div>
        </article>
      </section>

      <article className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Initiatives needing attention</h2>
            <p className="card-sub">Late, behind schedule, over budget or on hold</p>
          </div>
          <Link to="/initiatives?health=attention" className="link-btn">
            View in list →
          </Link>
        </div>
        <div className="card-body" style={{ padding: 0, marginTop: 12 }}>
          {attention.length === 0 ? (
            <EmptyState title="Everything is on track">
              No initiative is late or at risk.
            </EmptyState>
          ) : (
            <div className="table-wrap">
              <table className="table responsive">
                <thead>
                  <tr>
                    <th>Initiative</th>
                    <th>Health</th>
                    <th>Progress vs. expected</th>
                    <th>Owner</th>
                    <th>Ends</th>
                  </tr>
                </thead>
                <tbody>
                  {attention.map((i) => (
                    <tr key={i.id}>
                      <td className="primary">
                        <div className="cell-title">{i.title}</div>
                        <div className="cell-sub">
                          {i.code} · {i.objective?.title ?? 'Unassigned'}
                        </div>
                      </td>
                      <td data-label="Health">
                        <div>
                          <HealthBadge health={i.assessment.health} />
                          <ul className={`reasons ${i.assessment.health === 'late' ? 'late' : ''}`}>
                            {i.assessment.reasons.map((r) => (
                              <li key={r}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      </td>
                      <td data-label="Progress" style={{ minWidth: 190 }}>
                        <ProgressBar
                          value={i.progress}
                          expected={i.assessment.expected}
                          label={`${i.title} progress`}
                        />
                      </td>
                      <td data-label="Owner" className="cell-muted">
                        {i.owner}
                      </td>
                      <td data-label="Ends" className="cell-muted">
                        {formatDate(i.endDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </article>
    </>
  );
}

function KpiTile({
  icon,
  label,
  value,
  children,
}: {
  icon: IconName;
  label: string;
  value: string;
  children?: ReactNode;
}) {
  return (
    <article className="card kpi">
      <span className="kpi-label">
        <span className="kpi-icon">
          <Icon name={icon} size={16} />
        </span>
        {label}
      </span>
      <span className="kpi-value">{value}</span>
      {children}
    </article>
  );
}

function HealthStrip({ counts }: { counts: Record<Health, number> }) {
  const total = HEALTH_ORDER.reduce((s, h) => s + counts[h], 0) || 1;
  return (
    <div>
      <div
        role="img"
        aria-label={HEALTH_ORDER.map((h) => `${HEALTH_LABEL[h]} ${counts[h]}`).join(', ')}
        style={{ display: 'flex', gap: 2, height: 12, borderRadius: 4, overflow: 'hidden' }}
      >
        {HEALTH_ORDER.filter((h) => counts[h] > 0).map((h) => (
          <div
            key={h}
            title={`${HEALTH_LABEL[h]}: ${counts[h]}`}
            style={{ flex: counts[h] / total, background: HEALTH_COLOR[h] }}
          />
        ))}
      </div>
      <div className="legend" style={{ marginTop: 10 }}>
        {HEALTH_ORDER.map((h) => (
          <span key={h} className="legend-item">
            <span className="swatch" style={{ background: HEALTH_COLOR[h] }} />
            {HEALTH_LABEL[h]} <b style={{ color: 'var(--ink)' }}>{counts[h]}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
