import type { PlanData } from '../domain/types';

export const STORAGE_KEY = 'strategy-planner:v1';

/** Minimal subset of the Web Storage API, injectable for tests. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function defaultStore(): KeyValueStore | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    // Accessing localStorage can throw (privacy mode, sandboxed iframes, blocked cookies).
    return null;
  }
}

function isPlanData(value: unknown): value is PlanData {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === 1 &&
    Array.isArray(v.objectives) &&
    Array.isArray(v.initiatives) &&
    Array.isArray(v.indicators) &&
    Array.isArray(v.measurements)
  );
}

/** Returns the persisted plan, or `null` when absent, unreadable or from an unknown schema. */
export function loadPlan(store: KeyValueStore | null = defaultStore()): PlanData | null {
  if (!store) return null;
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isPlanData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Persists the plan. Returns `false` instead of throwing when storage is unavailable or full. */
export function savePlan(plan: PlanData, store: KeyValueStore | null = defaultStore()): boolean {
  if (!store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(plan));
    return true;
  } catch {
    return false;
  }
}

export function clearPlan(store: KeyValueStore | null = defaultStore()): void {
  try {
    store?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
