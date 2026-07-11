# Escáner unificado (pantallas bulk) — Diseño

Fecha: 2026-07-11
Estado: Aprobado (pendiente de plan de implementación)
Rama: `feat/unified-scanner` (app-pmy, apilada sobre `feat/bodega-estandarizacion`)

## 1. Contexto y objetivo

Hoy conviven varios componentes de escaneo divergentes en el frontend:
- `components/barcode-scanner-input.tsx` — textarea simple, emite un string de guías
  (`onTrackingNumbersChange`). Base histórica.
- `components/barcode-input/barcode-scanner-input-list.tsx` — **rico**: tarjetas con
  datos del paquete (carrier, cobro, vencimiento), contadores (Hoy/Mañana/No
  encontradas), copiar, quitar, dedup JJD/JD, validación en lote vía
  `updateValidatedPackages`.
- `components/barcode-input/barcode-scanner-input.tsx` — otra variante.
- `components/barcode-input/barcode-scanner-input-list copy.tsx` — duplicado muerto.
- `components/warehouse/shared/scanner-card.tsx` — el del warehouse (valida por escaneo,
  con modal de remesa DHL). **Fuera de alcance** (ver §7).

El objetivo es **un solo componente de escaneo configurable** que reemplace las
variantes bulk, con: escaneo uno-a-uno o pegado de N guías, normalización FedEx/DHL,
vista conmutable rica/simple, y **auto-persistencia por pantalla** para que no se
"cuelguen" guías al cambiar entre pantallas.

Repo: `D:\PMY\app-pmy` (Next.js `output: export`, SPA estática — prohibido API
routes/Server Actions; toda lógica de servidor va al backend NestJS).

## 2. Decisiones tomadas

1. **Alcance:** migrar primero las 4 pantallas "bulk" (juntar + validar en lote):
   desembarque, package-dispatch, inventario, devoluciones. El warehouse
   (entrada/salida) se migra en un **follow-up** separado (tiene flujo de remesa por
   escaneo distinto).
2. **Modo de vista:** el desarrollador define un **default por pantalla** (prop
   `defaultView`), pero el operador puede alternar rico/simple con un switch dentro del
   componente, y su preferencia se **persiste** (por `storageKey`).
3. **Vista simple:** input de escaneo + **fila de chips compacta** (con scroll) +
   contador + copiar; cada chip se puede quitar.
4. **Contrato de validación:** se **conserva** el patrón actual push-back (el padre
   valida contra su endpoint y empuja datos con `updateValidatedPackages`). El
   componente NO se acopla a un endpoint.
5. **Persistencia:** **localStorage** keyed por `storageKey` (no un store global
   singleton, que causaría el bleed a evitar).
6. **Acento visual:** `primary` (mismo criterio de unificación que el warehouse);
   colores semánticos solo donde informan (vence hoy=rojo, mañana=ámbar, cobro).

## 3. Componente `ScanInput`

Archivo: `components/scanner/scan-input.tsx`. Exporta `ScanInput` y `ScanInputHandle`.

### 3.1 Entrada (uno-a-uno o pegar N)
- `textarea` de escaneo. En **Enter/Tab** procesa la(s) línea(s) del scan actual; en
  **paste** procesa N guías de una vez.
- Normalización **siempre** con `normalizeScannedCode` (`lib/tracking/normalize-scan.ts`):
  FedEx → últimos 12; DHL (JJD/JD o numérico de 18) → completo; limpia símbolos/QR.
- Dedup por `trackingNumber` y variante JJD↔JD (misma lógica que el `-list` actual):
  no se agrega si ya existe el código o su variante.
- Códigos con formato inválido se marcan (usar `isValidScannedCode`) — no se envían a
  validar, pero se muestran como "no válida" para que el operador los vea.

### 3.2 Vistas conmutables
- **Rica:** lista de tarjetas por guía con: badge de carrier (FedEx `#4d148c` / DHL
  `#ffcc00`/`#d40511`), guía, estado de validación ("Validando…"), cobro, y fecha de
  vencimiento (resaltada hoy/mañana). Pie con contadores Hoy / Mañana / No encontradas.
  Botón **Copiar** (todas las guías al portapapeles).
- **Simple:** el input + una **fila horizontal de chips** (guía + botón quitar), con
  scroll horizontal si son muchas, contador prominente y botón Copiar. Sin fechas/cobros.
- Switch rico/simple en el encabezado del componente. Valor inicial = `defaultView`
  (prop); el override del usuario se persiste por `storageKey`.
- Acento `primary`; el botón Copiar pasa de azul a `primary`.

### 3.3 API (props + handle)
Props (superset del contrato actual, para migración casi drop-in):
- `storageKey: string` (**requerida**) — partición de persistencia por pantalla.
- `defaultView?: "rich" | "simple"` (default `"rich"`).
- `id?`, `placeholder?`, `label?`, `disabled?`, `hasErrors?`.
- `onPackagesChange?(packages: PackageInfo[])`.
- `onTrackingNumbersChange?(trackingNumbers: string)`.
- `onHasDueTomorrow?(has: boolean)`.
- (Se elimina `multiCarrier`: la normalización mixta es siempre el estándar.)

`ScanInputHandle` (ref, igual que hoy):
- `focus()`, `clear()`, `getInputElement()`,
- `updateValidatedPackages(validated: PackageInfo[])` — el padre empuja los datos
  validados; se emparejan por `trackingNumber` y variante JJD/JD y `dhlUniqueId`.

## 4. Persistencia — `useScanBuffer(storageKey)`

Archivo: `components/scanner/use-scan-buffer.ts`. Hook respaldado en `localStorage`:
- Estado persistido por `storageKey`: `{ packages: PackageInfo[], view: "rich"|"simple" }`.
- **Sobrevive recarga y navegación** dentro de la misma pantalla.
- **Aislamiento por pantalla:** distinta `storageKey` = distinto registro → nunca se
  cuelgan guías al cambiar de paquetes.
- `clear()` borra el estado en memoria y su entrada de `localStorage`.
- SSR-safe: `output: export` prerenderiza; leer `localStorage` solo en cliente
  (después de montar) para evitar hydration mismatch.

Semántica de limpieza: el padre llama `ref.clear()` tras un guardado exitoso (igual que
hoy). Mientras tanto, el buffer persiste.

## 5. Migración de las 4 pantallas bulk

Para cada una (desembarque, package-dispatch, inventario, devoluciones):
- Cambiar el import al nuevo `ScanInput`.
- Añadir `storageKey` único por pantalla (p. ej. `"scan:desembarque"`,
  `"scan:inventario"`, `"scan:dispatch"`, `"scan:devoluciones"`; si una pantalla tiene
  sub-contextos que deban aislarse, incluirlos en la key).
- Añadir `defaultView` si aplica (default `"rich"`).
- El resto del cableado (`onPackagesChange`, `updateValidatedPackages`, `ref.clear()`)
  se mantiene igual.

Nota: hay pantallas que usan la variante rica (`-list`) y posiblemente otras la base
simple. Durante el plan se verificará, por pantalla, qué variante consumen y se
migrarán todas a `ScanInput`.

## 6. Limpieza

- Borrar `components/barcode-input/barcode-scanner-input-list copy.tsx` (muerto).
- Tras migrar todos los consumidores bulk, eliminar los componentes viejos que queden
  **sin referencias** (`barcode-scanner-input.tsx`, `barcode-input/barcode-scanner-input.tsx`,
  `barcode-input/barcode-scanner-input-list.tsx`), verificando con grep antes de borrar.
  Si algún componente sigue teniendo consumidores fuera de alcance, se deja y se anota.

## 7. Fuera de alcance (follow-up)

- Migrar el escáner del **warehouse** (`scanner-card.tsx` + flujo de remesa DHL por
  escaneo + `useWarehouseSession`). Es un paradigma distinto (validación por escaneo,
  modal maestra→piezas) y se aborda por separado.
- Cualquier cambio de endpoints de validación de las pantallas bulk (se conservan).

## 8. Verificación

Sin runner de tests en el front → typecheck (`npx tsc --noEmit`, estándar = 0 errores
nuevos en archivos tocados; el repo tiene ~484 errores pre-existentes) + **smoke real
por pantalla** con la app corriendo:
1. Escanear una guía FedEx (recorte a 12) y una DHL (JJD/JD y numérica de 18).
2. Pegar N guías de golpe; dedup (incluye variante JJD↔JD).
3. Alternar vista rica/simple; quitar un chip / una tarjeta; copiar.
4. **Recargar** la página → el buffer persiste.
5. **Cambiar a otra pantalla** con distinta `storageKey` → su buffer está vacío/aislado
   (no se cuelgan guías); volver → cada pantalla conserva lo suyo.
6. Guardar con éxito → `ref.clear()` limpia buffer + persistencia.
7. La validación en lote sigue mostrando datos (vencimiento/cobro) en la vista rica.

## 9. Restricciones

- Front `output: export`: componentes cliente (`"use client"`), sin API routes/Server
  Actions; leer `localStorage` solo tras montar (SSR-safe).
- Antes de escribir código Next, leer la guía relevante en `node_modules/next/dist/docs/`
  (regla de `AGENTS.md`).
- Reutilizar `normalizeScannedCode`/`isValidScannedCode` (no reimplementar la
  normalización) y el tipo `PackageInfo`.
