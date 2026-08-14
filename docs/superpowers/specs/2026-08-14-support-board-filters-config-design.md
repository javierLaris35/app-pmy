# Diseño: Filtros chip + modal de configuración en el Tablero de Soporte

Fecha: 2026-08-14
Repo: app-pmy
Archivo objetivo: `app/support/admin/page.tsx`

## Objetivo

1. Poner los filtros del tablero kanban de soporte con el estilo chip
   (`FilterChip`, ya en `main`), **multi-select**.
2. Mover "Canales de comunicación" y "Autorización" (hoy cards siempre
   visibles) a un botón **Configuración** que abre un modal con pestañas.

Decisiones acordadas: chips multi-select; agregar chip **Sucursal** (la lógica
`fSucursal` ya existe pero no tenía control visible); modal con **Tabs**
(Canales / Autorización).

## Parte 1 — Filtros chip

- Estado de filtros pasa de `string` (`"todos"`) a `string[]` (`[]` = sin filtro):
  `fTipo → tipos`, `fPrioridad → prioridades`, `fAsignado → asignados`,
  `fSucursal → sucursales`.
- El predicado de filtrado se extrae a un helper puro y testeable
  `matchesTicketFilters(ticket, filters)` en `lib/support/ticket-filters.ts`.
  Array vacío ⇒ ese filtro no aplica; comparación por "incluye".
- Opciones:
  - Tipo: error / mejora / cambio / eliminar.
  - Prioridad: urgente / alta / media / baja.
  - Asignado: agentes + "Sin asignar" (`__none__`).
  - Sucursal: sucursales cargadas + "Sin sucursal" (`__none__`).
- Se conserva el buscador y los controles Agrupar/Ordenar (no son filtros).
- Los `FilterSelect` locales y el helper se reemplazan por `FilterChip`.

## Parte 2 — Botón Configuración + modal

- Botón "Configuración" (icono `Settings`) en el header, junto a "Actualizar",
  **solo superadmin** (rol vía `useAuthStore`), consistente con que las cards ya
  hacen `if (!isSuper) return null`.
- Se elimina el bloque de cards siempre-visible.
- `Dialog` controlado por estado `configOpen`; dentro `Tabs`:
  - "Canales" → `<SupportChannelsCard />`
  - "Autorización" → `<SupportAuthorizersCard />`
  - `ScrollArea` por si el contenido crece.
- No se toca la lógica interna de las cards ni del `KanbanBoard`.

## Verificación

- Unit test del helper `matchesTicketFilters` (vitest node).
- `tsc` sin errores nuevos.
- Verificación visual: la hace el usuario en su app (evita OOM de Next en 8GB).
