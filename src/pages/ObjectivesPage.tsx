import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ObjectiveForm } from '../components/forms/ObjectiveForm';
import { Icon } from '../components/Icon';
import { ConfirmDialog } from '../components/Modal';
import { EmptyState, PageHeader } from '../components/PageHeader';
import { ProgressBar } from '../components/ProgressBar';
import { PERSPECTIVE_LABEL } from '../domain/format';
import { isAtRisk, objectiveProgress, rollUpAchievement } from '../domain/logic';
import type { Objective, Perspective } from '../domain/types';
import { useDerived, usePlan } from '../state/usePlan';

const PERSPECTIVE_COLOR: Record<Perspective, string> = {
  financial: '#0f9f8f',
  customer: '#4c5bd4',
  process: '#c2410c',
  learning: '#9333ea',
};

export function ObjectivesPage() {
  const { plan, dispatch } = usePlan();
  const { initiatives } = useDerived();
  const [filter, setFilter] = useState<Perspective | 'all'>('all');
  const [editing, setEditing] = useState<Objective | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Objective | null>(null);

  const visible = plan.objectives.filter((o) => filter === 'all' || o.perspective === filter);

  const deletingCounts = deleting && {
    initiatives: plan.initiatives.filter((i) => i.objectiveId === deleting.id).length,
    indicators: plan.indicators.filter((k) => k.objectiveId === deleting.id).length,
  };

  return (
    <>
      <PageHeader
        eyebrow="Strategy map"
        title="Objectives"
        subtitle="What the company wants to achieve, organized by balanced-scorecard perspective."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} /> New objective
          </button>
        }
      />

      <div
        className="chip-group"
        role="group"
        aria-label="Filter by perspective"
        style={{ marginBottom: 16 }}
      >
        {(['all', ...Object.keys(PERSPECTIVE_LABEL)] as (Perspective | 'all')[]).map((p) => (
          <button
            key={p}
            type="button"
            className="chip"
            aria-pressed={filter === p}
            onClick={() => setFilter(p)}
          >
            {p === 'all' ? 'All perspectives' : PERSPECTIVE_LABEL[p]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState title="No objectives here yet">
            Create one to start building the plan.
          </EmptyState>
        </div>
      ) : (
        <div className="grid card-grid">
          {visible.map((o) => {
            const own = initiatives.filter((i) => i.objectiveId === o.id);
            const indicators = plan.indicators.filter((k) => k.objectiveId === o.id);
            const execution = objectiveProgress(o.id, plan.initiatives);
            const results = rollUpAchievement(indicators, plan.measurements);
            const risky = own.filter((i) => isAtRisk(i.assessment.health)).length;
            return (
              <article key={o.id} className="card objective-card">
                <div className="objective-head">
                  <div>
                    <div className="row">
                      <span className="tag">{o.code}</span>
                      <span className="perspective-dot">
                        <span
                          className="swatch"
                          style={{
                            background: PERSPECTIVE_COLOR[o.perspective],
                            borderRadius: '50%',
                          }}
                        />
                        {PERSPECTIVE_LABEL[o.perspective]}
                      </span>
                    </div>
                    <h3>{o.title}</h3>
                  </div>
                  <div className="row" style={{ gap: 0 }}>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Edit ${o.title}`}
                      onClick={() => setEditing(o)}
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={`Delete ${o.title}`}
                      onClick={() => setDeleting(o)}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  {o.description && <p className="objective-desc">{o.description}</p>}
                  <div className="stack" style={{ gap: 8 }}>
                    <div className="metric-row">
                      <span>Execution</span>
                      <ProgressBar value={execution} label={`${o.title} execution`} />
                    </div>
                    <div className="metric-row">
                      <span>Results</span>
                      <ProgressBar
                        value={results === null ? null : results * 100}
                        variant="results"
                        label={`${o.title} results`}
                      />
                    </div>
                  </div>
                  <div className="objective-foot">
                    <span>Owner: {o.owner}</span>
                    <Link to={`/initiatives?objective=${o.id}`}>
                      {own.length} initiative{own.length === 1 ? '' : 's'}
                    </Link>
                    <Link to={`/indicators?objective=${o.id}`}>
                      {indicators.length} indicator{indicators.length === 1 ? '' : 's'}
                    </Link>
                    {risky > 0 && (
                      <span className="badge tone-warning">{risky} need attention</span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {(creating || editing) && (
        <ObjectiveForm
          objective={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      {deleting && deletingCounts && (
        <ConfirmDialog
          title="Delete objective?"
          message={
            <>
              <b>{deleting.title}</b> will be removed together with its {deletingCounts.initiatives}{' '}
              initiative(s), {deletingCounts.indicators} indicator(s) and their measurements.
            </>
          }
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            dispatch({ type: 'objective/delete', id: deleting.id });
            setDeleting(null);
          }}
        />
      )}
    </>
  );
}
