/**
 * Pure business rules. No React, no I/O — every function takes `today` as an
 * argument so results are deterministic and easy to unit test.
 */
import { daysBetween, parseIsoDate } from './dates';
import type {
  Health,
  ID,
  Indicator,
  IndicatorStatus,
  Initiative,
  Measurement,
  Trend,
} from './types';

// ---------------------------------------------------------------------------
// Tunable thresholds (documented here so the business can review them)
// ---------------------------------------------------------------------------

export const RULES = {
  /** Progress may trail the linear schedule by this many points before "at risk". */
  scheduleTolerance: 15,
  /** Budget consumption may exceed physical progress by this many points before "at risk". */
  burnTolerance: 25,
  /** Indicator achievement thresholds (0–1). */
  onTrackAchievement: 0.7,
  attentionAchievement: 0.4,
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const round1 = (n: number): number => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------
// Initiatives: schedule, health and status rules
// ---------------------------------------------------------------------------

/**
 * Progress an initiative *should* have reached today assuming linear execution
 * between start and end dates (inclusive), 0–100.
 */
export function expectedProgress(startDate: string, endDate: string, today: string): number {
  if (today < startDate) return 0;
  if (today >= endDate) return 100;
  const total = daysBetween(startDate, endDate);
  if (total <= 0) return 100;
  return round1(clamp((daysBetween(startDate, today) / total) * 100, 0, 100));
}

/** Share of the budget already spent, 0–100+ (can exceed 100 on overruns). */
export function budgetBurn(initiative: Pick<Initiative, 'budget' | 'spent'>): number {
  if (initiative.budget <= 0) return initiative.spent > 0 ? 100 : 0;
  return round1((initiative.spent / initiative.budget) * 100);
}

export interface HealthAssessment {
  health: Health;
  expected: number;
  burn: number;
  reasons: string[];
}

/**
 * Status rules — the single source of truth for "is this initiative in trouble?".
 *
 * 1. `cancelled` and `completed` are terminal and win over everything else.
 * 2. Past the end date and not completed → `late`.
 * 3. `planned` before its start date → `not_started`; after it → `at_risk` (it should have begun).
 * 4. `on_hold` → `at_risk`.
 * 5. `in_progress` → `at_risk` when progress trails the linear schedule by more than
 *    the tolerance, or when budget burn runs ahead of progress; otherwise `on_track`.
 */
export function assessInitiative(initiative: Initiative, today: string): HealthAssessment {
  const expected = expectedProgress(initiative.startDate, initiative.endDate, today);
  const burn = budgetBurn(initiative);
  const reasons: string[] = [];

  if (initiative.status === 'cancelled') return { health: 'cancelled', expected, burn, reasons };
  if (initiative.status === 'completed') return { health: 'done', expected, burn, reasons };

  if (today > initiative.endDate) {
    const overdue = daysBetween(initiative.endDate, today);
    reasons.push(`Past end date by ${overdue} day${overdue === 1 ? '' : 's'}`);
    return { health: 'late', expected, burn, reasons };
  }

  if (initiative.status === 'planned') {
    if (today < initiative.startDate) return { health: 'not_started', expected, burn, reasons };
    reasons.push('Start date passed but work has not begun');
    return { health: 'at_risk', expected, burn, reasons };
  }

  if (initiative.status === 'on_hold') {
    reasons.push('Initiative is on hold');
  }

  const gap = expected - initiative.progress;
  if (gap > RULES.scheduleTolerance) {
    reasons.push(`${Math.round(gap)} pts behind schedule`);
  }
  if (burn - initiative.progress > RULES.burnTolerance) {
    reasons.push(`Budget burn (${Math.round(burn)}%) ahead of progress`);
  }

  return { health: reasons.length > 0 ? 'at_risk' : 'on_track', expected, burn, reasons };
}

export function isAtRisk(health: Health): boolean {
  return health === 'at_risk' || health === 'late';
}

// ---------------------------------------------------------------------------
// Roll-ups
// ---------------------------------------------------------------------------

/**
 * Budget-weighted average progress of the given initiatives (0–100).
 * Cancelled initiatives are excluded. When no initiative has a budget the
 * average is unweighted. Returns `null` when nothing is left to measure.
 */
export function rollUpProgress(initiatives: Initiative[]): number | null {
  const active = initiatives.filter((i) => i.status !== 'cancelled');
  if (active.length === 0) return null;

  const totalBudget = active.reduce((sum, i) => sum + Math.max(0, i.budget), 0);
  if (totalBudget === 0) {
    return round1(active.reduce((sum, i) => sum + i.progress, 0) / active.length);
  }
  const weighted = active.reduce((sum, i) => sum + i.progress * Math.max(0, i.budget), 0);
  return round1(weighted / totalBudget);
}

export function objectiveProgress(objectiveId: ID, initiatives: Initiative[]): number | null {
  return rollUpProgress(initiatives.filter((i) => i.objectiveId === objectiveId));
}

export interface BudgetSummary {
  budget: number;
  spent: number;
  burn: number;
}

export function budgetSummary(initiatives: Initiative[]): BudgetSummary {
  const active = initiatives.filter((i) => i.status !== 'cancelled');
  const budget = active.reduce((s, i) => s + i.budget, 0);
  const spent = active.reduce((s, i) => s + i.spent, 0);
  return { budget, spent, burn: budget > 0 ? round1((spent / budget) * 100) : 0 };
}

export function countByHealth(initiatives: Initiative[], today: string): Record<Health, number> {
  const counts: Record<Health, number> = {
    not_started: 0,
    on_track: 0,
    at_risk: 0,
    late: 0,
    done: 0,
    cancelled: 0,
  };
  for (const i of initiatives) counts[assessInitiative(i, today).health] += 1;
  return counts;
}

// ---------------------------------------------------------------------------
// Indicators
// ---------------------------------------------------------------------------

/** True when `value` meets or beats the target, honoring polarity. */
export function meetsTarget(indicator: Pick<Indicator, 'polarity' | 'target'>, value: number) {
  return indicator.polarity === 'higher_is_better'
    ? value >= indicator.target
    : value <= indicator.target;
}

/**
 * How much of the baseline→target distance has been covered, 0–1.
 *
 * - higher is better: (value − baseline) / (target − baseline)
 * - lower is better:  (baseline − value) / (baseline − target)
 *
 * The result is capped at 1 so over-achievement on one KPI cannot mask
 * under-achievement on another in roll-ups, and floored at 0 when the value
 * moved the wrong way. If baseline equals target the indicator is binary.
 */
export function achievement(
  indicator: Pick<Indicator, 'polarity' | 'baseline' | 'target'>,
  value: number,
): number {
  const { baseline, target, polarity } = indicator;
  if (baseline === target) return meetsTarget(indicator, value) ? 1 : 0;
  const ratio =
    polarity === 'higher_is_better'
      ? (value - baseline) / (target - baseline)
      : (baseline - value) / (baseline - target);
  return clamp(ratio, 0, 1);
}

export function statusFromAchievement(ach: number | null): IndicatorStatus {
  if (ach === null || Number.isNaN(ach)) return 'no_data';
  if (ach >= 1) return 'achieved';
  if (ach >= RULES.onTrackAchievement) return 'on_track';
  if (ach >= RULES.attentionAchievement) return 'attention';
  return 'critical';
}

/** Measurements of one indicator, oldest → newest. */
export function seriesFor(indicatorId: ID, measurements: Measurement[]): Measurement[] {
  return measurements
    .filter((m) => m.indicatorId === indicatorId)
    .sort((a, b) => a.period.localeCompare(b.period));
}

export function latestMeasurement(
  indicatorId: ID,
  measurements: Measurement[],
): Measurement | undefined {
  const series = seriesFor(indicatorId, measurements);
  return series[series.length - 1];
}

/** Direction of the last change, interpreted through the indicator polarity. */
export function trend(indicator: Pick<Indicator, 'polarity'>, series: Measurement[]): Trend {
  if (series.length < 2) return 'unknown';
  const last = series[series.length - 1]!.value;
  const previous = series[series.length - 2]!.value;
  if (last === previous) return 'flat';
  const up = last > previous;
  const good = indicator.polarity === 'higher_is_better' ? up : !up;
  return good ? 'improving' : 'worsening';
}

export interface IndicatorEvaluation {
  latest: Measurement | undefined;
  achievement: number | null;
  status: IndicatorStatus;
  trend: Trend;
}

export function evaluateIndicator(
  indicator: Indicator,
  measurements: Measurement[],
): IndicatorEvaluation {
  const series = seriesFor(indicator.id, measurements);
  const latest = series[series.length - 1];
  const ach = latest ? achievement(indicator, latest.value) : null;
  return {
    latest,
    achievement: ach,
    status: statusFromAchievement(ach),
    trend: trend(indicator, series),
  };
}

/** Average achievement (0–1) across indicators that have data, or `null`. */
export function rollUpAchievement(
  indicators: Indicator[],
  measurements: Measurement[],
): number | null {
  const values = indicators
    .map((ind) => evaluateIndicator(ind, measurements).achievement)
    .filter((a): a is number => a !== null);
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function countByIndicatorStatus(
  indicators: Indicator[],
  measurements: Measurement[],
): Record<IndicatorStatus, number> {
  const counts: Record<IndicatorStatus, number> = {
    achieved: 0,
    on_track: 0,
    attention: 0,
    critical: 0,
    no_data: 0,
  };
  for (const ind of indicators) counts[evaluateIndicator(ind, measurements).status] += 1;
  return counts;
}

/** Sort key helper for date columns. */
export const byDate = (a: string, b: string): number =>
  parseIsoDate(a).getTime() - parseIsoDate(b).getTime();
