import { useState, type FormEvent } from 'react';
import { periodOf } from '../../domain/dates';
import type { Indicator, Measurement } from '../../domain/types';
import { isValid, parseNumber, validateMeasurement, type Errors } from '../../domain/validation';
import { newId } from '../../state/reducer';
import { usePlan } from '../../state/usePlan';
import { Field } from '../Field';
import { Modal } from '../Modal';

interface Props {
  indicator: Indicator;
  measurement: Measurement | null;
  onClose: () => void;
}

export function MeasurementForm({ indicator, measurement, onClose }: Props) {
  const { plan, dispatch, today } = usePlan();
  const [errors, setErrors] = useState<Errors<Measurement>>({});
  const [period, setPeriod] = useState(measurement?.period ?? periodOf(today, -1));
  const [value, setValue] = useState(measurement ? String(measurement.value) : '');
  const [note, setNote] = useState(measurement?.note ?? '');

  const replacing =
    !measurement &&
    plan.measurements.some((m) => m.indicatorId === indicator.id && m.period === period);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const candidate: Measurement = {
      id: measurement?.id ?? newId('m'),
      indicatorId: indicator.id,
      period,
      value: parseNumber(value),
      note: note.trim() || undefined,
    };
    const result = validateMeasurement(candidate);
    setErrors(result);
    if (!isValid(result)) return;
    dispatch({ type: 'measurement/upsert', payload: candidate });
    onClose();
  };

  return (
    <Modal
      title={measurement ? 'Edit measurement' : `Record ${indicator.code}`}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="measurement-form" className="btn btn-primary">
            Save
          </button>
        </>
      }
    >
      <form id="measurement-form" className="form" onSubmit={onSubmit} noValidate>
        <Field
          label="Period"
          error={errors.period}
          hint={replacing ? 'A value exists for this period and will be replaced' : undefined}
        >
          <input
            type="month"
            className="input"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </Field>
        <Field label={`Value (${indicator.unit})`} error={errors.value}>
          <input
            className="input"
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </Field>
        <Field label="Note (optional)" error={errors.note} full>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </form>
    </Modal>
  );
}
