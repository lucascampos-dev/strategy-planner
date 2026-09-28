import { useState, type FormEvent } from 'react';
import { FREQUENCY_LABEL, POLARITY_LABEL } from '../../domain/format';
import type { Frequency, Indicator, Polarity } from '../../domain/types';
import { isValid, parseNumber, validateIndicator, type Errors } from '../../domain/validation';
import { newId, nextCode } from '../../state/reducer';
import { usePlan } from '../../state/usePlan';
import { Field } from '../Field';
import { Modal } from '../Modal';

interface Props {
  indicator: Indicator | null;
  onClose: () => void;
  onSaved?: (indicator: Indicator) => void;
}

type Draft = Omit<Indicator, 'baseline' | 'target'> & { baseline: string; target: string };

export function IndicatorForm({ indicator, onClose, onSaved }: Props) {
  const { plan, dispatch } = usePlan();
  const [errors, setErrors] = useState<Errors<Indicator>>({});
  const [draft, setDraft] = useState<Draft>(() =>
    indicator
      ? { ...indicator, baseline: String(indicator.baseline), target: String(indicator.target) }
      : {
          id: newId('kpi'),
          code: nextCode('KPI', plan.indicators),
          objectiveId: plan.objectives[0]?.id ?? '',
          name: '',
          unit: '%',
          polarity: 'higher_is_better',
          baseline: '',
          target: '',
          frequency: 'monthly',
        },
  );

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const candidate: Indicator = {
      ...draft,
      code: draft.code.trim().toUpperCase(),
      name: draft.name.trim(),
      unit: draft.unit.trim(),
      baseline: parseNumber(draft.baseline),
      target: parseNumber(draft.target),
    };
    const result = validateIndicator(
      candidate,
      plan.indicators,
      plan.objectives.map((o) => o.id),
    );
    setErrors(result);
    if (!isValid(result)) return;
    dispatch({ type: 'indicator/upsert', payload: candidate });
    onSaved?.(candidate);
    onClose();
  };

  return (
    <Modal
      title={indicator ? `Edit ${indicator.code}` : 'New indicator'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="indicator-form" className="btn btn-primary">
            {indicator ? 'Save changes' : 'Create indicator'}
          </button>
        </>
      }
    >
      <form id="indicator-form" className="form" onSubmit={onSubmit} noValidate>
        <Field label="Name" error={errors.name} full>
          <input
            className="input"
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
          />
        </Field>
        <Field label="Code" error={errors.code}>
          <input
            className="input"
            value={draft.code}
            onChange={(e) => set('code', e.target.value)}
          />
        </Field>
        <Field label="Objective" error={errors.objectiveId}>
          <select
            className="select"
            value={draft.objectiveId}
            onChange={(e) => set('objectiveId', e.target.value)}
          >
            <option value="">Select…</option>
            {plan.objectives.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code} — {o.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Polarity" hint="Direction that counts as improvement">
          <select
            className="select"
            value={draft.polarity}
            onChange={(e) => set('polarity', e.target.value as Polarity)}
          >
            {(Object.keys(POLARITY_LABEL) as Polarity[]).map((p) => (
              <option key={p} value={p}>
                {POLARITY_LABEL[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Frequency">
          <select
            className="select"
            value={draft.frequency}
            onChange={(e) => set('frequency', e.target.value as Frequency)}
          >
            {(Object.keys(FREQUENCY_LABEL) as Frequency[]).map((f) => (
              <option key={f} value={f}>
                {FREQUENCY_LABEL[f]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Baseline" error={errors.baseline}>
          <input
            className="input"
            inputMode="decimal"
            value={draft.baseline}
            onChange={(e) => set('baseline', e.target.value)}
          />
        </Field>
        <Field label="Target" error={errors.target}>
          <input
            className="input"
            inputMode="decimal"
            value={draft.target}
            onChange={(e) => set('target', e.target.value)}
          />
        </Field>
        <Field label="Unit" error={errors.unit} hint="e.g. %, USD, hours, pts">
          <input
            className="input"
            value={draft.unit}
            onChange={(e) => set('unit', e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}
