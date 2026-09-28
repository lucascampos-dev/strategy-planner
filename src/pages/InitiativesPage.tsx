import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HealthBadge, StatusText } from '../components/Badges';
import { InitiativeForm } from '../components/forms/InitiativeForm';
import { Icon } from '../components/Icon';
import { ConfirmDialog } from '../components/Modal';
import { EmptyState, PageHeader } from '../components/PageHeader';
import { ProgressBar } from '../components/ProgressBar';
import { formatCompactCurrency, formatDate } from '../domain/format';
import { isAtRisk } from '../domain/logic';
import type { Health, Initiative } from '../domain/types';
import { useDerived, usePlan, type InitiativeRow } from '../state/usePlan';

type HealthFilter = 'all' | 'attention' | Health;
type SortKey = 'title' | 'owner' | 'health' | 'progress' | 'budget' | 'endDate';

const HEALTH_FILTERS: { value: HealthFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'on_track', label: 'On track' },
  { value: 'attention', label: 'Needs attention' },
  { value: 'not_started', label: 'Not started' },
  { value: 'done', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

const HEALTH_RANK: Record<Health, number> = {
  late: 0,
  at_risk: 1,
  on_track: 2,
  not_started: 3,
  done: 4,
  cancelled: 5,
};

function matchesHealth(row: InitiativeRow, filter: HealthFilter) {
  if (filter === 'all') return true;
  if (filter === 'attention') return isAtRisk(row.assessment.health);
  return row.assessment.health === filter;
}

export function InitiativesPage() {
  const { plan, dispatch } = usePlan();
  const { initiatives } = useDerived();
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState<Initiative | null>(null);
  const [deleting, setDeleting] = useState<Initiative | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'health', dir: 1 });

  const q = params.get('q') ?? '';
  const objective = params.get('objective') ?? 'all';
  const health = (params.get('health') ?? 'all') as HealthFilter;
  const creating = params.get('new') === '1';

  const update = (key: string, value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === null || value === '' || value === 'all') next.delete(key);
        else next.set(key, value);
        return next;
      },
      { replace: true },
    );

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = initiatives.filter(
      (i) =>
        (objective === 'all' || i.objectiveId === objective) &&
        matchesHealth(i, health) &&
        (!needle ||
          [i.title, i.code, i.owner, i.description, i.objective?.title ?? '']
            .join(' ')
            .toLowerCase()
            .includes(needle)),
    );
    const value = (r: InitiativeRow): string | number => {
      switch (sort.key) {
        case 'title':
          return r.title.toLowerCase();
        case 'owner':
          return r.owner.toLowerCase();
        case 'health':
          return HEALTH_RANK[r.assessment.health];
        case 'progress':
          return r.progress;
        case 'budget':
          return r.budget;
        case 'endDate':
          return r.endDate;
      }
    };
    return filtered.sort((a, b) => {
      const va = value(a);
      const vb = value(b);
      return (
        (va < vb ? -1 : va > vb ? 1 : a.code.localeCompare(b.code, undefined, { numeric: true })) *
        sort.dir
      );
    });
  }, [initiatives, q, objective, health, sort]);

  const filtersActive = q !== '' || objective !== 'all' || health !== 'all';

  const header = (key: SortKey, label: string, className?: string) => (
    <th
      className={className}
      aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : undefined}
    >
      <button
        type="button"
        onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}
      >
        {label}
        <Icon name="sort" size={12} strokeWidth={2.5} />
      </button>
    </th>
  );

  return (
    <>
      <PageHeader
        eyebrow="Portfolio"
        title="Initiatives"
        subtitle="Projects and programs that execute the strategy. Health is derived from schedule, progress and budget."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => update('new', '1')}>
            <Icon name="plus" size={16} /> New initiative
          </button>
        }
      />

      <div className="card">
        <div className="toolbar" role="search">
          <label className="search">
            <span className="sr-only">Search initiatives</span>
            <Icon name="search" size={16} />
            <input
              className="input"
              type="search"
              placeholder="Search title, code, owner…"
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
          <div className="chip-group" role="group" aria-label="Filter by health">
            {HEALTH_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                className="chip"
                aria-pressed={health === f.value}
                onClick={() => update('health', f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="toolbar-meta">
            {rows.length} of {initiatives.length}
            {filtersActive && (
              <>
                {' · '}
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => setParams({}, { replace: true })}
                >
                  Clear filters
                </button>
              </>
            )}
          </span>
        </div>

        {rows.length === 0 ? (
          <EmptyState title="No initiatives match these filters">
            {filtersActive
              ? 'Try clearing the search or filters.'
              : 'Create the first initiative to get started.'}
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead>
                <tr>
                  {header('title', 'Initiative')}
                  {header('owner', 'Owner')}
                  {header('health', 'Health')}
                  {header('progress', 'Progress')}
                  {header('budget', 'Budget', 'num')}
                  {header('endDate', 'Schedule')}
                  <th className="actions">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => (
                  <tr key={i.id}>
                    <td className="primary">
                      <div className="cell-title">{i.title}</div>
                      <div className="cell-sub">
                        <span className="tag">{i.code}</span> {i.objective?.title ?? 'Unassigned'}
                      </div>
                    </td>
                    <td data-label="Owner" className="cell-muted">
                      {i.owner}
                    </td>
                    <td data-label="Health">
                      <div>
                        <HealthBadge health={i.assessment.health} />
                        <div className="cell-sub">
                          <StatusText status={i.status} />
                        </div>
                      </div>
                    </td>
                    <td data-label="Progress" style={{ minWidth: 180 }}>
                      <ProgressBar
                        value={i.progress}
                        expected={
                          i.assessment.health === 'done' || i.assessment.health === 'cancelled'
                            ? undefined
                            : i.assessment.expected
                        }
                        label={`${i.title} progress`}
                      />
                    </td>
                    <td data-label="Budget" className="num">
                      <div className="cell-title">{formatCompactCurrency(i.budget)}</div>
                      <div className="cell-sub">{Math.round(i.assessment.burn)}% spent</div>
                    </td>
                    <td data-label="Schedule" className="cell-muted">
                      <div>{formatDate(i.startDate)}</div>
                      <div className="cell-sub">→ {formatDate(i.endDate)}</div>
                    </td>
                    <td className="actions">
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Edit ${i.title}`}
                        onClick={() => setEditing(i)}
                      >
                        <Icon name="edit" size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        aria-label={`Delete ${i.title}`}
                        onClick={() => setDeleting(i)}
                      >
                        <Icon name="trash" size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="muted" style={{ marginTop: 12, fontSize: 12.5 }}>
        The dark tick on each progress bar marks the progress expected by today on a linear
        schedule.
      </p>

      {(creating || editing) && (
        <InitiativeForm
          initiative={editing}
          defaultObjectiveId={objective !== 'all' ? objective : undefined}
          onClose={() => {
            setEditing(null);
            if (creating) update('new', null);
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete initiative?"
          message={
            <>
              <b>{deleting.title}</b> ({deleting.code}) will be permanently removed from the plan.
            </>
          }
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            dispatch({ type: 'initiative/delete', id: deleting.id });
            setDeleting(null);
          }}
        />
      )}
    </>
  );
}
