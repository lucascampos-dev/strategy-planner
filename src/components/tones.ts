import type { Health, IndicatorStatus } from '../domain/types';

/** Status colors for chart marks. Always rendered next to a text label. */
export const HEALTH_COLOR: Record<Health, string> = {
  on_track: 'var(--good)',
  at_risk: 'var(--warning)',
  late: 'var(--critical)',
  done: 'var(--done)',
  not_started: 'var(--neutral)',
  cancelled: 'var(--neutral)',
};

export const INDICATOR_COLOR: Record<IndicatorStatus, string> = {
  achieved: 'var(--good)',
  on_track: 'var(--teal-600)',
  attention: 'var(--warning)',
  critical: 'var(--critical)',
  no_data: 'var(--neutral)',
};
