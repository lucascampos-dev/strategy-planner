import { useState, type FormEvent } from 'react';
import { addDays, monthEnd } from '../../domain/dates';
import { STATUS_LABEL } from '../../domain/format';
import type { Initiative, InitiativeStatus } from '../../domain/types';
import { isValid, parseNumber, validateInitiative, type Errors } from '../../domain/validation';
import { newId, nextCode } from '../../state/reducer';
import { usePlan } from '../../state/usePlan';
import { Field } from '../Field';
import { Modal } from '../Modal';

interface Props {
  initiative: Initiative | null;
  defaultObjectiveId?: string;
  onClose: () => void;
  onSaved?: (initiative: Initiative) => void;
}

type Draft = Omit<Initiative, 'budget' | 'spent' | 'progress'> & {
  budget: string;
  spent: string;
  progress: string;
};

const STATUSES = Object.keys(STATUS_LABEL) as InitiativeStatus[];

export function InitiativeForm({ initiative, defaultObjectiveId, onClose, onSaved }: Props) {
  const { plan, dispatch, today } = usePlan();
  const [errors, setErrors] = useState<Errors<Initiative>>({});
  const [draft, setDraft] = useState<Draft>(() =>
    initiative
      ? {
          ...initiative,
          budget: String(initiative.budget),
          spent: String(initiative.spent),
          progress: String(initiative.progress),
        }
      : {
          id: newId('ini'),
          code: nextCode('INI', plan.initiatives),
          objectiveId: defaultObjectiveId ?? plan.objectives[0]?.id ?? '',
          title: '',
          description: '',
          owner: '',
          status: 'planned',
          startDate: addDays(today, 1),
          endDate: monthEnd(today, 6),
          budget: '',
          spent: '0',
          progress: '0',
        },
  );

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const candidate: Initiative = {
      ...draft,
      code: draft.code.trim().toUpperCase(),
      title: draft.title.trim(),
      owner: draft.owner.trim(),
      description: draft.description.trim(),
      budget: parseNumber(draft.budget),
      spent: parseNumber(draft.spent),
      progress: parseNumber(draft.progress),
    };
    const result = validateInitiative(
      candidate,
      plan.initiatives,
      plan.objectives.map((o) => o.id),
    );
    setErrors(result);
    if (!isValid(result)) return;
    dispatch({ type: 'initiative/upsert', payload: candidate });
    onSaved?.(candidate);
    onClose();
  };

  const errorCount = Object.keys(errors).length;

  return (
    <Modal
      title={initiative ? `Edit ${initiative.code}` : 'New initiative'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="initiative-form" className="btn btn-primary">
            {initiative ? 'Save changes' : 'Create initiative'}
          </button>
        </>
      }
    >
      <form id="initiative-form" className="form" onSubmit={onSubmit} noValidate>
        {errorCount > 0 && (
          <div className="form-error-summary" role="alert">
            Please fix {errorCount} field{errorCount === 1 ? '' : 's'} below.
          </div>
        )}
        <Field label="Title" error={errors.title} full>
          <input
            className="input"
            value={draft.title}
            onChange={(e) => set('title', e.target.value)}
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
        <Field label="Owner" error={errors.owner}>
          <input
            className="input"
            value={draft.owner}
            onChange={(e) => set('owner', e.target.value)}
          />
        </Field>
        <Field label="Status" error={errors.status}>
          <select
            className="select"
            value={draft.status}
            onChange={(e) => {
              const status = e.target.value as InitiativeStatus;
              setDraft((d) => ({
                ...d,
                status,
                // Helpful defaults that keep the status rules satisfied.
                progress: status === 'completed' ? '100' : status === 'planned' ? '0' : d.progress,
              }));
            }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Start date" error={errors.startDate}>
          <input
            type="date"
            className="input"
            value={draft.startDate}
            onChange={(e) => set('startDate', e.target.value)}
          />
        </Field>
        <Field label="End date" error={errors.endDate}>
          <input
            type="date"
            className="input"
            value={draft.endDate}
            onChange={(e) => set('endDate', e.target.value)}
          />
        </Field>
        <Field label="Budget (USD)" error={errors.budget}>
          <input
            className="input"
            inputMode="decimal"
            value={draft.budget}
            onChange={(e) => set('budget', e.target.value)}
          />
        </Field>
        <Field label="Spent to date (USD)" error={errors.spent}>
          <input
            className="input"
            inputMode="decimal"
            value={draft.spent}
            onChange={(e) => set('spent', e.target.value)}
          />
        </Field>
        <Field
          label="Progress (%)"
          error={errors.progress}
          hint="Physical progress reported by the owner"
        >
          <input
            type="number"
            min={0}
            max={100}
            className="input"
            value={draft.progress}
            onChange={(e) => set('progress', e.target.value)}
          />
        </Field>
        <Field label="Description" error={errors.description} full>
          <textarea
            className="textarea"
            value={draft.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </Field>
      </form>
    </Modal>
  );
}
