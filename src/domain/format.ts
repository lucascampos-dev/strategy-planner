import { parseIsoDate } from './dates';
import type {
  Frequency,
  Health,
  IndicatorStatus,
  InitiativeStatus,
  Perspective,
  Polarity,
} from './types';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const compactCurrency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const shortDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});
const monthYear = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const monthOnly = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

export const formatCurrency = (n: number): string => currency.format(n);
export const formatCompactCurrency = (n: number): string => compactCurrency.format(n);
export const formatNumber = (n: number): string => number.format(n);
export const formatPercent = (n: number | null, digits = 0): string =>
  n === null ? '—' : `${n.toFixed(digits)}%`;
export const formatDate = (iso: string): string => shortDate.format(parseIsoDate(iso));
export const formatPeriod = (period: string): string =>
  monthYear.format(parseIsoDate(`${period}-01`));
export const formatMonth = (iso: string): string => monthOnly.format(parseIsoDate(iso));

export function formatValue(value: number, unit: string): string {
  const v = formatNumber(value);
  if (unit === '%') return `${v}%`;
  if (unit === 'USD') return `$${v}`;
  return `${v} ${unit}`;
}

export const PERSPECTIVE_LABEL: Record<Perspective, string> = {
  financial: 'Financial',
  customer: 'Customer',
  process: 'Internal processes',
  learning: 'Learning & growth',
};

export const STATUS_LABEL: Record<InitiativeStatus, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  on_hold: 'On hold',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const HEALTH_LABEL: Record<Health, string> = {
  not_started: 'Not started',
  on_track: 'On track',
  at_risk: 'At risk',
  late: 'Late',
  done: 'Done',
  cancelled: 'Cancelled',
};

export const INDICATOR_STATUS_LABEL: Record<IndicatorStatus, string> = {
  achieved: 'Achieved',
  on_track: 'On track',
  attention: 'Attention',
  critical: 'Critical',
  no_data: 'No data',
};

export const POLARITY_LABEL: Record<Polarity, string> = {
  higher_is_better: 'Higher is better',
  lower_is_better: 'Lower is better',
};

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
};
