import { useState, type FormEvent } from 'react';
import { PERSPECTIVE_LABEL } from '../../domain/format';
import type { Objective, Perspective } from '../../domain/types';
import { isValid, validateObjective, type Errors } from '../../domain/validation';
import { newId, nextCode } from '../../state/reducer';
import { usePlan } from '../../state/usePlan';
import { Field } from '../Field';
import { Modal } from '../Modal';

interface Props {
  objective: Objective | null;
  onClose: () => void;
}

const PERSPECTIVES = Object.keys(PERSPECTIVE_LABEL) as Perspective[];

export function ObjectiveForm({ objective, onClose }: Props) {
  const { plan, dispatch } = usePlan();
  const [errors, setErrors] = useState<Errors<Objective>>({});
  const [draft, setDraft] = useState<Objective>(
    () =>
      objective ?? {
        id: newId('obj'),
        code: nextCode('OBJ', plan.objectives),
        title: '',
        description: '',
        perspective: 'financial',
        owner: '',
      },
  );

  const set = <K extends keyof Objective>(key: K, value: Objective[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const candidate: Objective = {
      ...draft,
      code: draft.code.trim().toUpperCase(),
      title: draft.title.trim(),
      owner: draft.owner.trim(),
      description: draft.description.trim(),
    };
    const result = validateObjective(candidate, plan.objectives);
    setErrors(result);
    if (!isValid(result)) return;
    dispatch({ type: 'objective/upsert', payload: candidate });
    onClose();
  };

  return (
    <Modal
      title={objective ? `Edit ${objective.code}` : 'New objective'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="objective-form" className="btn btn-primary">
            {objective ? 'Save changes' : 'Create objective'}
          </button>
        </>
      }
    >
      <form id="objective-form" className="form" onSubmit={onSubmit} noValidate>
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
        <Field label="Perspective">
          <select
            className="select"
            value={draft.perspective}
            onChange={(e) => set('perspective', e.target.value as Perspective)}
          >
            {PERSPECTIVES.map((p) => (
              <option key={p} value={p}>
                {PERSPECTIVE_LABEL[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Owner" error={errors.owner} full>
          <input
            className="input"
            value={draft.owner}
            onChange={(e) => set('owner', e.target.value)}
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
