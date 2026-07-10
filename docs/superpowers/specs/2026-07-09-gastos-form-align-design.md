# Gastos Form Alignment (categorías FK dinámicas + prorrateo por periodo) — Design Spec

**Date:** 2026-07-09
**Repo:** app-pmy (frontend Next.js)
**Branch:** feat/gastos-form-align (off feat/notifications-and-support)
**Status:** Approved design, pre-implementation

## 1. Overview & Goals

The pmy-api backend replaced the expense `category` enum with a normalized `expense_category` table (FK `categoryId`) exposed via `GET /expense-categories`, deregistered `expense_category` from the generic catalog, and added `periodStart`/`periodEnd` for expense proration. The gastos form in the frontend still targets the old contract, so it is **currently broken**: its `<CatalogSelect type="expense_category">` reads the generic catalog (now empty) and it POSTs `category` (string) with no period.

**Goal:** align `app/gastos/` with the new backend so expense creation works again and supports proration.

**Non-goals (out of scope):** the category/group **admin UI** (create/edit/delete/reorder) — separate task. No backend changes.

## 2. Backend contract (already live)

- `GET /expense-categories` → grouped payload:
  ```ts
  Array<{
    group: { id: string | null; name: string; icon: string | null; sortOrder: number; isSystem: boolean; active: boolean };
    categories: Array<{ id: string; name: string; sortOrder: number; isSystem: boolean; active: boolean }>;
  }>
  ```
  Ungrouped categories arrive under a synthetic group `{ id: null, name: 'Sin grupo' }`.
- `POST /expenses` body now uses `categoryId` (FK uuid), NOT `category`. Also accepts optional `periodStart`/`periodEnd` (`'YYYY-MM-DD'`); when both present the backend prorates, else the expense is a point expense on `date`. `date` should be sent as `'YYYY-MM-DD'`. Backend validates period both-or-neither and `periodStart <= periodEnd`.
- `GET /expenses/:subsidiaryId` now returns each expense with `category` as an **object** `{ id, name, ... }` (relation), not a string.

## 3. Current State (facts, `app/gastos/page.tsx`)

- Category dropdown: `<CatalogSelect type="expense_category">` bound to `categoriaId` (holds the category **name/key** string). Broken now (catalog no longer has that type).
- Payload (handleSubmit): sends `category: categoriaId` (string), `date` as a `Date`; no `categoryId`, no period.
- Name-based logic: `requiresVehicle = VEHICLE_CATEGORIES.includes(categoriaId)`; `getCategoryColor(name)`; `plantillasRapidas` and `gastosComunes` prefill by category **name**.
- Reads `gasto.category` as a **string** in: table columns (`app/gastos/columns.tsx`), Excel export (`handleExportExcel`), `gastosComunes` key, faceted filters, and export dialog (`getCategorias()` from `lib/data`).
- Frequency selector: `<CatalogSelect type="frequency">` → `periodoPago`. No period date range.
- Types: `lib/types.ts` `Expense.category: ExpenseCategory` (object with `id`, `name`); `frequency?: "Único"|"Diario"|"Semanal"|"Mensual"|"Anual"`.

## 4. Design

### 4.1 Data hook — `useExpenseCategories` (new)
`hooks/services/expense-categories/use-expense-categories.ts`. SWR fetch of `GET /expense-categories`. Returns:
- `groups`: the grouped payload (for the dropdown).
- `byId: Record<string, { id: string; name: string; groupId: string | null }>` — resolve name from id.
- `byName: Record<string, string>` — resolve id from name (for templates/prefill by legacy name).
- `isLoading`, `isError`.

Add a matching service function in `lib/services/` (e.g. `expense-categories.ts`) calling the endpoint, consistent with `lib/services/expenses.ts`.

### 4.2 Component — `ExpenseCategorySelect` (new)
`components/gastos/expense-category-select.tsx`. A shadcn `Select` rendering **grouped** items: for each group, a non-selectable label header (with icon) then its categories. Props: `value: string (categoryId)`, `onValueChange: (id: string) => void`, `placeholder`, `className`. Uses `useExpenseCategories`. Replaces `<CatalogSelect type="expense_category">` in the form. The `frequency` CatalogSelect stays.

### 4.3 Form changes — `app/gastos/page.tsx`
- `categoriaId` now holds the category **id** (uuid).
- `requiresVehicle`: resolve the selected category name via `byId[categoriaId]?.name`, then `VEHICLE_CATEGORIES.includes(name)`.
- Prefill: `gastosComunes` are real expenses (category is an object) → `setCategoriaId(g.category?.id)` directly, and its dedupe key uses `g.category?.name`. `plantillasRapidas` are hardcoded by **name** → resolve via `byName[template.categoria]` before `setCategoriaId` (fallback: leave unselected if no match).
- `getCategoryColor`: call with `byId[categoriaId]?.name` (form) and `gasto.category?.name` (cards).
- **Period capture:** new state `periodStart`/`periodEnd` (`Date | undefined`). When `periodoPago ∈ {"Semanal","Mensual","Anual"}`, render a "Periodo que cubre" block with two date-pickers (desde/hasta), both **required**; for `"Único"`/`"Diario"` the block is hidden and no period is sent. Client validation mirrors backend: both-or-neither and `desde <= hasta` (toast + block submit otherwise).
- **Payload** (per distribution line): send `categoryId: categoriaId` (drop `category`), `date: format(fecha, 'yyyy-MM-dd')`, and when applicable `periodStart: format(periodStart,'yyyy-MM-dd')`, `periodEnd: format(periodEnd,'yyyy-MM-dd')`.
- **Edit flow** (`openEditGastoDialog`): `setCategoriaId(gasto.category?.id ?? "")`; prefill `periodStart`/`periodEnd` from `gasto.periodStart`/`gasto.periodEnd` (parse to Date) when present.
- Export dialog category filter: source options from `useExpenseCategories` (flatten groups) instead of the stale `getCategorias()`.

### 4.4 Display reads (category is now an object)
Change `gasto.category` → `gasto.category?.name` in: `app/gastos/columns.tsx` (category column render + any filter value), `handleExportExcel` (`categoria: gasto.category?.name`), `gastosComunes` key, `getCategoryColor(gasto.category?.name)`, and `expenseFilters` options.

### 4.5 Types — `lib/types.ts`
`Expense`: keep `category: ExpenseCategory` (object); add `categoryId?: string`, `periodStart?: string`, `periodEnd?: string`. Confirm `ExpenseCategory` has `id` and `name` (it does).

## 5. Error handling
- Category select disabled/empty state while `useExpenseCategories` loads or errors (toast on error).
- Submit blocked (toast) if: no `categoriaId`; recurring frequency without complete/valid period; existing distribution/percentage validations unchanged.

## 6. Testing / Verification
- `tsc --noEmit` / `next build` clean (no type errors from the `category` string→object change).
- Manual (if dev server available, driven via preview tools): create a Único expense (no period) and a Mensual expense (with desde/hasta) for a subsidiary with a user-created category; confirm the POST body carries `categoryId` + `periodStart/periodEnd`, and the table shows `category.name`. Confirm the grouped dropdown lists the 5 sections.

## 7. Risks & Notes
- **Coordination/breaking:** requires the pmy-api changes deployed + migrated (categories table seeded) — otherwise the endpoint/categoryId won't resolve. This is a lockstep FE/BE change.
- **Base branch:** this branch sits on `feat/notifications-and-support`; if isolation from that work is preferred, rebase onto the frontend's main before merge.
- Legacy templates (`plantillasRapidas`) reference names like "Combustible"/"Peajes" that must exist as seeded categories (they do — system categories) for `byName` resolution to succeed; if a template name has no match, fall back to leaving the category unselected.
