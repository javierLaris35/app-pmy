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

---

## Revisión 2 (sustituye lo pendiente de la etapa 1)

### Task R1: `Field` idéntico a la maqueta A
**Files:** Modify `components/ui/field/field.tsx`, `select-field.tsx` (SwitchField), `text-field.tsx`; `styles/globals.css` (+ `--field-border: 24 6% 83%`).
- md: `min-h-12`, borde 1 px `hsl(var(--field-border))`, `px-3.5 gap-2.5`, etiqueta `-top-2 left-3 text-[11px]`; foco rojo + `ring-4 ring-primary/10`; sin `pt-2` en el contenedor (la cuadrícula de `FormSection` pasa a `gap-y-5`).
- [ ] tsc; commit.

### Task R2: `ChoiceCards` + Nueva solicitud
**Files:** Create `components/ui/field/choice-cards.tsx` (`ChoiceCards<T>({ value, onChange, options: {value,label,description,icon}[], columns?: 2|4 })` sobre `RadioGroup`); Modify `request-form-dialog.tsx` (sustituye el ToggleGroup) y `lib/types/maintenance.ts` (+`REQUEST_TYPE_HINT`).
- [ ] tsc; commit.

### Task R3: Expediente con encabezado + pestañas (TDD de helpers)
**Files:** Create `lib/compras-expediente.ts` (+test): `defaultExpedienteTab(stage, { isPurchaser, canAuthorize, hasOrders }): "solicitud"|"cotizar"|"ordenes"|"historial"`, `orderProgress(status, rejectionReason): { reached: 0..4; current: 0..3 | null; special: "devuelta"|"cancelada"|null }`, `WAITING_LABEL`.
Create `components/maintenance/expediente/expediente-header.tsx`, `order-progress.tsx` (tarjeta de orden con su avance; sustituye `orders-strip.tsx`).
Modify `app/compras/solicitud/page.tsx`: quita `ExpedienteStepper` y la columna lateral; `Tabs` Solicitud · Cotizar (solo Compras/autorizador) · Órdenes · Historial con contadores; pestaña inicial por `defaultExpedienteTab`; al generar órdenes cambia a Órdenes.
- Reglas `defaultExpedienteTab`: por_revisar/rechazada → solicitud; cotizando → cotizar si Compras/autoriza, si no solicitud; por_autorizar/en_proceso/terminado → ordenes si hay órdenes; cancelado → ordenes si hay, si no solicitud.
- Reglas `orderProgress`: borrador (sin rechazo) → reached 0, current null; borrador con rechazo → special devuelta; pendiente → reached 1, current 0; autorizada → 2/1; enviada → 3/2; completada → 4/null; cancelada → special cancelada.
- [ ] Vitest; tsc; commit.

### Task R4: Cotización con el ajuste de campos
- [ ] Revisar espaciados con `gap-y-5` y alturas 48 px; tsc; commit.

### Task R5: Revisión visual y cierre
- [ ] Capturas (si hay sesión) escritorio y 375 px; graphify; memoria.
