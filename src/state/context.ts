import { createContext } from 'react';
import type { PlanData } from '../domain/types';
import type { Action } from './reducer';

export interface PlanContextValue {
  plan: PlanData;
  dispatch: (action: Action) => void;
  resetDemo: () => void;
  /** Reference date (ISO) for schedule and health rules. */
  today: string;
}

export const PlanContext = createContext<PlanContextValue | null>(null);
