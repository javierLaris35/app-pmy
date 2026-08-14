# Diseño: Estilo unificado de filtros (Filter Chip)

Fecha: 2026-08-14
Repo: app-pmy
Autor: Javier + Claude (senior dev)

## Objetivo

Estandarizar el estilo de los filtros en toda la app usando el mismo look que
los chips del data-table (botón `outline`, borde punteado, ícono `+`, badge de
selección y popover con búsqueda). Hoy ese estilo vive en
`DataTableFacetedFilter`, pero está acoplado a las columnas de
`@tanstack/react-table`, así que no se puede reutilizar fuera de una tabla.

Alcance acordado:
- **Primitivo reusable + rollout gradual** (no big-bang).
- **Solo los chips de filtro** (no el buscador ni el botón "Ver").
- **Animaciones sutiles** usando `tailwindcss-animate` (ya instalado).

## Principio central: una sola fuente de verdad visual

Se extrae el look + comportamiento a un primitivo desacoplado y controlado.
`DataTableFacetedFilter` pasa a ser un **adaptador delgado** encima del
primitivo. Así los chips dentro de tablas y los chips sueltos quedan idénticos
para siempre: se cambia el estilo en un solo lugar y se propaga.

## Componentes

### 1. `components/ui/filter-chip.tsx` (nuevo primitivo, controlado)

API sin dependencia de react-table:

```ts
interface FilterChipOption {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
  count?: number            // opcional: conteo por opción (facets)
}

interface FilterChipProps {
  title: string
  options: FilterChipOption[]
  selected: string[]                       // controlado
  onChange: (values: string[]) => void
  multiple?: boolean                       // default true; false = single-select y cierra al elegir
  searchable?: boolean                     // default true
  align?: "start" | "end"                  // default "start"
  className?: string
  // Textos localizables (default en español)
  searchPlaceholder?: string               // default: title o "Buscar…"
  emptyText?: string                       // default: "Sin resultados"
  clearText?: string                       // default: "Borrar filtros"
}
```

Estructura visual (idéntica a la actual):
- Trigger: `Button variant="outline" size="sm"` con `h-8`, `PlusCircledIcon`,
  y el `title`.
- Cuando `selected.length > 0`: separador vertical + badges `secondary`
  (hasta 2 labels; si son >2, "N seleccionados").
- Popover → `Command` con `CommandInput` (si `searchable`), `CommandList`,
  items con checkbox, ícono opcional y `count` alineado a la derecha.
- Footer "Borrar filtros" cuando hay selección → `onChange([])`.

Comportamiento:
- `multiple` (default): toggle acumulativo, no cierra el popover.
- `!multiple`: selecciona un solo valor y cierra el popover.

### 2. `DataTableFacetedFilter` → adaptador delgado

Mantiene su firma actual (`column`, `title`, `options`) para no romper llamadas
existentes. Internamente:
- lee `selected` desde `column.getFilterValue()`;
- deriva `count` desde `column.getFacetedUniqueValues()`;
- en `onChange` hace `column.setFilterValue(values.length ? values : undefined)`;
- delega **todo** el render a `FilterChip`.

Resultado: **cero cambios de comportamiento** para las tablas actuales
(operaciones/envíos, cargas, consolidados, pagos-fedex, etc.).

## Animaciones sutiles

Vía `tailwindcss-animate` (ya en `tailwind.config.ts`, plugin activo):
- Chip: `transition-colors` en hover; el borde pasa de `border-dashed` a
  `border-solid` cuando el filtro tiene selección activa (señal "está prendido").
- Popover: `data-[state=open]:animate-in fade-in-0 zoom-in-95
  slide-in-from-top-1` al abrir (default de shadcn; se verifica que aplique).
- Badge de selección: `animate-in fade-in-0 zoom-in-95` al aparecer.
- Sin animaciones llamativas ni stagger.

## Migración de referencia + rollout

- **Referencia (esta entrega):** convertir el filtro "Sucursal" de
  `app/ingresos/page.tsx` (hoy `SucursalSelector` detrás de un ícono `Filter`)
  a `FilterChip`, como ejemplo canónico de uso fuera de tabla. Bajo riesgo,
  una sola página.
- **Rollout gradual (fuera de esta entrega):** las demás vistas
  (gastos, dashboard, monitoreo-rutas, reportes, support…) adoptan `FilterChip`
  reemplazando sus `Select`/`Dropdown` de filtrado, una por una, con esta receta:

  ```tsx
  const [values, setValues] = useState<string[]>([])
  <FilterChip
    title="Sucursal"
    options={opciones}
    selected={values}
    onChange={setValues}
    multiple={false}   // si el filtro es de un solo valor
  />
  ```

## No incluido (YAGNI)

- No se estandariza el buscador ni el botón "Ver".
- No se migran todas las páginas en esta entrega.
- No se toca la lógica de filtrado de las tablas existentes.

## Verificación

- Las tablas existentes se ven y filtran igual que antes (regresión visual).
- `app/ingresos` filtra por sucursal con el nuevo chip.
- Sin errores en consola/preview; tipos OK (`tsc`).
- Vitest existente sigue verde.
```