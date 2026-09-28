# SharePoint data model

How the Strategy Planner domain maps to SharePoint Online lists for a Power Apps
canvas app. Names use a `SP_` prefix for lists and PascalCase internal column
names (no spaces — avoids `_x0020_` encoding in formulas and flows).

```
SP_Objectives 1──* SP_Initiatives
SP_Objectives 1──* SP_Indicators 1──* SP_Measurements
```

> Create columns **with their internal name first** (e.g. `ObjectiveCode`), then
> rename the display name. The internal name is permanent and is what Power Fx,
> Power Automate and the REST API use.

---

## SP_Objectives

| Column (internal) | Type                        | Required | Notes                                                               |
| ----------------- | --------------------------- | -------- | ------------------------------------------------------------------- |
| `Title`           | Single line of text         | Yes      | Objective statement (built-in column, max 255).                     |
| `ObjectiveCode`   | Single line of text         | Yes      | `OBJ-1`. **Enforce unique values** (requires index).                |
| `Description`     | Multiple lines (plain text) | No       | Plain text keeps it delegable-friendly and easy to render.          |
| `Perspective`     | Choice                      | Yes      | `Financial`, `Customer`, `Internal processes`, `Learning & growth`. |
| `OwnerPerson`     | Person or Group             | Yes      | People only, single value.                                          |
| `SortOrder`       | Number                      | No       | Manual ordering on the strategy map.                                |
| `IsActive`        | Yes/No                      | Yes      | Default `Yes`. Soft delete instead of physical delete.              |

**Indexes:** `ObjectiveCode` (unique), `Perspective`, `IsActive`.

## SP_Initiatives

| Column (internal) | Type                               | Required | Notes                                                                                                                                                                             |
| ----------------- | ---------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Title`           | Single line of text                | Yes      | Initiative name.                                                                                                                                                                  |
| `InitiativeCode`  | Single line of text                | Yes      | `INI-12`. Unique, indexed.                                                                                                                                                        |
| `Objective`       | Lookup → `SP_Objectives` (`Title`) | Yes      | Add projected field `ObjectiveCode`. **Enforce relationship: restrict delete.**                                                                                                   |
| `ObjectiveIdNum`  | Number                             | Yes      | Copy of the lookup ID, written by the app/flow. Makes filtering delegable with `=` on a number column.                                                                            |
| `OwnerPerson`     | Person or Group                    | Yes      |                                                                                                                                                                                   |
| `WorkflowStatus`  | Choice                             | Yes      | `Planned`, `In progress`, `On hold`, `Completed`, `Cancelled`.                                                                                                                    |
| `StartDate`       | Date only                          | Yes      | Date-only avoids time-zone drift.                                                                                                                                                 |
| `EndDate`         | Date only                          | Yes      | Validation: `=[EndDate]>=[StartDate]` (list validation).                                                                                                                          |
| `Budget`          | Currency                           | Yes      | Min 0 (column validation).                                                                                                                                                        |
| `Spent`           | Currency                           | Yes      | Min 0. Usually fed by a finance integration flow.                                                                                                                                 |
| `ProgressPct`     | Number (0–100, 0 decimals)         | Yes      | Column min/max 0/100.                                                                                                                                                             |
| `HealthCached`    | Choice                             | No       | `Not started`, `On track`, `At risk`, `Late`, `Done`, `Cancelled`. **Computed by a scheduled flow** so Power BI and views can filter by health without re-implementing the rules. |
| `HealthReasons`   | Multiple lines (plain text)        | No       | Written together with `HealthCached`.                                                                                                                                             |
| `Description`     | Multiple lines (plain text)        | No       |                                                                                                                                                                                   |
| `IsActive`        | Yes/No                             | Yes      | Soft delete.                                                                                                                                                                      |

**List validation formula** (status/progress consistency, mirrors `validateInitiative`):

```
=AND(
  [EndDate]>=[StartDate],
  IF([WorkflowStatus]="Completed",[ProgressPct]=100,TRUE),
  IF([WorkflowStatus]="Planned",[ProgressPct]=0,TRUE)
)
```

**Indexes:** `InitiativeCode` (unique), `ObjectiveIdNum`, `WorkflowStatus`,
`EndDate`, `HealthCached`, `IsActive`.

## SP_Indicators

| Column (internal) | Type                     | Required | Notes                                                                                                                |
| ----------------- | ------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `Title`           | Single line of text      | Yes      | Indicator name.                                                                                                      |
| `IndicatorCode`   | Single line of text      | Yes      | `KPI-3`. Unique, indexed.                                                                                            |
| `Objective`       | Lookup → `SP_Objectives` | Yes      | Restrict delete.                                                                                                     |
| `ObjectiveIdNum`  | Number                   | Yes      | Delegable filter key (see above).                                                                                    |
| `Unit`            | Single line of text      | Yes      | `%`, `USD`, `hours`, `pts`…                                                                                          |
| `Polarity`        | Choice                   | Yes      | `Higher is better`, `Lower is better`.                                                                               |
| `Baseline`        | Number (4 decimals)      | Yes      |                                                                                                                      |
| `Target`          | Number (4 decimals)      | Yes      | Polarity check lives in the app + list validation.                                                                   |
| `Frequency`       | Choice                   | Yes      | `Monthly`, `Quarterly`.                                                                                              |
| `LatestValue`     | Number                   | No       | Denormalized by a flow on measurement create/update — lets galleries show the latest value without a per-row lookup. |
| `LatestPeriod`    | Single line of text      | No       | `YYYY-MM`.                                                                                                           |
| `IsActive`        | Yes/No                   | Yes      |                                                                                                                      |

**List validation:**

```
=IF([Polarity]="Higher is better",[Target]>[Baseline],[Target]<[Baseline])
```

## SP_Measurements

| Column (internal) | Type                     | Required | Notes                                                         |
| ----------------- | ------------------------ | -------- | ------------------------------------------------------------- |
| `Title`           | Single line of text      | Yes      | Composite key `KPI-3                                          | 2026-08`, written by the app. **Enforce unique values** → one value per indicator and period (same rule as the reducer). |
| `Indicator`       | Lookup → `SP_Indicators` | Yes      | Restrict delete (or cascade, if history may go).              |
| `IndicatorIdNum`  | Number                   | Yes      | Delegable filter key.                                         |
| `Period`          | Single line of text      | Yes      | `YYYY-MM`. Sortable as text, indexed.                         |
| `PeriodDate`      | Date only                | Yes      | First day of the period, for date-range filters and Power BI. |
| `MeasuredValue`   | Number (4 decimals)      | Yes      |                                                               |
| `Note`            | Single line of text      | No       | Max 200.                                                      |

**Indexes:** `Title` (unique), `IndicatorIdNum`, `PeriodDate`.

---

## Delegation notes

SharePoint delegates a limited set of operations. Anything not delegable is
evaluated on the first **500–2 000 rows only** (the app's data row limit), which
silently produces wrong results on large lists.

| Need                                            | Delegable?                                | Approach used                                                                           |
| ----------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------- |
| `Filter` by number/text/choice/boolean with `=` | Yes                                       | Primary pattern (`ObjectiveIdNum = …`, `IsActive = true`).                              |
| `Filter` with `<`, `>` on numbers and dates     | Yes                                       | Date ranges on `EndDate`, `PeriodDate`.                                                 |
| `StartsWith` on text                            | Yes                                       | Search box uses `StartsWith(Title, …)` / `StartsWith(InitiativeCode, …)`.               |
| `Search()` / `in` (substring)                   | **No**                                    | Only used over locally cached collections (small lists) — never directly on SharePoint. |
| Lookup column `.Id` / `.Value` in `Filter`      | Partial / fragile                         | Replaced by the `…IdNum` number copies.                                                 |
| Person column filters                           | **No** (except `.Email` in limited cases) | Filter by owner over a cached collection, or store `OwnerEmail` as text.                |
| `Sum`, `Average`, `CountRows` over the list     | **No**                                    | Roll-ups run over cached collections or are pre-computed by flows.                      |
| `SortByColumns` on indexed simple columns       | Yes                                       | Galleries sort server-side.                                                             |

**Rules of thumb applied here**

1. Index every column used in a delegable filter (required beyond 5 000 items — the list view threshold).
2. Denormalize for reads: `ObjectiveIdNum`, `LatestValue`, `HealthCached`.
3. Keep business rules in one place per layer: list validation for hard
   invariants, Power Fx for UX feedback, a scheduled Power Automate flow for
   derived fields (health), Power BI for analytics.
4. Soft-delete with `IsActive` so history (and Power BI) never loses rows.

## Permissions

| Group                    | SP_Objectives | SP_Initiatives | SP_Indicators | SP_Measurements |
| ------------------------ | ------------- | -------------- | ------------- | --------------- |
| Strategy Office (admins) | Full control  | Full control   | Full control  | Full control    |
| Initiative owners        | Read          | Contribute     | Read          | Read            |
| Indicator stewards       | Read          | Read           | Read          | Contribute      |
| Everyone else            | Read          | Read           | Read          | Read            |

Row-level restrictions ("owners edit only their own initiatives") are enforced in
the app UI (see `powerfx-snippets.md`) **and** by a flow that rejects/reverts
unauthorized edits, because SharePoint item-level permissions do not scale well.
