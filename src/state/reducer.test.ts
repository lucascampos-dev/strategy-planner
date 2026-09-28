import { describe, expect, it } from 'vitest';
import { createSeedData } from '../domain/seed';
import { nextCode, planReducer } from './reducer';

const base = () => createSeedData('2026-09-15');

describe('planReducer', () => {
  it('inserts new entities and replaces existing ones', () => {
    const state = base();
    const first = state.objectives[0]!;
    const renamed = planReducer(state, {
      type: 'objective/upsert',
      payload: { ...first, title: 'Renamed objective' },
    });
    expect(renamed.objectives).toHaveLength(state.objectives.length);
    expect(renamed.objectives[0]!.title).toBe('Renamed objective');

    const added = planReducer(state, {
      type: 'objective/upsert',
      payload: { ...first, id: 'obj-new', code: 'OBJ-99' },
    });
    expect(added.objectives).toHaveLength(state.objectives.length + 1);
  });

  it('does not mutate the previous state', () => {
    const state = base();
    const snapshot = JSON.stringify(state);
    planReducer(state, { type: 'initiative/delete', id: 'ini-1' });
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it('cascades objective deletion to initiatives, indicators and measurements', () => {
    const state = base();
    const next = planReducer(state, { type: 'objective/delete', id: 'obj-2' });
    expect(next.objectives.some((o) => o.id === 'obj-2')).toBe(false);
    expect(next.initiatives.some((i) => i.objectiveId === 'obj-2')).toBe(false);
    expect(next.indicators.some((k) => k.objectiveId === 'obj-2')).toBe(false);
    expect(
      next.measurements.some((m) => m.indicatorId === 'kpi-2' || m.indicatorId === 'kpi-3'),
    ).toBe(false);
    // Other objectives are untouched
    expect(next.measurements.some((m) => m.indicatorId === 'kpi-1')).toBe(true);
  });

  it('cascades indicator deletion to its measurements', () => {
    const next = planReducer(base(), { type: 'indicator/delete', id: 'kpi-1' });
    expect(next.measurements.some((m) => m.indicatorId === 'kpi-1')).toBe(false);
  });

  it('keeps a single measurement per indicator and period', () => {
    const state = base();
    const existing = state.measurements.find((m) => m.indicatorId === 'kpi-1')!;
    const next = planReducer(state, {
      type: 'measurement/upsert',
      payload: { id: 'm-new', indicatorId: 'kpi-1', period: existing.period, value: 99 },
    });
    const samePeriod = next.measurements.filter(
      (m) => m.indicatorId === 'kpi-1' && m.period === existing.period,
    );
    expect(samePeriod).toHaveLength(1);
    expect(samePeriod[0]!.value).toBe(99);
  });

  it('replaces the whole dataset (reset)', () => {
    const empty = {
      version: 1 as const,
      objectives: [],
      initiatives: [],
      indicators: [],
      measurements: [],
    };
    expect(planReducer(base(), { type: 'data/replace', payload: empty })).toBe(empty);
  });
});

describe('nextCode', () => {
  it('suggests the next sequential code', () => {
    expect(nextCode('INI', [{ code: 'INI-1' }, { code: 'INI-12' }, { code: 'X-99' }])).toBe(
      'INI-13',
    );
    expect(nextCode('KPI', [])).toBe('KPI-1');
  });
});
