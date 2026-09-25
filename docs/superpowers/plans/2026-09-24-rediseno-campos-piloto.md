# Rediseño de campos — piloto Mantenimiento/Compras — Plan (Etapa 1)

> **Para quien ejecute:** SUB-SKILL: superpowers:executing-plans (inline, elegido por el usuario). Casillas `- [ ]`.

**Objetivo:** Campos con etiqueta sobre el borde (8 componentes + estructura de formulario) y migrar Nueva solicitud y Agregar cotización. Se detiene para aprobación visual.

**Arquitectura:** `Field` es el marco (borde, radio 12 px, etiqueta absoluta sobre el borde, ícono, error) y usa `:focus-within` para el foco; dentro van controles shadcn "desnudos" (sin borde propio). Spec: `docs/superpowers/specs/2026-09-24-rediseno-campos-piloto-design.md`.

**Tech:** Next.js + shadcn + Tailwind + Vitest; date-fns (es) para fechas.

## Restricciones globales
- Solo shadcn + Tailwind; textos en español llano; errores campo por campo (se conservan `lib/maintenance-validation.ts`).
- No tocar `components/ui/input.tsx` ni `select.tsx`; nada fuera del piloto cambia.
- Rojo PMY (`primary`) solo en foco, obligatorios y acción principal.
- Commits con rutas explícitas; `graphify update .` al final.

---

### Task 1: Helpers puros (dinero y fecha) — TDD
**Files:** Create `lib/field-format.ts`, `lib/field-format.test.ts`
**Produce:** `formatMoneyInput(n: number | ""): string` ("1,234.50"), `parseMoneyInput(s: string): number | ""` (quita $ y comas; "" si vacío/NaN; redondea a 2), `formatLongDate(iso: "YYYY-MM-DD"): string` ("24 de septiembre de 2026", sin desfase de zona).
- [ ] Pruebas: `parseMoneyInput("$1,234.567") === 1234.57`, `parseMoneyInput("") === ""`, `parseMoneyInput("abc") === ""`, `formatMoneyInput(1234.5) === "1,234.50"`, `formatMoneyInput("") === ""`, `formatLongDate("2026-09-24") === "24 de septiembre de 2026"`, `formatLongDate("") === ""`.
- [ ] Implementar (Intl es-MX con 2 decimales; fecha con `new Date(y, m-1, d)` + date-fns `format(d, "d 'de' MMMM 'de' yyyy", { locale: es })`).
- [ ] Vitest pasa; commit.

### Task 2: `Field` + controles
**Files:** Create `components/ui/field/field.tsx`, `text-field.tsx`, `money-field.tsx`, `textarea-field.tsx`, `select-field.tsx`, `combo-field.tsx`, `date-field.tsx`, `switch-field.tsx`, `index.ts`.
**Produce:**
```ts
Field({ label?, required?, icon?: LucideIcon, error?, hint?, size?: "md"|"sm", htmlFor?, className?, children, trailing? })
TextField(props: FieldProps & InputHTMLAttributes)            // id automático (useId)
MoneyField({ value: number|"", onValueChange(v: number|""), ...FieldProps })
TextareaField(FieldProps & TextareaHTMLAttributes)
SelectField({ value, onValueChange, options: {value,label}[], placeholder?, ...FieldProps })
ComboField({ value: string|null, onChange, options: SearchOption[], allowClear?, clearLabel?, searchPlaceholder?, emptyText?, modal?, disabled?, ...FieldProps })
MultiComboField({ values: string[], onChange, options, ... })   // chips debajo del campo
DateField({ value: string, onChange(v: string), ...FieldProps }) // Popover + Calendar (es)
SwitchField({ checked, onCheckedChange, label, description?, disabled? })
```
Estilo `Field` md: contenedor `relative rounded-xl border-[1.5px] border-input bg-background min-h-11 flex items-center gap-2 px-3 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10`; error → `border-destructive focus-within:ring-destructive/10`; etiqueta `absolute -top-2 left-3 bg-background px-1 text-xs text-muted-foreground group-focus-within:text-primary`; `sm` → `min-h-9 rounded-lg`, sin etiqueta montada. Controles internos: `border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-auto bg-transparent`.
- [ ] Implementar; `SearchableSelect`/`SearchableMultiSelect` re-exportan sobre el mismo núcleo de lista (sin romper usos actuales).
- [ ] tsc limpio (archivos de field y maintenance); commit.

### Task 3: Estructura de formulario
**Files:** Create `components/ui/field/form-section.tsx`, `repeatable-list.tsx`.
**Produce:** `FormSection({ title, description?, columns?: 1|2|3, children, className? })`; `ItemCard({ title, subtitle?, onRemove?, removeDisabled?, defaultOpen?, children })` (Collapsible); `AddItemButton({ onClick, children })` (outline punteado, ancho completo).
- [ ] Implementar; tsc; commit.

### Task 4: `SucursalSelector` variante de campo
**Files:** Modify `components/sucursal-selector.tsx` (+ prop `bare?: boolean`: trigger sin borde/sombra, altura completa, sin ícono propio).
- [ ] Implementar sin cambiar el comportamiento por defecto; tsc; commit.

### Task 5: Nueva solicitud con el nuevo estilo
**Files:** Modify `components/maintenance/requests/request-form-dialog.tsx`.
- Secciones: "Qué necesitas" (tipo), "Datos" (Sucursal*, Unidad*, Km, Prioridad), "Detalle" (servicios + qué le pasa / para qué + renglones con `ItemCard` + `AddItemButton`).
- Íconos: Sucursal `Store`, Unidad `Truck`, Km `Gauge`, Prioridad `Flag`, Servicios `ListChecks`, Descripción `MessageSquareText`.
- Pie: Cancelar / "Enviar a Compras".
- [ ] Implementar; tsc; revisión en navegador; commit.

### Task 6: Agregar cotización con el nuevo estilo
**Files:** Modify `components/maintenance/requests/quote-form-dialog.tsx`.
- Secciones: "Proveedor" (Proveedor*, Fecha*, Vigente hasta), "Impuestos para todo" (SwitchField IVA/IEPS + tasa), "Conceptos" (una `ItemCard` por partida: título = concepto + insignia de origen; campos Concepto, Cantidad, P. unitario (MoneyField), Existencia (SelectField) + días, IVA/IEPS, Calidad; importe a la derecha del título), "Notas y archivo".
- Pie: total a la izquierda; Cancelar / "Guardar cotización".
- [ ] Implementar conservando toda la lógica (validación, precarga, aviso de precio); tsc; revisión en navegador; commit.

### Task 7: Cierre de etapa 1
- [ ] Vitest de `lib/`, tsc filtrado, graphify update, memoria. Reportar y pedir aprobación visual (si el usuario inicia sesión en el navegador, capturas).
