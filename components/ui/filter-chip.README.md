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
