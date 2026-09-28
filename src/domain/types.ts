/**
 * Domain model for the strategic plan.
 *
 *   Objective 1──* Initiative
 *   Objective 1──* Indicator 1──* Measurement
 *
 * Dates are ISO strings (`YYYY-MM-DD`) and measurement periods are `YYYY-MM`,
 * which keeps the data JSON-friendly (localStorage, SharePoint, REST) and
 * avoids time-zone surprises.
 */

export type ID = string;

/** Balanced-scorecard perspective an objective belongs to. */
export type Perspective = 'financial' | 'customer' | 'process' | 'learning';

export interface Objective {
  id: ID;
  code: string;
  title: string;
  description: string;
  perspective: Perspective;
  owner: string;
}

/** Workflow status, set by the initiative owner. */
export type InitiativeStatus = 'planned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';

export interface Initiative {
  id: ID;
  objectiveId: ID;
  code: string;
  title: string;
  description: string;
  owner: string;
  status: InitiativeStatus;
  /** ISO date `YYYY-MM-DD`. */
  startDate: string;
  /** ISO date `YYYY-MM-DD`, inclusive. */
  endDate: string;
  budget: number;
  spent: number;
  /** Physical progress reported by the owner, 0–100. */
  progress: number;
}

/** Health is *derived* from status, schedule, progress and budget — never stored. */
export type Health = 'not_started' | 'on_track' | 'at_risk' | 'late' | 'done' | 'cancelled';

export type Polarity = 'higher_is_better' | 'lower_is_better';
export type Frequency = 'monthly' | 'quarterly';

export interface Indicator {
  id: ID;
  objectiveId: ID;
  code: string;
  name: string;
  unit: string;
  polarity: Polarity;
  baseline: number;
  target: number;
  frequency: Frequency;
}

export interface Measurement {
  id: ID;
  indicatorId: ID;
  /** Reference period `YYYY-MM`. One measurement per indicator per period. */
  period: string;
  value: number;
  note?: string;
}

export type IndicatorStatus = 'no_data' | 'achieved' | 'on_track' | 'attention' | 'critical';
export type Trend = 'improving' | 'worsening' | 'flat' | 'unknown';

export interface PlanData {
  version: 1;
  objectives: Objective[];
  initiatives: Initiative[];
  indicators: Indicator[];
  measurements: Measurement[];
}
