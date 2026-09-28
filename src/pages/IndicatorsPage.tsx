import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { IndicatorBadge, TrendTag } from '../components/Badges';
import { LineChart } from '../components/charts/LineChart';
import { Sparkline } from '../components/charts/Sparkline';
import { IndicatorForm } from '../components/forms/IndicatorForm';
import { MeasurementForm } from '../components/forms/MeasurementForm';
import { Icon } from '../components/Icon';
import { ConfirmDialog } from '../components/Modal';
import { EmptyState, PageHeader } from '../components/PageHeader';
import { ProgressBar } from '../components/ProgressBar';
import {
  FREQUENCY_LABEL,
  formatPeriod,
  formatValue,
  INDICATOR_STATUS_LABEL,
  POLARITY_LABEL,
} from '../domain/format';
import { seriesFor } from '../domain/logic';
import type { Indicator, IndicatorStatus, Measurement } from '../domain/types';
import { useDerived, usePlan, type IndicatorRow } from '../state/usePlan';

const STATUS_FILTERS: (IndicatorStatus | 'all')[] = [
  'all',
  'achieved',
  'on_track',
  'attention',
  'critical',
];

export function IndicatorsPage() {
  const { plan, dispatch } = usePlan();
  const { indicators } = useDerived();
  const [params, setParams] = useSearchParams();
  const [indicatorForm, setIndicatorForm] = useState<{ indicator: Indicator | null } | null>(null);
  const [measurementForm, setMeasurementForm] = useState<{
    measurement: Measurement | null;
  } | null>(null);
  const [deleting, setDeleting] = useState<Indicator | null>(null);

  const objective = params.get('objective') ?? 'all';
  const status = (params.get('status') ?? 'all') as IndicatorStatus | 'all';
  const q = params.get('q') ?? '';

  const update = (key: string, value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!value || value === 'all') next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return indicators.filter(
      (k) =>
        (objective === 'all' || k.objectiveId === objective) &&
        (status === 'all' || k.evaluation.status === status) &&
        (!needle || `${k.code} ${k.name} ${k.unit}`.toLowerCase().includes(needle)),
    );
  }, [indicators, objective, status, q]);

  const selectedId = params.get('id') ?? rows[0]?.id;
  const selected = indicators.find((k) => k.id === selectedId);

  return (
    <>
      <PageHeader
        eyebrow="Results"
        title="Indicators"
        subtitle="KPIs with baseline, target and polarity. Achievement = share of the baseline→target distance covered."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIndicatorForm({ indicator: null })}
          >
            <Icon name="plus" size={16} /> New indicator
          </button>
        }
      />

      <div className="split">
        <div className="card">
          <div className="toolbar" role="search">
            <label className="search">
              <span className="sr-only">Search indicators</span>
              <Icon name="search" size={16} />
              <input
                className="input"
                type="search"
                placeholder="Search indicators…"
                value={q}
                onChange={(e) => update('q', e.target.value)}
              />
            </label>
            <label>
              <span className="sr-only">Filter by objective</span>
              <select
                className="select"
                value={objective}
                onChange={(e) => update('objective', e.target.value)}
              >
                <option value="all">All objectives</option>
                {plan.objectives.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.code} — {o.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by status</span>
              <select
                className="select"
                value={status}
                onChange={(e) => update('status', e.target.value)}
              >
                {STATUS_FILTERS.map((s) => (
                  <option key={s} value={s}>
                    {s === 'all' ? 'Any status' : INDICATOR_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {rows.length === 0 ? (
            <EmptyState title="No indicators match these filters" />
          ) : (
            <div className="table-wrap">
              <table className="table responsive">
                <thead>
                  <tr>
                    <th>Indicator</th>
                    <th className="num">Latest / target</th>
                    <th>Achievement</th>
                    <th>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((k) => (
                    <IndicatorTableRow
                      key={k.id}
                      row={k}
                      selected={k.id === selected?.id}
                      values={seriesFor(k.id, plan.measurements).map((m) => m.value)}
                      onSelect={() => update('id', k.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected ? (
          <aside className="card" aria-label={`${selected.name} details`}>
            <div className="card-header" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="row">
                  <span className="tag">{selected.code}</span>
                  <IndicatorBadge status={selected.evaluation.status} />
                </div>
                <h2 className="card-title" style={{ marginTop: 8 }}>
                  {selected.name}
                </h2>
                <p className="card-sub">
                  {POLARITY_LABEL[selected.polarity]} · {FREQUENCY_LABEL[selected.frequency]} ·{' '}
                  {selected.objective?.title}
                </p>
              </div>
              <div className="row" style={{ gap: 0 }}>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Edit ${selected.name}`}
                  onClick={() => setIndicatorForm({ indicator: selected })}
                >
                  <Icon name="edit" size={16} />
                </button>
                <button
                  type="button"
                  className="icon-btn danger"
                  aria-label={`Delete ${selected.name}`}
                  onClick={() => setDeleting(selected)}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            </div>
            <div className="card-body">
              <div className="detail-stats">
                <Stat label="Baseline" value={formatValue(selected.baseline, selected.unit)} />
                <Stat
                  label="Latest"
                  value={
                    selected.evaluation.latest
                      ? formatValue(selected.evaluation.latest.value, selected.unit)
                      : '—'
                  }
                />
                <Stat label="Target" value={formatValue(selected.target, selected.unit)} />
              </div>
              <LineChart
                series={seriesFor(selected.id, plan.measurements)}
                baseline={selected.baseline}
                target={selected.target}
                unit={selected.unit}
              />
              <div className="section-title">
                <span>Measurements</span>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => setMeasurementForm({ measurement: null })}
                >
                  <Icon name="plus" size={14} /> Record value
                </button>
              </div>
              <ul className="measure-list">
                {seriesFor(selected.id, plan.measurements)
                  .slice()
                  .reverse()
                  .map((m) => (
                    <li key={m.id}>
                      <span className="period">{formatPeriod(m.period)}</span>
                      <span className="value">{formatValue(m.value, selected.unit)}</span>
                      <span className="note" title={m.note}>
                        {m.note}
                      </span>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Edit ${formatPeriod(m.period)} value`}
                        onClick={() => setMeasurementForm({ measurement: m })}
                      >
                        <Icon name="edit" size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        aria-label={`Delete ${formatPeriod(m.period)} value`}
                        onClick={() => dispatch({ type: 'measurement/delete', id: m.id })}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          </aside>
        ) : (
          <div className="card">
            <EmptyState title="Select an indicator">
              Its history and measurements appear here.
            </EmptyState>
          </div>
        )}
      </div>

      {indicatorForm && (
        <IndicatorForm
          indicator={indicatorForm.indicator}
          onClose={() => setIndicatorForm(null)}
          onSaved={(k) => update('id', k.id)}
        />
      )}

      {measurementForm && selected && (
        <MeasurementForm
          indicator={selected}
          measurement={measurementForm.measurement}
          onClose={() => setMeasurementForm(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete indicator?"
          message={
            <>
              <b>{deleting.name}</b> and all of its measurements will be permanently removed.
            </>
          }
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            dispatch({ type: 'indicator/delete', id: deleting.id });
            update('id', null);
            setDeleting(null);
          }}
        />
      )}
    </>
  );
}

function IndicatorTableRow({
  row,
  selected,
  values,
  onSelect,
}: {
  row: IndicatorRow;
  selected: boolean;
  values: number[];
  onSelect: () => void;
}) {
  const { evaluation } = row;
  return (
    <tr
      className={`clickable ${selected ? 'selected' : ''}`}
      onClick={onSelect}
      aria-selected={selected}
    >
      <td className="primary" style={{ minWidth: 210 }}>
        <button
          type="button"
          className="link-btn"
          style={{ color: 'var(--ink)', fontSize: 14, textAlign: 'left' }}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {row.name}
        </button>
        <div className="cell-sub">
          <span className="tag">{row.code}</span> {row.objective?.code} ·{' '}
          {POLARITY_LABEL[row.polarity].toLowerCase()}
        </div>
      </td>
      <td data-label="Latest / target" className="num">
        <div className="cell-title">
          {evaluation.latest ? formatValue(evaluation.latest.value, row.unit) : '—'}
        </div>
        <div className="cell-sub">target {formatValue(row.target, row.unit)}</div>
      </td>
      <td data-label="Achievement" style={{ minWidth: 170 }}>
        <div className="stack" style={{ gap: 4 }}>
          <ProgressBar
            value={evaluation.achievement === null ? null : evaluation.achievement * 100}
            variant="results"
            label={`${row.name} achievement`}
          />
          <IndicatorBadge status={evaluation.status} />
        </div>
      </td>
      <td data-label="Trend">
        <div className="stack" style={{ gap: 2 }}>
          <Sparkline values={values} target={row.target} label={`${row.name} trend`} />
          <TrendTag trend={evaluation.trend} polarityUp={row.polarity === 'higher_is_better'} />
        </div>
      </td>
    </tr>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
