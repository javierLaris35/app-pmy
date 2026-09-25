# Rediseño de campos y formularios — piloto Mantenimiento/Compras

**Fecha:** 2026-09-24 · **Repo:** app-pmy · **Modo:** inline, rama actual.

## Objetivo

Reemplazar el estilo actual de inputs y formularios (etiqueta arriba separada, 40 px, radio 8 px) por uno
de **etiqueta montada sobre el borde**, con ícono a la izquierda, asterisco de obligatorio, bordes más
redondeados, secciones con título y renglones en tarjetas colapsables. Piloto: todo el módulo de
Mantenimiento/Compras. El resto de la app no cambia hasta aprobar el piloto.

## Decisiones

| Tema | Decisión |
|---|---|
| Alcance | Componentes nuevos usados solo en el piloto; `components/ui/input.tsx` y `select.tsx` no se tocan |
| Tecnología | Solo shadcn (`@/components/ui/*`) + Tailwind; los componentes nuevos se arman con esas piezas |
| Tamaños | Normal ~44 px (formularios y diálogos, con etiqueta montada) y compacto ~36 px (filtros, tablas, OperationHeader; sin etiqueta montada) |
| Marca | Rojo PMY (`--primary`) solo en foco, obligatorios y acción principal; lo demás en grises neutros |

## 1. Sistema de campos (`components/ui/field/`)

Estilo normal:
```
  ╭─ Proveedor * ─────────────────────────╮
  │ 🏪  AutoZone Hermosillo            ⌄  │
  ╰───────────────────────────────────────╯
     Elige el proveedor que cotizó.
```
- Etiqueta siempre visible sobre el borde (no animada): `text-xs`, gris (`muted-foreground`); `primary` con foco; `destructive` con error. Fondo del color de la superficie para "cortar" el borde.
- Asterisco `*` en `destructive` si `required`.
- Ícono opcional a la izquierda (lucide, 16 px, gris).
- `rounded-xl` (12 px), borde 1.5 px `input`; foco: borde `primary` + halo `ring-primary/15`; error: borde `destructive`; deshabilitado: fondo `muted/50`.
- Mensaje de error (o ayuda) debajo, `text-xs`.

Componentes:

| Componente | Base shadcn | Props clave |
|---|---|---|
| `Field` | `Label` + contenedor | `label`, `required`, `icon`, `error`, `hint`, `size: "md" \| "sm"`, `htmlFor`, `className`, `children` |
| `TextField` | `Input` | + props de `<input>` |
| `MoneyField` | `Input` | `value: number \| ""`, `onValueChange(n)`; `$` fijo, formato es-MX al salir |
| `TextareaField` | `Textarea` | `rows` (mín. 3) |
| `SelectField` | `Select` | `value`, `onValueChange`, `options: {value,label}[]`, `placeholder` |
| `ComboField` / `MultiComboField` | `Popover` + `Command` | mismas props que `SearchableSelect`/`SearchableMultiSelect` + las de `Field` |
| `DateField` | `Popover` + `Calendar` | `value: "YYYY-MM-DD"`, `onChange`; muestra "24 de septiembre de 2026" |
| `SwitchField` | `Switch` | `checked`, `onCheckedChange`, `label`, `description` (fila con borde) |

Tamaño `sm` (~36 px): mismo estilo sin etiqueta montada (usa `placeholder`/`aria-label`).

`SearchableSelect`/`SearchableMultiSelect` pasan a ser envoltorios de `ComboField`/`MultiComboField` (compatibilidad). `SucursalSelector` y `UnidadSelector` reciben una variante `field` que usa `ComboField` sin cambiar su uso en el resto de la app.

## 2. Estructura de formularios y pantallas

- `FormSection` (`components/ui/field/form-section.tsx`): `title`, `description?`, `columns: 1|2|3`, separador fino entre secciones.
- `RepeatableList` + `ItemCard`: tarjeta por renglón con título, borrar y colapsar (`Collapsible`), botón a lo ancho "+ Agregar …" (`Button variant="outline"` con borde punteado).
- Diálogos: encabezado (título + una línea), cuerpo con scroll y secciones, pie fijo con acciones a la derecha y total a la izquierda si aplica.
- Pantallas: OperationHeader sin cambios; contenido en `Card` con título/descripción en llano; resúmenes como filas "etiqueta · valor".

## 3. Etapas

**Etapa 1 (se detiene para aprobación):** componentes de campos y estructura; **Nueva solicitud** (`request-form-dialog.tsx`); **Agregar cotización** (`quote-form-dialog.tsx`).

**Etapa 2:** Servicios (`service-template-dialog.tsx`), ficha de unidad (`vehicle-spec-dialog.tsx`), catálogos (`product-form-dialog`, `supplier-form-dialog`, `kind-catalog-tab`), diálogos de orden (`order-dialogs.tsx`), Pedir cotización (`rfq-dialog.tsx`), programación (`schedule-dialog.tsx`), filtros compactos de Tablero, Mis solicitudes e Historial.

## 4. Validación

- Vitest para helpers puros nuevos (p. ej. formato de dinero y fecha en español).
- Se conservan las validaciones y mensajes de `lib/maintenance-validation.ts`.
- `tsc` sin errores en archivos tocados; revisión en navegador escritorio y 375 px.
- Ninguna pantalla fuera del piloto cambia.

## Fuera de alcance

DataTable, barra lateral, otras pantallas y el `Input`/`Select` base de shadcn.
