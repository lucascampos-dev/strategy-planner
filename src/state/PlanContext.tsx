import { useCallback, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { todayIso } from '../domain/dates';
import { createSeedData } from '../domain/seed';
import type { PlanData } from '../domain/types';
import { PlanContext } from './context';
import { planReducer } from './reducer';
import { loadPlan, savePlan } from './storage';

function init(): PlanData {
  return loadPlan() ?? createSeedData();
}

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, dispatch] = useReducer(planReducer, undefined, init);
  const today = useMemo(() => todayIso(), []);

  // Persist every change. `savePlan` swallows quota / privacy-mode errors.
  useEffect(() => {
    savePlan(plan);
  }, [plan]);

  const resetDemo = useCallback(() => {
    dispatch({ type: 'data/replace', payload: createSeedData() });
  }, []);

  const value = useMemo(() => ({ plan, dispatch, resetDemo, today }), [plan, resetDemo, today]);

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}
