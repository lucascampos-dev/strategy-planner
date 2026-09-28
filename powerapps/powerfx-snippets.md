# Power Fx snippets

Realistic formulas for a canvas-app version of Strategy Planner on top of the
lists in [`sharepoint-schema.md`](./sharepoint-schema.md). Each snippet notes the
React counterpart in `src/` so both builds stay rule-for-rule equivalent.

Conventions: controls use prefixes (`gal`, `frm`, `txt`, `drp`, `dte`, `btn`,
`lbl`), collections start with `col`, variables with `gbl`/`loc`.

---

## 1. App start-up: named formulas + cached collections

Named formulas (App → `Formulas`) are lazy, recalculated automatically and never
stale — preferred over `Set()` in `App.OnStart` for constants and derived values.

```powerfx
// App.Formulas
nfToday = Today();
nfMe = User();
nfIsAdmin = !IsBlank(
    LookUp(SP_Admins, Email = nfMe.Email)      // small config list
);
nfScheduleTolerance = 15;                       // RULES.scheduleTolerance
nfBurnTolerance = 25;                           // RULES.burnTolerance
```

Reference data is small and changes rarely, so it is cached once. Use
`Concurrent` to load lists in parallel:

```powerfx
// App.OnStart
Concurrent(
    ClearCollect(
        colObjectives,
        SortByColumns(Filter(SP_Objectives, IsActive = true), "ObjectiveCode")
    ),
    ClearCollect(
        colIndicators,
        Filter(SP_Indicators, IsActive = true)
    ),
    ClearCollect(
        colInitiatives,
        Filter(SP_Initiatives, IsActive = true)       // delegable: boolean equality
    )
);
// Measurements can grow large: only the last 13 months are cached.
ClearCollect(
    colMeasurements,
    Filter(SP_Measurements, PeriodDate >= EDate(nfToday, -13))   // delegable date filter
);
```

> Keep `App.OnStart` short — with "Delayed OnStart" disabled the first screen
> waits for it. Move screen-specific loads to `Screen.OnVisible`.

---

## 2. Delegable Filter / search on the Initiatives gallery

`Search()` and `in` are **not** delegable on SharePoint. The gallery queries the
list directly with delegable predicates only (`=`, `StartsWith`, date compares),
so it keeps working beyond 2 000 rows.

```powerfx
// galInitiatives.Items
SortByColumns(
    Filter(
        SP_Initiatives,
        IsActive = true,
        drpObjective.Selected.Value = "All" || ObjectiveIdNum = drpObjective.Selected.ID,
        IsBlank(drpHealth.Selected.Value) || HealthCached.Value = drpHealth.Selected.Value,
        IsBlank(txtSearch.Text)
            || StartsWith(Title, txtSearch.Text)
            || StartsWith(InitiativeCode, Upper(txtSearch.Text))
    ),
    locSortColumn,
    If(locSortAscending, SortOrder.Ascending, SortOrder.Descending)
)
```

When full-text "contains" search is a hard requirement, search the **cached**
collection instead (fine for hundreds of rows):

```powerfx
// galInitiatives.Items (small-list variant)
Search(
    Filter(colInitiatives, drpObjective.Selected.Value = "All" || ObjectiveIdNum = drpObjective.Selected.ID),
    txtSearch.Text,
    "Title", "InitiativeCode", "Description"
)
```

---

## 3. Patch with validation (create / edit initiative)

Mirrors `validateInitiative()` in `src/domain/validation.ts`. Errors are shown
next to fields and the Patch only runs when the form is valid. `IfError` surfaces
server-side failures (list validation, unique constraint, permissions).

```powerfx
// btnSave.OnSelect
With(
    {
        wStart: dteStart.SelectedDate,
        wEnd: dteEnd.SelectedDate,
        wBudget: Value(txtBudget.Text),
        wSpent: Value(txtSpent.Text),
        wProgress: Value(txtProgress.Text),
        wStatus: drpStatus.Selected.Value,
        wCode: Upper(Trim(txtCode.Text))
    },
    // 1) Collect validation errors (one record per field)
    ClearCollect(
        colErrors,
        Filter(
            Table(
                { Field: "Title",    Msg: If(Len(Trim(txtTitle.Text)) < 5, "Title must have at least 5 characters") },
                { Field: "Code",     Msg: If(
                        !IsMatch(wCode, "^[A-Z]{2,5}-\d{1,4}$"), "Use the format ABC-12",
                        !IsBlank(LookUp(colInitiatives, InitiativeCode = wCode && ID <> Coalesce(locEditing.ID, -1))),
                        "Code " & wCode & " is already in use") },
                { Field: "Owner",    Msg: If(IsBlank(ppOwner.Selected), "Owner is required") },
                { Field: "EndDate",  Msg: If(wEnd < wStart, "End date must be on or after the start date") },
                { Field: "Budget",   Msg: If(IsBlank(wBudget) || wBudget < 0, "Budget must be a positive number") },
                { Field: "Progress", Msg: If(
                        IsBlank(wProgress) || wProgress < 0 || wProgress > 100, "Progress must be between 0 and 100",
                        wStatus = "Completed" && wProgress <> 100, "A completed initiative must be at 100%",
                        wStatus = "Planned" && wProgress > 0, "A planned initiative cannot report progress yet") }
            ),
            !IsBlank(Msg)
        )
    );

    // 2) Save only when valid
    If(
        IsEmpty(colErrors),
        IfError(
            Set(
                locSaved,
                Patch(
                    SP_Initiatives,
                    Coalesce(locEditing, Defaults(SP_Initiatives)),
                    {
                        Title: Trim(txtTitle.Text),
                        InitiativeCode: wCode,
                        Objective: {
                            Id: drpObjectiveForm.Selected.ID,
                            Value: drpObjectiveForm.Selected.Title
                        },
                        ObjectiveIdNum: drpObjectiveForm.Selected.ID,
                        OwnerPerson: {
                            '@odata.type': "#Microsoft.Azure.Connectors.SharePoint.SPListExpandedUser",
                            Claims: "i:0#.f|membership|" & ppOwner.Selected.Mail,
                            Email: ppOwner.Selected.Mail,
                            DisplayName: ppOwner.Selected.DisplayName,
                            Department: "", JobTitle: "", Picture: ""
                        },
                        WorkflowStatus: { Value: wStatus },
                        StartDate: wStart,
                        EndDate: wEnd,
                        Budget: wBudget,
                        Spent: wSpent,
                        ProgressPct: wProgress,
                        Description: txtDescription.Text,
                        IsActive: true
                    }
                )
            );
            // keep the local cache in sync without reloading the whole list
            Patch(colInitiatives, Coalesce(LookUp(colInitiatives, ID = locSaved.ID), Defaults(colInitiatives)), locSaved);
            Notify("Initiative saved", NotificationType.Success);
            Back(),
            Notify("Could not save: " & FirstError.Message, NotificationType.Error)
        ),
        Notify(CountRows(colErrors) & " field(s) need attention", NotificationType.Warning)
    )
)
```

Field-level error label (e.g. under the progress input):

```powerfx
// lblProgressError.Text
LookUp(colErrors, Field = "Progress", Msg)
// lblProgressError.Visible
!IsBlank(Self.Text)
```

---

## 4. Health rules (status rules) as a reusable UDF

Mirrors `assessInitiative()` in `src/domain/logic.ts`. User-defined functions
(App → `Formulas`) keep the rule in one place for galleries, forms and the
timeline.

```powerfx
// App.Formulas
fnExpected(start: Date, finish: Date): Number =
    If(
        nfToday < start, 0,
        nfToday >= finish, 100,
        Round(DateDiff(start, nfToday, TimeUnit.Days) / Max(1, DateDiff(start, finish, TimeUnit.Days)) * 100, 1)
    );

fnHealth(status: Text, start: Date, finish: Date, progress: Number, budget: Number, spent: Number): Text =
    With(
        {
            wExpected: fnExpected(start, finish),
            wBurn: If(budget > 0, spent / budget * 100, If(spent > 0, 100, 0))
        },
        Switch(
            true,
            status = "Cancelled", "Cancelled",
            status = "Completed", "Done",
            nfToday > finish, "Late",
            status = "Planned" && nfToday < start, "Not started",
            status = "Planned", "At risk",
            status = "On hold", "At risk",
            wExpected - progress > nfScheduleTolerance, "At risk",
            wBurn - progress > nfBurnTolerance, "At risk",
            "On track"
        )
    );
```

Gallery badge:

```powerfx
// lblHealth.Text (inside galInitiatives)
fnHealth(ThisItem.WorkflowStatus.Value, ThisItem.StartDate, ThisItem.EndDate,
         ThisItem.ProgressPct, ThisItem.Budget, ThisItem.Spent)

// lblHealth.Fill
Switch(Self.Text,
    "On track", ColorValue("#E8F6E8"),
    "At risk",  ColorValue("#FFF6E0"),
    "Late",     ColorValue("#FDECEC"),
    "Done",     ColorValue("#ECEEFC"),
                ColorValue("#EEF1F5"))
```

---

## 5. Progress roll-up per objective (AddColumns + Sum)

Budget-weighted progress, excluding cancelled work — mirrors `rollUpProgress()`.
Runs over the cached collection (aggregates are not delegable on SharePoint).

```powerfx
// galObjectives.Items
AddColumns(
    colObjectives,
    ActiveInitiatives,
        Filter(colInitiatives, ObjectiveIdNum = ID, WorkflowStatus.Value <> "Cancelled"),
    Execution,
        With(
            { w: Filter(colInitiatives, ObjectiveIdNum = ID, WorkflowStatus.Value <> "Cancelled") },
            If(
                IsEmpty(w), Blank(),
                Sum(w, Budget) = 0, Average(w, ProgressPct),
                Sum(w, ProgressPct * Budget) / Sum(w, Budget)
            )
        ),
    AtRiskCount,
        CountIf(
            colInitiatives,
            ObjectiveIdNum = ID &&
            fnHealth(WorkflowStatus.Value, StartDate, EndDate, ProgressPct, Budget, Spent) in ["At risk", "Late"]
        )
)
```

Indicator achievement with polarity — mirrors `achievement()`:

```powerfx
// App.Formulas
fnAchievement(polarity: Text, baseline: Number, target: Number, value: Number): Number =
    If(
        baseline = target,
            If(If(polarity = "Higher is better", value >= target, value <= target), 1, 0),
        Max(0, Min(1,
            If(polarity = "Higher is better",
                (value - baseline) / (target - baseline),
                (baseline - value) / (baseline - target))
        ))
    );

// galIndicators.Items
AddColumns(
    colIndicators,
    Achievement,
        If(IsBlank(LatestValue), Blank(), fnAchievement(Polarity.Value, Baseline, Target, LatestValue)),
    Band,
        With({ a: fnAchievement(Polarity.Value, Baseline, Target, LatestValue) },
            If(IsBlank(LatestValue), "No data", a >= 1, "Achieved", a >= 0.7, "On track", a >= 0.4, "Attention", "Critical"))
)
```

---

## 6. Role-based visibility

Admins manage everything; owners edit only their own initiatives; everyone else
reads. The UI rule is paired with list permissions + a flow guard (never trust
the client alone).

```powerfx
// App.Formulas
fnCanEdit(ownerEmail: Text): Boolean =
    nfIsAdmin || Lower(ownerEmail) = Lower(nfMe.Email);

// icoEdit.Visible   (inside galInitiatives)
fnCanEdit(ThisItem.OwnerPerson.Email)

// icoDelete.Visible
nfIsAdmin

// frmInitiative.DisplayMode
If(fnCanEdit(galInitiatives.Selected.OwnerPerson.Email), DisplayMode.Edit, DisplayMode.View)

// Screen-level guard (scrAdmin.OnVisible)
If(!nfIsAdmin, Navigate(scrDashboard, ScreenTransition.None); Notify("Admins only", NotificationType.Warning))
```

---

## 7. Measurement upsert (one value per indicator and period)

Mirrors the `measurement/upsert` reducer case: an existing value for the same
period is updated instead of duplicated. The unique `Title` key in SharePoint is
the server-side safety net.

```powerfx
// btnSaveMeasurement.OnSelect
With(
    { wKey: galIndicators.Selected.IndicatorCode & "|" & txtPeriod.Text },
    If(
        !IsMatch(txtPeriod.Text, "^\d{4}-(0[1-9]|1[0-2])$"),
            Notify("Use the format YYYY-MM", NotificationType.Error),
        IsBlank(Value(txtValue.Text)),
            Notify("Value must be a number", NotificationType.Error),
        IfError(
            Patch(
                SP_Measurements,
                Coalesce(LookUp(SP_Measurements, Title = wKey), Defaults(SP_Measurements)),  // delegable '='
                {
                    Title: wKey,
                    Indicator: { Id: galIndicators.Selected.ID, Value: galIndicators.Selected.Title },
                    IndicatorIdNum: galIndicators.Selected.ID,
                    Period: txtPeriod.Text,
                    PeriodDate: Date(Value(Left(txtPeriod.Text, 4)), Value(Right(txtPeriod.Text, 2)), 1),
                    MeasuredValue: Value(txtValue.Text),
                    Note: txtNote.Text
                }
            );
            Notify("Measurement saved", NotificationType.Success),
            Notify(FirstError.Message, NotificationType.Error)
        )
    )
)
```
