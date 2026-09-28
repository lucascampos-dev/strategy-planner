import { describe, expect, it } from 'vitest';
import {
  achievement,
  assessInitiative,
  budgetBurn,
  budgetSummary,
  countByHealth,
  countByIndicatorStatus,
  evaluateIndicator,
  expectedProgress,
  isAtRisk,
  meetsTarget,
  objectiveProgress,
  rollUpAchievement,
  rollUpProgress,
  statusFromAchievement,
  trend,
} from './logic';
import type { Indicator, Initiative, Measurement } from './types';

const initiative = (overrides: Partial<Initiative> = {}): Initiative => ({
  id: 'i1',
  objectiveId: 'o1',
  code: 'INI-1',
  title: 'Test initiative',
  description: '',
  owner: 'Alex',
  status: 'in_progress',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  budget: 100,
  spent: 0,
  progress: 0,
  ...overrides,
});

const higher: Indicator = {
  id: 'k1',
  objectiveId: 'o1',
  code: 'KPI-1',
  name: 'On-time rate',
  unit: '%',
  polarity: 'higher_is_better',
  baseline: 80,
  target: 100,
  frequency: 'monthly',
};

const lower: Indicator = {
  ...higher,
  id: 'k2',
  code: 'KPI-2',
  name: 'Cost per parcel',
  unit: 'USD',
  polarity: 'lower_is_better',
  baseline: 5,
  target: 4,
};

const m = (indicatorId: string, period: string, value: number): Measurement => ({
  id: `${indicatorId}-${period}`,
  indicatorId,
  period,
  value,
});

describe('expectedProgress', () => {
  it('is 0 before the start date and 100 on/after the end date', () => {
    expect(expectedProgress('2026-03-01', '2026-03-31', '2026-02-15')).toBe(0);
    expect(expectedProgress('2026-03-01', '2026-03-31', '2026-03-31')).toBe(100);
    expect(expectedProgress('2026-03-01', '2026-03-31', '2026-06-01')).toBe(100);
  });

  it('grows linearly between start and end', () => {
    expect(expectedProgress('2026-01-01', '2026-01-11', '2026-01-06')).toBe(50);
  });

  it('handles single-day initiatives', () => {
    expect(expectedProgress('2026-05-10', '2026-05-10', '2026-05-10')).toBe(100);
  });
});

describe('budgetBurn', () => {
  it('returns spent as a share of budget', () => {
    expect(budgetBurn({ budget: 200, spent: 50 })).toBe(25);
    expect(budgetBurn({ budget: 100, spent: 130 })).toBe(130);
  });

  it('does not divide by zero', () => {
    expect(budgetBurn({ budget: 0, spent: 0 })).toBe(0);
    expect(budgetBurn({ budget: 0, spent: 10 })).toBe(100);
  });
});

describe('assessInitiative (status rules)', () => {
  const mid = '2026-07-02'; // ~50% through 2026

  it('keeps terminal statuses regardless of dates', () => {
    expect(
      assessInitiative(initiative({ status: 'completed', progress: 100 }), '2027-06-01').health,
    ).toBe('done');
    expect(assessInitiative(initiative({ status: 'cancelled' }), '2027-06-01').health).toBe(
      'cancelled',
    );
  });

  it('flags open initiatives past their end date as late', () => {
    const a = assessInitiative(initiative({ progress: 95 }), '2027-01-03');
    expect(a.health).toBe('late');
    expect(a.reasons[0]).toMatch(/3 days/);
  });

  it('treats planned work as not started until its start date, then at risk', () => {
    const planned = initiative({ status: 'planned', startDate: '2026-08-01' });
    expect(assessInitiative(planned, mid).health).toBe('not_started');
    expect(assessInitiative(planned, '2026-08-15').health).toBe('at_risk');
  });

  it('marks on-hold initiatives as at risk', () => {
    const a = assessInitiative(initiative({ status: 'on_hold', progress: 50, spent: 50 }), mid);
    expect(a.health).toBe('at_risk');
    expect(a.reasons).toContain('Initiative is on hold');
  });

  it('is on track when progress is within the schedule tolerance', () => {
    expect(assessInitiative(initiative({ progress: 40, spent: 40 }), mid).health).toBe('on_track');
  });

  it('is at risk when progress trails the schedule beyond tolerance', () => {
    const a = assessInitiative(initiative({ progress: 20, spent: 20 }), mid);
    expect(a.health).toBe('at_risk');
    expect(a.reasons.join()).toMatch(/behind schedule/);
  });

  it('is at risk when budget burn runs ahead of progress', () => {
    const a = assessInitiative(initiative({ progress: 50, spent: 90 }), mid);
    expect(a.health).toBe('at_risk');
    expect(a.reasons.join()).toMatch(/Budget burn/);
  });

  it('isAtRisk covers at_risk and late only', () => {
    expect(isAtRisk('at_risk')).toBe(true);
    expect(isAtRisk('late')).toBe(true);
    expect(isAtRisk('on_track')).toBe(false);
    expect(isAtRisk('done')).toBe(false);
  });

  it('counts initiatives by health', () => {
    const counts = countByHealth(
      [
        initiative({ id: 'a', progress: 50, spent: 50 }),
        initiative({ id: 'b', status: 'on_hold' }),
        initiative({ id: 'c', status: 'completed', progress: 100 }),
      ],
      mid,
    );
    expect(counts).toMatchObject({ on_track: 1, at_risk: 1, done: 1, late: 0 });
  });
});

describe('progress roll-ups', () => {
  it('weights progress by budget', () => {
    const list = [
      initiative({ id: 'a', budget: 300, progress: 100 }),
      initiative({ id: 'b', budget: 100, progress: 0 }),
    ];
    expect(rollUpProgress(list)).toBe(75);
  });

  it('falls back to a simple average when no budget is set', () => {
    const list = [
      initiative({ id: 'a', budget: 0, progress: 80 }),
      initiative({ id: 'b', budget: 0, progress: 20 }),
    ];
    expect(rollUpProgress(list)).toBe(50);
  });

  it('ignores cancelled initiatives', () => {
    const list = [
      initiative({ id: 'a', budget: 100, progress: 60 }),
      initiative({ id: 'b', budget: 900, progress: 0, status: 'cancelled' }),
    ];
    expect(rollUpProgress(list)).toBe(60);
  });

  it('returns null when there is nothing to roll up', () => {
    expect(rollUpProgress([])).toBeNull();
    expect(rollUpProgress([initiative({ status: 'cancelled' })])).toBeNull();
  });

  it('rolls up per objective', () => {
    const list = [
      initiative({ id: 'a', objectiveId: 'o1', progress: 40 }),
      initiative({ id: 'b', objectiveId: 'o2', progress: 90 }),
    ];
    expect(objectiveProgress('o1', list)).toBe(40);
    expect(objectiveProgress('o3', list)).toBeNull();
  });

  it('summarizes budget excluding cancelled work', () => {
    const summary = budgetSummary([
      initiative({ id: 'a', budget: 1000, spent: 250 }),
      initiative({ id: 'b', budget: 500, spent: 500, status: 'cancelled' }),
    ]);
    expect(summary).toEqual({ budget: 1000, spent: 250, burn: 25 });
  });
});

describe('indicator achievement with polarity', () => {
  it('higher is better: measures distance covered from baseline to target', () => {
    expect(achievement(higher, 80)).toBe(0);
    expect(achievement(higher, 90)).toBeCloseTo(0.5);
    expect(achievement(higher, 100)).toBe(1);
  });

  it('lower is better: a decreasing value is progress', () => {
    expect(achievement(lower, 5)).toBe(0);
    expect(achievement(lower, 4.5)).toBeCloseTo(0.5);
    expect(achievement(lower, 4)).toBe(1);
  });

  it('caps over-achievement at 1 and floors regressions at 0', () => {
    expect(achievement(higher, 120)).toBe(1);
    expect(achievement(higher, 60)).toBe(0);
    expect(achievement(lower, 3)).toBe(1);
    expect(achievement(lower, 6)).toBe(0);
  });

  it('is binary when baseline equals target', () => {
    const flat = { ...higher, baseline: 95, target: 95 };
    expect(achievement(flat, 96)).toBe(1);
    expect(achievement(flat, 94)).toBe(0);
  });

  it('meetsTarget respects polarity', () => {
    expect(meetsTarget(higher, 100)).toBe(true);
    expect(meetsTarget(higher, 99)).toBe(false);
    expect(meetsTarget(lower, 3.9)).toBe(true);
    expect(meetsTarget(lower, 4.1)).toBe(false);
  });

  it('maps achievement to a status band', () => {
    expect(statusFromAchievement(null)).toBe('no_data');
    expect(statusFromAchievement(1)).toBe('achieved');
    expect(statusFromAchievement(0.7)).toBe('on_track');
    expect(statusFromAchievement(0.5)).toBe('attention');
    expect(statusFromAchievement(0.1)).toBe('critical');
  });

  it('reads the trend through the polarity', () => {
    const up = [m('k', '2026-01', 1), m('k', '2026-02', 2)];
    expect(trend(higher, up)).toBe('improving');
    expect(trend(lower, up)).toBe('worsening');
    expect(trend(higher, [m('k', '2026-01', 1)])).toBe('unknown');
    expect(trend(higher, [m('k', '2026-01', 1), m('k', '2026-02', 1)])).toBe('flat');
  });

  it('evaluates an indicator from its latest measurement, regardless of input order', () => {
    const data = [m('k1', '2026-03', 95), m('k1', '2026-01', 82), m('k1', '2026-02', 88)];
    const evaluation = evaluateIndicator(higher, data);
    expect(evaluation.latest?.period).toBe('2026-03');
    expect(evaluation.achievement).toBeCloseTo(0.75);
    expect(evaluation.status).toBe('on_track');
    expect(evaluation.trend).toBe('improving');
  });

  it('rolls up achievement across indicators with data only', () => {
    const data = [m('k1', '2026-01', 100), m('k2', '2026-01', 5)];
    const noData = { ...higher, id: 'k3' };
    expect(rollUpAchievement([higher, lower, noData], data)).toBeCloseTo(0.5);
    expect(rollUpAchievement([noData], data)).toBeNull();
    expect(countByIndicatorStatus([higher, lower, noData], data)).toEqual({
      achieved: 1,
      on_track: 0,
      attention: 0,
      critical: 1,
      no_data: 1,
    });
  });
});
