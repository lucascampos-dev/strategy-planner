/**
 * Form validation rules. Each validator returns a map of field → message;
 * an empty object means the entity is valid. Numbers arrive as `number`
 * (NaN when the input was blank or not numeric).
 */
import { isIsoDate, isIsoPeriod } from './dates';
import type { Indicator, Initiative, Measurement, Objective } from './types';

export type Errors<T> = Partial<Record<keyof T, string>>;

export const isValid = <T>(errors: Errors<T>): boolean => Object.keys(errors).length === 0;

const CODE_PATTERN = /^[A-Z]{2,5}-\d{1,4}$/;

function requireText(value: string, label: string, min = 1, max = 160): string | undefined {
  const v = value.trim();
  if (v.length === 0) return `${label} is required`;
  if (v.length < min) return `${label} must have at least ${min} characters`;
  if (v.length > max) return `${label} must have at most ${max} characters`;
  return undefined;
}

function validateCode<T extends { id: string; code: string }>(
  entity: T,
  siblings: T[],
): string | undefined {
  const code = entity.code.trim().toUpperCase();
  if (!code) return 'Code is required';
  if (!CODE_PATTERN.test(code)) return 'Use the format ABC-12';
  if (siblings.some((s) => s.id !== entity.id && s.code.toUpperCase() === code)) {
    return `Code ${code} is already in use`;
  }
  return undefined;
}

function assign<T>(errors: Errors<T>, field: keyof T, message: string | undefined) {
  if (message) errors[field] = message;
}

export function validateObjective(objective: Objective, all: Objective[]): Errors<Objective> {
  const errors: Errors<Objective> = {};
  assign(errors, 'code', validateCode(objective, all));
  assign(errors, 'title', requireText(objective.title, 'Title', 5, 120));
  assign(errors, 'owner', requireText(objective.owner, 'Owner', 2, 80));
  assign(
    errors,
    'description',
    objective.description.length > 600 ? 'Keep it under 600 characters' : undefined,
  );
  return errors;
}

export function validateInitiative(
  initiative: Initiative,
  all: Initiative[],
  objectiveIds: string[],
): Errors<Initiative> {
  const errors: Errors<Initiative> = {};
  assign(errors, 'code', validateCode(initiative, all));
  assign(errors, 'title', requireText(initiative.title, 'Title', 5, 120));
  assign(errors, 'owner', requireText(initiative.owner, 'Owner', 2, 80));

  if (!objectiveIds.includes(initiative.objectiveId)) {
    errors.objectiveId = 'Choose an objective';
  }

  if (!isIsoDate(initiative.startDate)) errors.startDate = 'Enter a valid start date';
  if (!isIsoDate(initiative.endDate)) errors.endDate = 'Enter a valid end date';
  if (!errors.startDate && !errors.endDate && initiative.endDate < initiative.startDate) {
    errors.endDate = 'End date must be on or after the start date';
  }

  if (!Number.isFinite(initiative.budget)) errors.budget = 'Budget must be a number';
  else if (initiative.budget < 0) errors.budget = 'Budget cannot be negative';

  if (!Number.isFinite(initiative.spent)) errors.spent = 'Spent must be a number';
  else if (initiative.spent < 0) errors.spent = 'Spent cannot be negative';

  if (!Number.isFinite(initiative.progress)) errors.progress = 'Progress must be a number';
  else if (initiative.progress < 0 || initiative.progress > 100) {
    errors.progress = 'Progress must be between 0 and 100';
  } else if (initiative.status === 'completed' && initiative.progress !== 100) {
    errors.progress = 'A completed initiative must be at 100%';
  } else if (initiative.status === 'planned' && initiative.progress > 0) {
    errors.progress = 'A planned initiative cannot report progress yet';
  }

  return errors;
}

export function validateIndicator(
  indicator: Indicator,
  all: Indicator[],
  objectiveIds: string[],
): Errors<Indicator> {
  const errors: Errors<Indicator> = {};
  assign(errors, 'code', validateCode(indicator, all));
  assign(errors, 'name', requireText(indicator.name, 'Name', 3, 120));
  assign(errors, 'unit', requireText(indicator.unit, 'Unit', 1, 20));
  if (!objectiveIds.includes(indicator.objectiveId)) errors.objectiveId = 'Choose an objective';

  if (!Number.isFinite(indicator.baseline)) errors.baseline = 'Baseline must be a number';
  if (!Number.isFinite(indicator.target)) errors.target = 'Target must be a number';

  if (!errors.baseline && !errors.target) {
    if (indicator.polarity === 'higher_is_better' && indicator.target <= indicator.baseline) {
      errors.target = 'For "higher is better" the target must be above the baseline';
    }
    if (indicator.polarity === 'lower_is_better' && indicator.target >= indicator.baseline) {
      errors.target = 'For "lower is better" the target must be below the baseline';
    }
  }
  return errors;
}

export function validateMeasurement(measurement: Measurement): Errors<Measurement> {
  const errors: Errors<Measurement> = {};
  if (!isIsoPeriod(measurement.period)) errors.period = 'Use the format YYYY-MM';
  if (!Number.isFinite(measurement.value)) errors.value = 'Value must be a number';
  if (measurement.note && measurement.note.length > 200)
    errors.note = 'Keep notes under 200 characters';
  return errors;
}

/** Parses a form input into a number; blank → NaN (so "required" is enforced). */
export function parseNumber(input: string): number {
  const trimmed = input.trim().replace(',', '.');
  return trimmed === '' ? Number.NaN : Number(trimmed);
}
