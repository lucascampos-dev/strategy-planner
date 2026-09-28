import { useContext, useMemo } from 'react';
import {
  assessInitiative,
  evaluateIndicator,
  type HealthAssessment,
  type IndicatorEvaluation,
} from '../domain/logic';
import type { ID, Indicator, Initiative, Objective } from '../domain/types';
import { PlanContext, type PlanContextValue } from './context';

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be used inside <PlanProvider>');
  return ctx;
}

export interface InitiativeRow extends Initiative {
  assessment: HealthAssessment;
  objective: Objective | undefined;
}

export interface IndicatorRow extends Indicator {
  evaluation: IndicatorEvaluation;
  objective: Objective | undefined;
}

/** Derived, memoized views used by several pages. */
export function useDerived() {
  const { plan, today } = usePlan();

  return useMemo(() => {
    const objectiveById = new Map<ID, Objective>(plan.objectives.map((o) => [o.id, o]));

    const initiatives: InitiativeRow[] = plan.initiatives.map((i) => ({
      ...i,
      assessment: assessInitiative(i, today),
      objective: objectiveById.get(i.objectiveId),
    }));

    const indicators: IndicatorRow[] = plan.indicators.map((ind) => ({
      ...ind,
      evaluation: evaluateIndicator(ind, plan.measurements),
      objective: objectiveById.get(ind.objectiveId),
    }));

    return { objectiveById, initiatives, indicators };
  }, [plan, today]);
}
