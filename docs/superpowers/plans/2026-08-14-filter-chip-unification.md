# Filter Chip Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the data-table filter chip into a reusable, react-table-agnostic `FilterChip` primitive, and make `DataTableFacetedFilter` a thin adapter over it, so the chip style has a single source of truth and can be used anywhere.

**Architecture:** A pure selection-logic helper (unit-tested in the existing node vitest) drives a controlled `FilterChip` React component (visual/behavioral primitive). `DataTableFacetedFilter` keeps its current props but delegates all rendering to `FilterChip`, mapping the react-table column to `selected`/`onChange`. No existing table behavior changes.

**Tech Stack:** Next.js (app router) + React + TypeScript, Tailwind + `tailwindcss-animate`, shadcn/ui (`Button`, `Badge`, `Command`, `Popover`, `Separator`), `@radix-ui/react-icons`, Vitest (node env, pure-logic only).

## Global Constraints

- Repo: `app-pmy` (frontend). Working dir for all paths below is the `app-pmy` repo root.
- Vitest runs in `environment: 'node'` — **no jsdom / no React rendering in tests**. Test pure logic only; verify rendered UI in the browser preview.
- Do NOT add a DOM/component test stack (no jsdom, no `@testing-library`). Follow the app's existing "pure logic in vitest, UI in browser" pattern.
- Do NOT change the behavior of existing data-tables (envíos, cargas, consolidados, gastos, pagos-fedex, etc.). The adapter must be behavior-preserving.
- UI copy defaults in Spanish: search placeholder falls back to the title or `"Buscar…"`, empty = `"Sin resultados"`, clear = `"Borrar filtros"`.
- Animations are subtle only, via `tailwindcss-animate` utilities already available. No stagger, no bounce.
- Preserve the existing chip visual: `Button variant="outline" size="sm"`, `h-8 border-dashed`, `PlusCircledIcon`, secondary badges for selection, `Command` popover.
- Path alias `@/` maps to the repo root (see `tsconfig.json` / `vite-tsconfig-paths`).

---

### Task 1: Pure selection-logic helper

**Files:**
- Create: `lib/filter-chip-logic.ts`
- Test: `lib/filter-chip-logic.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `toggleSelection(selected: string[], value: string, multiple: boolean): string[]`
  - `interface SelectionSummary { count: number; labels: string[]; overflow: boolean }`
  - `summarizeSelection(options: { label: string; value: string }[], selected: string[], maxLabels?: number): SelectionSummary` — `maxLabels` default `2`. When `count > maxLabels`, `labels` is `[]` and `overflow` is `true`; otherwise `labels` holds the option labels for the selected values (in `options` order) and `overflow` is `false`.

- [ ] **Step 1: Write the failing tests**

```ts
// lib/filter-chip-logic.test.ts
import { describe, it, expect } from "vitest"
import { toggleSelection, summarizeSelection } from "@/lib/filter-chip-logic"

describe("toggleSelection", () => {
  it("multiple: adds a value when absent", () => {
    expect(toggleSelection([], "a", true)).toEqual(["a"])
    expect(toggleSelection(["a"], "b", true)).toEqual(["a", "b"])
  })

  it("multiple: removes a value when present", () => {
    expect(toggleSelection(["a", "b"], "a", true)).toEqual(["b"])
  })

  it("single: replaces selection with the picked value", () => {
    expect(toggleSelection([], "a", false)).toEqual(["a"])
    expect(toggleSelection(["a"], "b", false)).toEqual(["b"])
  })

  it("single: picking the already-selected value clears it", () => {
    expect(toggleSelection(["a"], "a", false)).toEqual([])
  })
})

describe("summarizeSelection", () => {
  const options = [
    { label: "Uno", value: "1" },
    { label: "Dos", value: "2" },
    { label: "Tres", value: "3" },
  ]

  it("reports zero when nothing is selected", () => {
    expect(summarizeSelection(options, [])).toEqual({ count: 0, labels: [], overflow: false })
  })

  it("lists labels (in options order) when at or under maxLabels", () => {
    expect(summarizeSelection(options, ["2", "1"])).toEqual({
      count: 2,
      labels: ["Uno", "Dos"],
      overflow: false,
    })
  })

  it("overflows when selected count exceeds maxLabels", () => {
    expect(summarizeSelection(options, ["1", "2", "3"])).toEqual({
      count: 3,
      labels: [],
      overflow: true,
    })
  })

  it("honors a custom maxLabels", () => {
    expect(summarizeSelection(options, ["1", "2", "3"], 3)).toEqual({
      count: 3,
      labels: ["Uno", "Dos", "Tres"],
      overflow: false,
    })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/filter-chip-logic.test.ts`
Expected: FAIL — cannot resolve `@/lib/filter-chip-logic` (module not found).

- [ ] **Step 3: Write the minimal implementation**

```ts
// lib/filter-chip-logic.ts

/**
 * Alterna un valor dentro de la selección de un FilterChip.
 * - multiple: acumula (toggle add/remove).
 * - single: reemplaza por [value]; si ya estaba seleccionado, lo limpia ([]).
 */
export function toggleSelection(selected: string[], value: string, multiple: boolean): string[] {
  if (multiple) {
    return selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value]
  }
  return selected.includes(value) ? [] : [value]
}

export interface SelectionSummary {
  count: number
  labels: string[]
  overflow: boolean
}

/**
 * Resume la selección para el trigger del chip: cuántos hay, qué labels mostrar
 * (en el orden de `options`), y si hay que colapsar a "N seleccionados".
 */
export function summarizeSelection(
  options: { label: string; value: string }[],
  selected: string[],
  maxLabels = 2,
): SelectionSummary {
  const selectedSet = new Set(selected)
  const count = selected.length
  if (count === 0) return { count: 0, labels: [], overflow: false }
  if (count > maxLabels) return { count, labels: [], overflow: true }
  const labels = options.filter((o) => selectedSet.has(o.value)).map((o) => o.label)
  return { count, labels, overflow: false }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/filter-chip-logic.test.ts`
Expected: PASS — all 8 assertions green.

- [ ] **Step 5: Commit**

```bash
git add lib/filter-chip-logic.ts lib/filter-chip-logic.test.ts
git commit -m "feat(filters): pure selection-logic helper for FilterChip"
```

---

### Task 2: `FilterChip` primitive component

**Files:**
- Create: `components/ui/filter-chip.tsx`

**Interfaces:**
- Consumes (from Task 1): `toggleSelection`, `summarizeSelection`, `SelectionSummary`.
- Produces:
  - `interface FilterChipOption { label: string; value: string; icon?: React.ComponentType<{ className?: string }>; count?: number }`
  - `interface FilterChipProps { title: string; options: FilterChipOption[]; selected: string[]; onChange: (values: string[]) => void; multiple?: boolean; searchable?: boolean; align?: "start" | "end"; className?: string; searchPlaceholder?: string; emptyText?: string; clearText?: string }`
  - `export function FilterChip(props: FilterChipProps): JSX.Element`

- [ ] **Step 1: Create the component**

```tsx
// components/ui/filter-chip.tsx
"use client"

import * as React from "react"
import { CheckIcon, PlusCircledIcon } from "@radix-ui/react-icons"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { toggleSelection, summarizeSelection } from "@/lib/filter-chip-logic"

export interface FilterChipOption {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
  count?: number
}

export interface FilterChipProps {
  title: string
  options: FilterChipOption[]
  selected: string[]
  onChange: (values: string[]) => void
  /** true (default): selección acumulable. false: un solo valor y cierra el popover. */
  multiple?: boolean
  /** Muestra el buscador dentro del popover. Default true. */
  searchable?: boolean
  align?: "start" | "end"
  className?: string
  searchPlaceholder?: string
  emptyText?: string
  clearText?: string
}

export function FilterChip({
  title,
  options,
  selected,
  onChange,
  multiple = true,
  searchable = true,
  align = "start",
  className,
  searchPlaceholder,
  emptyText = "Sin resultados",
  clearText = "Borrar filtros",
}: FilterChipProps) {
  const [open, setOpen] = React.useState(false)
  const selectedSet = React.useMemo(() => new Set(selected), [selected])
  const summary = summarizeSelection(options, selected)
  const hasSelection = summary.count > 0

  const handleSelect = (value: string) => {
    onChange(toggleSelection(selected, value, multiple))
    if (!multiple) setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-8 border-dashed transition-colors",
            // Animación sutil: el borde pasa a sólido cuando el filtro está "prendido".
            hasSelection && "border-solid border-primary/40",
            className,
          )}
        >
          <PlusCircledIcon className="mr-2 h-4 w-4" />
          {title}
          {hasSelection && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal lg:hidden animate-in fade-in-0 zoom-in-95"
              >
                {summary.count}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {summary.overflow ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal animate-in fade-in-0 zoom-in-95"
                  >
                    {summary.count} seleccionados
                  </Badge>
                ) : (
                  summary.labels.map((label) => (
                    <Badge
                      key={label}
                      variant="secondary"
                      className="rounded-sm px-1 font-normal animate-in fade-in-0 zoom-in-95"
                    >
                      {label}
                    </Badge>
                  ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align={align}>
        <Command>
          {searchable && <CommandInput placeholder={searchPlaceholder ?? title ?? "Buscar…"} />}
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedSet.has(option.value)
                return (
                  <CommandItem key={option.value} onSelect={() => handleSelect(option.value)}>
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <CheckIcon className="h-4 w-4" />
                    </div>
                    {option.icon && <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                    <span>{option.label}</span>
                    {typeof option.count === "number" && (
                      <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                        {option.count}
                      </span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {hasSelection && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onChange([])}
                    className="justify-center text-center"
                  >
                    {clearText}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 2: Type-check the new component**

Run: `npx tsc --noEmit`
Expected: PASS — no type errors introduced (pre-existing unrelated errors, if any, are out of scope; the new file must not add errors).

- [ ] **Step 3: Verify it renders in the browser (smoke check via an existing table)**

This primitive is exercised for real once Task 3 wires it into the tables, so a dedicated harness page is unnecessary here. Confirm only that the module compiles and imports resolve (Step 2). Rendered-behavior verification happens in Task 3.

- [ ] **Step 4: Commit**

```bash
git add components/ui/filter-chip.tsx
git commit -m "feat(filters): add reusable FilterChip primitive (decoupled from react-table)"
```

---

### Task 3: Refactor `DataTableFacetedFilter` into a thin adapter

**Files:**
- Modify: `components/data-table/data-table-faceted-filter.tsx` (full rewrite of the component body; keep the exported name and props)

**Interfaces:**
- Consumes (from Task 2): `FilterChip`, `FilterChipOption`.
- Produces: unchanged public API —
  `DataTableFacetedFilter<TData, TValue>({ column?: Column<TData, TValue>; title?: string; options: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }[] })`.
  Every current caller (`data-table-toolbar.tsx`) keeps working with no changes.

- [ ] **Step 1: Rewrite the component to delegate to `FilterChip`**

```tsx
// components/data-table/data-table-faceted-filter.tsx
import type * as React from "react"
import type { Column } from "@tanstack/react-table"

import { FilterChip, type FilterChipOption } from "@/components/ui/filter-chip"

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>
  title?: string
  options: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
  }[]
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues()
  const selected = (column?.getFilterValue() as string[] | undefined) ?? []

  const chipOptions: FilterChipOption[] = options.map((option) => ({
    ...option,
    count: facets?.get(option.value),
  }))

  return (
    <FilterChip
      title={title ?? ""}
      options={chipOptions}
      selected={selected}
      onChange={(values) => column?.setFilterValue(values.length ? values : undefined)}
      multiple
    />
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS — no new type errors. (`FilterChip` requires `title: string`; the `title ?? ""` fallback satisfies it.)

- [ ] **Step 3: Start the dev server and verify tables are unchanged**

Use the run/preview workflow to launch the app (do NOT use raw `Bash` to run `next dev` — this repo's dev machine has 8GB RAM and Next can OOM; prefer the project's preview tooling). Then:
- Navigate to a page with a filtered data-table (e.g. `operaciones/envios` or `gastos`).
- Open a chip filter (e.g. "Estatus", "Sucursal", "Categoría"), confirm: dashed border, `+` icon, searchable list, checkbox toggle, per-option counts, selection badges appear, "Borrar filtros" clears, and the table rows actually filter.
- Check the browser console (read_console_messages) and preview logs for errors.

Expected: identical behavior to before the refactor, plus the subtle animations (border goes solid on active filter; badges fade/zoom in).

- [ ] **Step 4: Run the existing test suite (regression)**

Run: `npx vitest run`
Expected: PASS — the full suite stays green (Task 1 tests included; no existing test depends on the faceted-filter internals).

- [ ] **Step 5: Commit**

```bash
git add components/data-table/data-table-faceted-filter.tsx
git commit -m "refactor(filters): make DataTableFacetedFilter a thin adapter over FilterChip"
```

---

### Task 4: Adoption guide + final verification

**Files:**
- Create: `components/ui/filter-chip.README.md`

**Interfaces:**
- Consumes: the `FilterChip` API from Task 2. Produces: documentation only.

- [ ] **Step 1: Write the adoption guide**

```markdown
# FilterChip — guía de adopción

`FilterChip` es el primitivo de filtro estilo "chip" (borde punteado, `+`, badge
de selección, popover con búsqueda). Úsalo en CUALQUIER vista, dentro o fuera de
tablas, para que todos los filtros de la app se vean igual.

## Fuera de tabla (páginas con filtros propios)

```tsx
import { FilterChip } from "@/components/ui/filter-chip"

const [estatus, setEstatus] = useState<string[]>([])

<FilterChip
  title="Estatus"
  options={[
    { label: "Pendiente", value: "pendiente" },
    { label: "Entregado", value: "entregado" },
  ]}
  selected={estatus}
  onChange={setEstatus}
/>
```

- Filtro de un solo valor: pasa `multiple={false}` (selecciona y cierra).
- Conteos por opción: agrega `count` a cada `FilterChipOption`.
- Textos: `searchPlaceholder`, `emptyText`, `clearText` (defaults en español).

## Dentro de una tabla (react-table)

No uses `FilterChip` directo: usa `DataTableFacetedFilter` (ya es un adapter
sobre `FilterChip`), pasándolo por la prop `filters` de `DataTableToolbar`.

## No reemplazar selectores con lógica

`SucursalSelector`, `ConsolidadoSelect`, etc. tienen comportamiento propio
(scoping por rol, defaults, fetch). NO los cambies por un `FilterChip` pelón:
perderías funcionalidad. `FilterChip` es para filtros categóricos simples.
```

- [ ] **Step 2: Final full verification**

Run: `npx vitest run && npx tsc --noEmit`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add components/ui/filter-chip.README.md
git commit -m "docs(filters): FilterChip adoption guide"
```

---

## Self-Review

**Spec coverage:**
- "Primitivo reusable desacoplado" → Task 2 (`FilterChip`). ✔
- "Una sola fuente de verdad / adapter" → Task 3. ✔
- "Animaciones sutiles (tailwindcss-animate)" → Task 2 (`transition-colors`, border dashed→solid, `animate-in fade-in-0 zoom-in-95` badges). ✔
- "Textos en español por default" → Task 2 defaults + Global Constraints. ✔
- "No migración riesgosa de selectores con lógica" → not implemented by design (spec Hallazgo 2026-08-14); documented in Task 4. ✔
- "Receta de adopción / rollout gradual" → Task 4 README. ✔
- "Cero cambios de comportamiento en tablas" → Task 3 Step 3–4 verification. ✔
- "Pure logic tested in node vitest" → Task 1. ✔

**Placeholder scan:** No TBD/TODO; every code step has full content. ✔

**Type consistency:** `toggleSelection`/`summarizeSelection`/`SelectionSummary` signatures match between Task 1 (definition) and Task 2 (consumption). `FilterChipOption`/`FilterChipProps` match between Task 2 (definition) and Task 3 (consumption). `DataTableFacetedFilter` public props unchanged. ✔
