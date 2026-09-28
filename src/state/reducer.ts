import type { ID, Indicator, Initiative, Measurement, Objective, PlanData } from '../domain/types';

export type Action =
  | { type: 'objective/upsert'; payload: Objective }
  | { type: 'objective/delete'; id: ID }
  | { type: 'initiative/upsert'; payload: Initiative }
  | { type: 'initiative/delete'; id: ID }
  | { type: 'indicator/upsert'; payload: Indicator }
  | { type: 'indicator/delete'; id: ID }
  | { type: 'measurement/upsert'; payload: Measurement }
  | { type: 'measurement/delete'; id: ID }
  | { type: 'data/replace'; payload: PlanData };

function upsert<T extends { id: ID }>(list: T[], item: T): T[] {
  const index = list.findIndex((x) => x.id === item.id);
  if (index === -1) return [...list, item];
  const next = list.slice();
  next[index] = item;
  return next;
}

/**
 * Pure reducer for the whole plan. Deletes cascade so the data never holds
 * orphans: removing an objective removes its initiatives, indicators and
 * their measurements.
 */
export function planReducer(state: PlanData, action: Action): PlanData {
  switch (action.type) {
    case 'objective/upsert':
      return { ...state, objectives: upsert(state.objectives, action.payload) };

    case 'objective/delete': {
      const indicatorIds = new Set(
        state.indicators.filter((i) => i.objectiveId === action.id).map((i) => i.id),
      );
      return {
        ...state,
        objectives: state.objectives.filter((o) => o.id !== action.id),
        initiatives: state.initiatives.filter((i) => i.objectiveId !== action.id),
        indicators: state.indicators.filter((i) => i.objectiveId !== action.id),
        measurements: state.measurements.filter((m) => !indicatorIds.has(m.indicatorId)),
      };
    }

    case 'initiative/upsert':
      return { ...state, initiatives: upsert(state.initiatives, action.payload) };

    case 'initiative/delete':
      return { ...state, initiatives: state.initiatives.filter((i) => i.id !== action.id) };

    case 'indicator/upsert':
      return { ...state, indicators: upsert(state.indicators, action.payload) };

    case 'indicator/delete':
      return {
        ...state,
        indicators: state.indicators.filter((i) => i.id !== action.id),
        measurements: state.measurements.filter((m) => m.indicatorId !== action.id),
      };

    case 'measurement/upsert': {
      // One value per indicator & period: a new entry for an existing period replaces it.
      const m = action.payload;
      const others = state.measurements.filter(
        (x) => x.id === m.id || !(x.indicatorId === m.indicatorId && x.period === m.period),
      );
      return { ...state, measurements: upsert(others, m) };
    }

    case 'measurement/delete':
      return { ...state, measurements: state.measurements.filter((m) => m.id !== action.id) };

    case 'data/replace':
      return action.payload;

    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export function newId(prefix: string): ID {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}

/** Suggests the next free code, e.g. `INI-14`. */
export function nextCode(prefix: string, existing: { code: string }[]): string {
  const max = existing.reduce((acc, { code }) => {
    const match = new RegExp(`^${prefix}-(\\d+)$`).exec(code);
    return match ? Math.max(acc, Number(match[1])) : acc;
  }, 0);
  return `${prefix}-${max + 1}`;
}
