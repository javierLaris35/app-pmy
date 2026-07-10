# Gastos Form Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align `app/gastos/` with the new pmy-api backend — consume `GET /expense-categories` (grouped), send `categoryId` + `periodStart`/`periodEnd`, and read `expense.category` as an object.

**Architecture:** New data layer (service + SWR hook `useExpenseCategories` exposing `groups`, `byId`, `byName`) feeds a new grouped `ExpenseCategorySelect`. The gastos form switches its category state to hold the category **id**, resolves the **name** via `byId` for name-based logic (vehicle/color/templates), adds a conditional period date-range, and sends `categoryId`/`periodStart`/`periodEnd`/`date` as `YYYY-MM-DD`. Display code reads `category?.name`.

**Tech Stack:** Next.js (app router), SWR, shadcn/ui `Select`, axios (`axiosConfig`, baseURL `NEXT_PUBLIC_API_URL`), date-fns. **No unit-test infra** (no jest/vitest) → verification is `npx tsc --noEmit` per task + `npm run build` / manual preview at the end.

## Global Constraints

- Backend contract (live): `GET /expense-categories` returns `Array<{ group: { id: string|null; name: string; icon: string|null; sortOrder: number; isSystem: boolean; active: boolean }; categories: Array<{ id: string; name: string; sortOrder: number; isSystem: boolean; active: boolean }> }>`. Ungrouped categories arrive under `{ group: { id: null, name: 'Sin grupo' } }`.
- `POST /expenses` uses `categoryId` (uuid), NOT `category`. Optional `periodStart`/`periodEnd` as `'YYYY-MM-DD'`; both-or-neither and `start <= end`. `date` sent as `'YYYY-MM-DD'`.
- `GET /expenses/:subsidiaryId` returns `category` as an object `{ id, name, ... }`.
- Recurring frequencies that require a period: `"Semanal"`, `"Mensual"`, `"Anual"`. `"Único"`/`"Diario"` = point expense on `date`, no period.
- Do not build the category/group **admin UI** (out of scope). Keep the existing `<CatalogSelect type="frequency">`, distribution logic, vehicle section, and Excel import untouched except where listed.
- Per-task verification: `npx tsc --noEmit` (run from `D:/PMY/app-pmy`) introduces **no new** type errors in the files this task touches. Do not assume a zero-error baseline; compare against pre-task state if needed.

---

### Task 1: Data layer — types, service, hook

**Files:**
- Modify: `lib/types.ts` (extend `Expense`)
- Create: `lib/services/expense-categories.ts`
- Create: `hooks/services/expense-categories/use-expense-categories.ts`

**Interfaces:**
- Produces: `getExpenseCategories(): Promise<ExpenseCategoryGroupBlock[]>`; `useExpenseCategories()` → `{ groups: ExpenseCategoryGroupBlock[]; byId: Record<string,{id:string;name:string;groupId:string|null}>; byName: Record<string,string>; isLoading: boolean; isError: boolean }`.

- [ ] **Step 1: Extend the Expense type**

In `lib/types.ts`, in the `Expense` type (keep `category: ExpenseCategory`), add:
```ts
  categoryId?: string
  periodStart?: string
  periodEnd?: string
```

- [ ] **Step 2: Create the service**

```ts
// lib/services/expense-categories.ts
import { axiosConfig } from "../axios-config";

export type ExpenseCategoryOption = {
  id: string; name: string; sortOrder: number; isSystem: boolean; active: boolean;
};
export type ExpenseCategoryGroupBlock = {
  group: { id: string | null; name: string; icon: string | null; sortOrder: number; isSystem: boolean; active: boolean };
  categories: ExpenseCategoryOption[];
};

export const getExpenseCategories = async (): Promise<ExpenseCategoryGroupBlock[]> => {
  const res = await axiosConfig.get<ExpenseCategoryGroupBlock[]>("expense-categories");
  return res.data;
};
```

- [ ] **Step 3: Create the hook**

```ts
// hooks/services/expense-categories/use-expense-categories.ts
import useSWR from "swr";
import { getExpenseCategories, type ExpenseCategoryGroupBlock } from "@/lib/services/expense-categories";

export function useExpenseCategories() {
  const { data, error, isLoading } = useSWR<ExpenseCategoryGroupBlock[]>(
    ["expense-categories"],
    () => getExpenseCategories(),
    { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000 },
  );

  const groups = data ?? [];
  const byId: Record<string, { id: string; name: string; groupId: string | null }> = {};
  const byName: Record<string, string> = {};
  for (const block of groups) {
    for (const c of block.categories) {
      byId[c.id] = { id: c.id, name: c.name, groupId: block.group.id };
      byName[c.name] = c.id;
    }
  }
  return { groups, byId, byName, isLoading, isError: !!error };
}
```

- [ ] **Step 4: Typecheck**

Run: `cd /d/PMY/app-pmy && npx tsc --noEmit`
Expected: no new errors in the three files above.

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts lib/services/expense-categories.ts hooks/services/expense-categories/use-expense-categories.ts
git commit -m "feat(gastos): expense-categories service + useExpenseCategories hook + Expense type fields"
```

---

### Task 2: `ExpenseCategorySelect` grouped component

**Files:**
- Create: `components/gastos/expense-category-select.tsx`

**Interfaces:**
- Consumes: `useExpenseCategories` (Task 1).
- Produces: `<ExpenseCategorySelect value onValueChange placeholder disabled id className />` — value is the category **id**.

- [ ] **Step 1: Confirm SelectGroup/SelectLabel exports**

Run: `cd /d/PMY/app-pmy && node -e "const s=require('fs').readFileSync('components/ui/select.tsx','utf8'); console.log(['SelectGroup','SelectLabel'].map(n=>n+': '+s.includes(n)).join(' | '))"`
Expected: both `true`. (shadcn's select exports them.) If either is `false`, add the missing Radix wrapper export to `components/ui/select.tsx` following the existing pattern before Step 2.

- [ ] **Step 2: Write the component**

```tsx
// components/gastos/expense-category-select.tsx
"use client";

import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useExpenseCategories } from "@/hooks/services/expense-categories/use-expense-categories";

interface ExpenseCategorySelectProps {
  value?: string; // categoryId
  onValueChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function ExpenseCategorySelect({
  value, onValueChange, placeholder = "Selecciona una categoría", disabled, id, className,
}: ExpenseCategorySelectProps) {
  const { groups, isLoading } = useExpenseCategories();

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading}>
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={isLoading ? "Cargando…" : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {groups.map((block) => (
          <SelectGroup key={block.group.id ?? "sin-grupo"}>
            <SelectLabel>
              {block.group.icon ? `${block.group.icon} ` : ""}{block.group.name}
            </SelectLabel>
            {block.categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `cd /d/PMY/app-pmy && npx tsc --noEmit`
Expected: no new errors in the new component.

- [ ] **Step 4: Commit**

```bash
git add components/gastos/expense-category-select.tsx components/ui/select.tsx
git commit -m "feat(gastos): grouped ExpenseCategorySelect component"
```

---

### Task 3: Form — category wiring (`app/gastos/page.tsx`)

**Files:**
- Modify: `app/gastos/page.tsx`

**Interfaces:**
- Consumes: `ExpenseCategorySelect` (Task 2), `useExpenseCategories` (Task 1). `categoriaId` now holds the category **id**.

- [ ] **Step 1: Imports + hook**

Add imports near the others:
```ts
import { ExpenseCategorySelect } from "@/components/gastos/expense-category-select";
import { useExpenseCategories } from "@/hooks/services/expense-categories/use-expense-categories";
```
Inside `GastosPage`, after the existing hooks:
```ts
  const { byId, byName } = useExpenseCategories();
```

- [ ] **Step 2: Replace the category dropdown**

Replace the `<CatalogSelect type="expense_category" value={categoriaId} onValueChange={setCategoriaId} ... />` block (in the form's "Información Principal" section) with:
```tsx
                  <ExpenseCategorySelect
                    value={categoriaId}
                    onValueChange={setCategoriaId}
                    placeholder="Selecciona una categoría"
                    className="w-full"
                  />
```
(Leave the `<CatalogSelect type="frequency" ...>` for `periodoPago` unchanged. The `CatalogSelect` import stays since frequency still uses it.)

- [ ] **Step 3: Fix name-based logic**

Replace `const requiresVehicle = VEHICLE_CATEGORIES.includes(categoriaId);` with:
```ts
  const selectedCategoryName = byId[categoriaId]?.name ?? "";
  const requiresVehicle = VEHICLE_CATEGORIES.includes(selectedCategoryName);
```

- [ ] **Step 4: Fix prefill + edit to use ids**

- In `prefillFromTemplate` (templates are hardcoded by name): change `setCategoriaId(template.categoria);` to `setCategoriaId(byName[template.categoria] ?? "");`.
- In `prefillGasto` (a real expense; category is an object): change `setCategoriaId(plantilla.category);` to `setCategoriaId(plantilla.category?.id ?? "");`.
- In `openEditGastoDialog`: change `setCategoriaId(gasto.category);` to `setCategoriaId(gasto.category?.id ?? "");`.

- [ ] **Step 5: Send categoryId in the payload**

In `handleSubmit`, inside the `payload: Expense = { ... }`, replace `category: categoriaId,` with `categoryId: categoriaId,`.

- [ ] **Step 6: Typecheck**

Run: `cd /d/PMY/app-pmy && npx tsc --noEmit`
Expected: no new errors from these edits. (`gastosComunes`/`getCategoryColor`/export still read `gasto.category` as a string here — those are fixed in Task 5; if tsc flags them now, it is expected and resolved in Task 5. Note any such errors in the report.)

- [ ] **Step 7: Commit**

```bash
git add app/gastos/page.tsx
git commit -m "feat(gastos): category dropdown from GET /expense-categories, send categoryId"
```

---

### Task 4: Form — period capture (`app/gastos/page.tsx`)

**Files:**
- Modify: `app/gastos/page.tsx`

**Interfaces:**
- Consumes: `periodoPago` state (existing). Adds `periodStart`/`periodEnd` state + payload fields.

- [ ] **Step 1: State + recurring flag**

Add near the other form state (after `periodoPago`):
```ts
  const [periodStart, setPeriodStart] = useState<Date | undefined>(undefined);
  const [periodEnd, setPeriodEnd] = useState<Date | undefined>(undefined);
```
Add a derived flag (near `requiresVehicle`):
```ts
  const isRecurring = ["Semanal", "Mensual", "Anual"].includes(periodoPago);
```

- [ ] **Step 2: Reset period in resetForm and prefill on edit**

- In `resetForm`, add: `setPeriodStart(undefined); setPeriodEnd(undefined);`.
- In `openEditGastoDialog`, add:
```ts
    setPeriodStart(gasto.periodStart ? new Date(gasto.periodStart + "T00:00:00") : undefined);
    setPeriodEnd(gasto.periodEnd ? new Date(gasto.periodEnd + "T00:00:00") : undefined);
```
- In `prefillFromTemplate` and `prefillGasto`, add: `setPeriodStart(undefined); setPeriodEnd(undefined);`.

- [ ] **Step 3: Conditional period UI**

Immediately after the "Detalles de Pago" section (the `div#seccion-detalles-pago`), add:
```tsx
            {isRecurring && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-primary border-b pb-2">
                  Periodo que cubre <span className="text-destructive">*</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-medium text-xs uppercase text-muted-foreground">Desde</Label>
                    <Input
                      type="date"
                      value={periodStart ? format(periodStart, "yyyy-MM-dd") : ""}
                      onChange={(e) => setPeriodStart(e.target.value ? new Date(e.target.value + "T00:00:00") : undefined)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium text-xs uppercase text-muted-foreground">Hasta</Label>
                    <Input
                      type="date"
                      value={periodEnd ? format(periodEnd, "yyyy-MM-dd") : ""}
                      onChange={(e) => setPeriodEnd(e.target.value ? new Date(e.target.value + "T00:00:00") : undefined)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  El gasto se prorratea entre estos días. Para gastos de un solo día usa frecuencia Único o Diario.
                </p>
              </div>
            )}
```

- [ ] **Step 4: Validate + send period and date**

In `handleSubmit`, after the existing `if (!categoriaId) {...}` guard, add:
```ts
    if (isRecurring) {
      if (!periodStart || !periodEnd) {
        toast.error("Selecciona el periodo (desde/hasta) para una frecuencia recurrente");
        return;
      }
      if (periodStart > periodEnd) {
        toast.error("La fecha 'desde' no puede ser posterior a 'hasta'");
        return;
      }
    }
```
Because the payload is built inside the `toast.promise(async () => …)` closure, TypeScript will not narrow `fecha` from the earlier `if (!fecha) return` guard. Compute the formatted strings BEFORE the closure (right after the period validation, where `fecha` is still narrowed to `Date`):
```ts
    const fechaStr = format(fecha, "yyyy-MM-dd");
    const periodPayload = isRecurring && periodStart && periodEnd
      ? { periodStart: format(periodStart, "yyyy-MM-dd"), periodEnd: format(periodEnd, "yyyy-MM-dd") }
      : {};
```
Then in the `payload: Expense = { ... }`, change `date: fecha,` to `date: fechaStr,` and add `...periodPayload,` (after `date: fechaStr,`).

- [ ] **Step 5: Typecheck**

Run: `cd /d/PMY/app-pmy && npx tsc --noEmit`
Expected: no new errors from these edits.

- [ ] **Step 6: Commit**

```bash
git add app/gastos/page.tsx
git commit -m "feat(gastos): capture periodStart/periodEnd for recurring expenses; send date as YYYY-MM-DD"
```

---

### Task 5: Display reads (`page.tsx` + `columns.tsx`)

**Files:**
- Modify: `app/gastos/page.tsx`
- Modify: `app/gastos/columns.tsx`

**Interfaces:**
- Consumes: `gasto.category` is now an object `{ id, name, ... }`.

- [ ] **Step 1: page.tsx — read category.name**

- `gastosComunes` dedupe key: change `` `${g.category}-${g.description?.toLowerCase().trim()}` `` to `` `${g.category?.name}-${g.description?.toLowerCase().trim()}` ``.
- Frequent-cards render: change `getCategoryColor(gasto.category)` → `getCategoryColor(gasto.category?.name || "")`, and the `{gasto.category}` label → `{gasto.category?.name}`.
- `handleExportExcel`: change `categoria: gasto.category,` → `categoria: gasto.category?.name,`; and the filter `gasto.category === exportCategory` → `gasto.category?.name === exportCategory`.
- `expenseFilters`: change `options: opts(expenses.map((e: any) => e.category))` → `options: opts(expenses.map((e: any) => e.category?.name))`.

- [ ] **Step 2: page.tsx — export dialog categories from the hook**

Replace the `getCategorias()` `useEffect` + `categorias` state usage for the export dialog: derive the option list from the hook. Add near the other hooks:
```ts
  const categoryOptions = useMemo(
    () => Object.values(byId).map((c) => c.name).sort(),
    [byId],
  );
```
In the export dialog category `<Select>`, replace `{categorias.map((c) => (<SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>))}` with:
```tsx
                  {categoryOptions.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
```
Remove the now-unused `categorias` state, the `getCategorias` import, and the `loadCategorias` `useEffect` (and the `categoriasGasto` import if unused).

- [ ] **Step 3: columns.tsx — category column**

In `app/gastos/columns.tsx`, change the category column accessor and drop the stale `categoriasGasto` description lookup:
```tsx
  createSortableColumn<Expense>(
    "category",
    "Categoría",
    (row) => row.category?.name ?? "",
    (value) => (
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${getCategoryColor(value)}`} />
        <span>{value || "Sin categoría"}</span>
      </div>
    )
  ),
```
Remove the `import { categoriasGasto } from "@/lib/data";` line if it is no longer referenced elsewhere in the file.

- [ ] **Step 4: Typecheck**

Run: `cd /d/PMY/app-pmy && npx tsc --noEmit`
Expected: no new errors; the `gasto.category`-as-string errors from Task 3/4 are now resolved. Paste the final error list into the report (any remaining errors must be pre-existing and unrelated to gastos).

- [ ] **Step 5: Commit**

```bash
git add app/gastos/page.tsx app/gastos/columns.tsx
git commit -m "fix(gastos): read expense.category as object (category.name) in list/export/filters"
```

---

### Task 6: Build + manual verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck + build**

Run: `cd /d/PMY/app-pmy && npx tsc --noEmit && npm run build`
Expected: type-clean; `next build` succeeds (the `check-no-stubs` prebuild passes). Note any pre-existing unrelated failures.

- [ ] **Step 2: Manual/preview verification (needs the API running + migrated)**

Start the dev server (`npm run dev`, port 4000) with the pmy-api backend running and migrated. Verify:
- The category dropdown shows the 5 groups (👥/🏢/🚚/🛣️/📦) with their categories.
- Creating a **Único** expense sends `categoryId` + `date` (YYYY-MM-DD), no period; the table row shows the category name.
- Creating a **Mensual** expense shows the "Periodo que cubre" desde/hasta, requires them, and sends `periodStart`/`periodEnd`.
- Editing an expense preloads its category and period.
- The vehicle section still appears for Combustible/Mantenimiento/Peajes/Seguros (name-based logic via `byId`).

---

## Notes / Out of Scope

- **Admin UI** for creating/editing/deleting categories & groups — separate task (backend CRUD already exists at `/expense-categories`).
- No unit-test infra in this repo; verification is typecheck + build + manual preview.
- Requires pmy-api deployed + migrated (categories seeded) for the endpoint and `categoryId` to resolve — lockstep FE/BE.
- Branch sits on `feat/notifications-and-support`; rebase onto the frontend main before merge if isolation is preferred.
