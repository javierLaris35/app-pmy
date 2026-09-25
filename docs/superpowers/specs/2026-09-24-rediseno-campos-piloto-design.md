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

---

## Revisión 2 (2026-09-24, tras ver la etapa 1)

El usuario vio la etapa 1 y no le gustaron el selector de tipo, el acabado de los inputs ni el expediente
("wizard" lineal). Se decidió con maquetas (en `maquetas-rediseno/`):

### Campos: estilo A, idéntico a la maqueta `inputs-estilo.html`
- Alto **48 px** (md), borde **1 px** `stone-300` (≈ `hsl(24 6% 83%)`; token nuevo `--field-border`), radio 12 px, padding horizontal 14 px, gap 10 px entre ícono y texto.
- Etiqueta: `-top-2 left-3`, `px-1`, 11 px, `stone-500`; foco y error en rojo PMY.
- Foco: borde rojo + halo `rgba(220,38,38,.08)` de 4 px. Error: borde rojo y mensaje debajo.
- Se elimina el relleno superior extra del contenedor; la separación la da la cuadrícula (gap-y 16 px).

### Selector de tipo: tarjetas con explicación (`selector-tipo.html`, opción C)
Componente `ChoiceCards` (sobre `RadioGroup` de shadcn): cuadrícula 2×2, cada tarjeta con ícono en círculo,
nombre, una línea de para qué sirve y radio a la derecha; la elegida con borde y fondo rojo PMY suave y el
círculo del ícono en rojo. Textos: Mantenimiento "Servicio preventivo de una unidad"; Servicio "Lavado,
verificación, alineación…"; Reparación "Algo falla en la unidad"; Compra "Equipo o material (no es para una unidad)".

### Expediente: encabezado con "qué sigue" + pestañas (`expediente-detalle.html`)
Reemplaza la barra de pasos lineal (`ExpedienteStepper`) y la columna lateral.
- **OperationHeader** sin cambios (acciones del paso activo + "Más acciones").
- **Encabezado de la solicitud** (`ExpedienteHeader`): folio grande + chip de estado; fila de datos (Tipo,
  Unidad, Sucursal, Pidió, Prioridad, Revisó); a la derecha un recuadro ámbar **"Qué sigue"** con `nextStep`
  (y quién debe actuar).
- **Pestañas** (`Tabs` de shadcn), con contador:
  - **Solicitud**: lo que se pidió (servicios, qué le pasa, renglones), alerta de rechazo si aplica.
  - **Cotizar** (Compras/autorizador): "Lo que se necesita" → cotizaciones → comparativo por concepto con
    resumen de órdenes a generar. Pestaña por defecto para Compras mientras se cotiza.
  - **Órdenes**: una tarjeta por orden con su **avance propio** (Por autorizar → Autorizada → Enviada →
    Recibida; devuelta/cancelada como estado aparte), total y proveedor; al elegir una se abre su detalle
    (partidas, contacto, PDF). Pestaña por defecto cuando hay órdenes que atender.
  - **Historial**: línea de tiempo (actividad + envíos).
- La pestaña por defecto se decide con una función pura `defaultExpedienteTab(stage, rol)`.

### Orden de trabajo (sustituye la Etapa 1/2 anterior)
1. Ajustar `Field` al estilo exacto; `ChoiceCards`.
2. Rehacer Nueva solicitud con `ChoiceCards`.
3. Expediente con encabezado + pestañas + avance por orden (`/compras/solicitud`).
4. Agregar cotización (ya migrada) con el ajuste de campos.
5. Revisión visual con el usuario; luego el resto del módulo (etapa 2 original).
