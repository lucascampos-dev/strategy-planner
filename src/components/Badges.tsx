import { HEALTH_LABEL, INDICATOR_STATUS_LABEL, STATUS_LABEL } from '../domain/format';
import type { Health, IndicatorStatus, InitiativeStatus, Trend } from '../domain/types';
import { Icon } from './Icon';

const HEALTH_TONE: Record<Health, string> = {
  on_track: 'tone-good',
  at_risk: 'tone-warning',
  late: 'tone-critical',
  done: 'tone-done',
  not_started: 'tone-neutral',
  cancelled: 'tone-neutral',
};

const INDICATOR_TONE: Record<IndicatorStatus, string> = {
  achieved: 'tone-good',
  on_track: 'tone-teal',
  attention: 'tone-warning',
  critical: 'tone-critical',
  no_data: 'tone-neutral',
};

export function HealthBadge({ health }: { health: Health }) {
  return <span className={`badge ${HEALTH_TONE[health]}`}>{HEALTH_LABEL[health]}</span>;
}

export function StatusText({ status }: { status: InitiativeStatus }) {
  return <span className="cell-muted">{STATUS_LABEL[status]}</span>;
}

export function IndicatorBadge({ status }: { status: IndicatorStatus }) {
  return (
    <span className={`badge ${INDICATOR_TONE[status]}`}>{INDICATOR_STATUS_LABEL[status]}</span>
  );
}

const TREND_ICON = { improving: 'up', worsening: 'down', flat: 'flat', unknown: 'flat' } as const;
const TREND_LABEL: Record<Trend, string> = {
  improving: 'Improving',
  worsening: 'Worsening',
  flat: 'Flat',
  unknown: '—',
};

export function TrendTag({ trend, polarityUp }: { trend: Trend; polarityUp?: boolean }) {
  // Arrow shows the *direction of the value*; color shows whether that is good.
  let icon: 'up' | 'down' | 'flat' = TREND_ICON[trend];
  if (trend === 'improving' && polarityUp === false) icon = 'down';
  if (trend === 'worsening' && polarityUp === false) icon = 'up';
  return (
    <span className={`trend ${trend}`}>
      <Icon name={icon} size={14} strokeWidth={2.5} />
      {TREND_LABEL[trend]}
    </span>
  );
}
