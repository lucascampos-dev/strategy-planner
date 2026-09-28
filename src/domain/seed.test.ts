import { describe, expect, it } from 'vitest';
import { countByHealth } from './logic';
import { createSeedData } from './seed';
import { isValid, validateIndicator, validateInitiative, validateObjective } from './validation';

describe('seed data', () => {
  const today = '2026-09-15';
  const plan = createSeedData(today);
  const objectiveIds = plan.objectives.map((o) => o.id);

  it('passes every validation rule', () => {
    for (const o of plan.objectives)
      expect(isValid(validateObjective(o, plan.objectives))).toBe(true);
    for (const i of plan.initiatives) {
      expect(validateInitiative(i, plan.initiatives, objectiveIds), i.code).toEqual({});
    }
    for (const k of plan.indicators) {
      expect(validateIndicator(k, plan.indicators, objectiveIds), k.code).toEqual({});
    }
  });

  it('has no orphan references', () => {
    const indicatorIds = new Set(plan.indicators.map((k) => k.id));
    expect(plan.initiatives.every((i) => objectiveIds.includes(i.objectiveId))).toBe(true);
    expect(plan.measurements.every((m) => indicatorIds.has(m.indicatorId))).toBe(true);
  });

  it('showcases a realistic mix of health states', () => {
    const counts = countByHealth(plan.initiatives, today);
    expect(counts.on_track).toBeGreaterThan(0);
    expect(counts.at_risk).toBeGreaterThan(0);
    expect(counts.late).toBeGreaterThan(0);
    expect(counts.done).toBeGreaterThan(0);
    expect(counts.not_started).toBeGreaterThan(0);
  });

  it('keeps measurements in the past', () => {
    expect(plan.measurements.every((m) => m.period < today.slice(0, 7))).toBe(true);
  });
});
