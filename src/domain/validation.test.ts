import { describe, expect, it } from 'vitest';
import type { Indicator, Initiative, Objective } from './types';
import {
  isValid,
  parseNumber,
  validateIndicator,
  validateInitiative,
  validateMeasurement,
  validateObjective,
} from './validation';

const objective: Objective = {
  id: 'o1',
  code: 'OBJ-1',
  title: 'Grow recurring revenue',
  description: '',
  perspective: 'financial',
  owner: 'Maya',
};

const initiative: Initiative = {
  id: 'i1',
  objectiveId: 'o1',
  code: 'INI-1',
  title: 'Launch subscription tier',
  description: '',
  owner: 'Maya',
  status: 'in_progress',
  startDate: '2026-01-01',
  endDate: '2026-06-30',
  budget: 1000,
  spent: 100,
  progress: 30,
};

const indicator: Indicator = {
  id: 'k1',
  objectiveId: 'o1',
  code: 'KPI-1',
  name: 'On-time rate',
  unit: '%',
  polarity: 'higher_is_better',
  baseline: 90,
  target: 97,
  frequency: 'monthly',
};

describe('validateObjective', () => {
  it('accepts a valid objective', () => {
    expect(isValid(validateObjective(objective, [objective]))).toBe(true);
  });

  it('requires title, owner and a well-formed unique code', () => {
    const other = { ...objective, id: 'o2' };
    const errors = validateObjective({ ...other, title: ' ', owner: '' }, [objective, other]);
    expect(errors.title).toBeDefined();
    expect(errors.owner).toBeDefined();
    expect(errors.code).toMatch(/already in use/);
    expect(validateObjective({ ...objective, code: 'objective 1' }, []).code).toMatch(/format/);
  });
});

describe('validateInitiative', () => {
  const ids = ['o1'];

  it('accepts a valid initiative', () => {
    expect(validateInitiative(initiative, [initiative], ids)).toEqual({});
  });

  it('rejects end dates before start dates and impossible dates', () => {
    expect(validateInitiative({ ...initiative, endDate: '2025-12-31' }, [], ids).endDate).toMatch(
      /on or after/,
    );
    expect(
      validateInitiative({ ...initiative, startDate: '2026-02-31' }, [], ids).startDate,
    ).toBeDefined();
  });

  it('rejects negative money and out-of-range progress', () => {
    const errors = validateInitiative(
      { ...initiative, budget: -1, spent: Number.NaN, progress: 120 },
      [],
      ids,
    );
    expect(errors.budget).toMatch(/negative/);
    expect(errors.spent).toMatch(/number/);
    expect(errors.progress).toMatch(/between 0 and 100/);
  });

  it('enforces status/progress consistency', () => {
    expect(
      validateInitiative({ ...initiative, status: 'completed', progress: 90 }, [], ids).progress,
    ).toMatch(/100%/);
    expect(
      validateInitiative({ ...initiative, status: 'planned', progress: 10 }, [], ids).progress,
    ).toMatch(/planned/);
  });

  it('requires an existing objective', () => {
    expect(
      validateInitiative({ ...initiative, objectiveId: 'nope' }, [], ids).objectiveId,
    ).toBeDefined();
  });
});

describe('validateIndicator', () => {
  it('accepts a valid indicator', () => {
    expect(validateIndicator(indicator, [indicator], ['o1'])).toEqual({});
  });

  it('checks that the target agrees with the polarity', () => {
    expect(validateIndicator({ ...indicator, target: 80 }, [], ['o1']).target).toMatch(/above/);
    expect(
      validateIndicator({ ...indicator, polarity: 'lower_is_better' }, [], ['o1']).target,
    ).toMatch(/below/);
  });

  it('requires numeric baseline and target', () => {
    const errors = validateIndicator(
      { ...indicator, baseline: Number.NaN, target: Number.NaN },
      [],
      ['o1'],
    );
    expect(errors.baseline).toBeDefined();
    expect(errors.target).toBeDefined();
  });
});

describe('validateMeasurement', () => {
  it('requires a YYYY-MM period and a numeric value', () => {
    expect(
      validateMeasurement({ id: 'm', indicatorId: 'k1', period: '2026-07', value: 1 }),
    ).toEqual({});
    const errors = validateMeasurement({
      id: 'm',
      indicatorId: 'k1',
      period: '2026-13',
      value: Number.NaN,
    });
    expect(errors.period).toBeDefined();
    expect(errors.value).toBeDefined();
  });
});

describe('parseNumber', () => {
  it('parses decimals with dot or comma and treats blanks as NaN', () => {
    expect(parseNumber('4.5')).toBe(4.5);
    expect(parseNumber('4,5')).toBe(4.5);
    expect(parseNumber('  ')).toBeNaN();
    expect(parseNumber('abc')).toBeNaN();
  });
});
