import { describe, expect, it } from 'vitest';
import { createSeedData } from '../domain/seed';
import { STORAGE_KEY, loadPlan, savePlan, type KeyValueStore } from './storage';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const throwing: KeyValueStore = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
};

describe('storage', () => {
  it('round-trips a plan', () => {
    const store = memoryStore();
    const plan = createSeedData('2026-09-15');
    expect(savePlan(plan, store)).toBe(true);
    expect(loadPlan(store)).toEqual(plan);
  });

  it('returns null for missing, corrupted or foreign data', () => {
    const store = memoryStore();
    expect(loadPlan(store)).toBeNull();
    store.data.set(STORAGE_KEY, '{not json');
    expect(loadPlan(store)).toBeNull();
    store.data.set(STORAGE_KEY, JSON.stringify({ version: 2, objectives: [] }));
    expect(loadPlan(store)).toBeNull();
  });

  it('never throws when storage is unavailable', () => {
    expect(loadPlan(throwing)).toBeNull();
    expect(savePlan(createSeedData(), throwing)).toBe(false);
    expect(loadPlan(null)).toBeNull();
    expect(savePlan(createSeedData(), null)).toBe(false);
  });
});
