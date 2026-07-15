# Integración del escáner unificado en Bodega (Entrada/Salida) — Diseño

Fecha: 2026-07-11
Estado: Aprobado (pendiente de plan de implementación)
Rama: `feat/warehouse-scanner-unify` (app-pmy, off main)

## 1. Contexto y objetivo

El escáner unificado `ScanInput` (`components/scanner/`) ya reemplazó a los escáneres
bulk (inventario, desembarque, dispatch, devoluciones). Quedó pendiente —y es lo que
pide el usuario— **integrarlo también en las pantallas de Bodega Entrada y Salida**
(`components/warehouse/inbound-package/inbound-package.tsx`,
`components/warehouse/outbound-package/outbound-package.tsx`).

El warehouse usa un paradigma distinto al de las bulk: **valida cada guía por escaneo**
(pega al backend al instante vía `validateShipment`), con el **flujo de remesa DHL**
(guía maestra re-escaneada → escanear piezas, `WarehouseRemittanceDialog`), y muestra
una lista rica (`PackagesList` con panel expandible de remesa + agrupación). Hoy la
captura es `ScannerCard` (input de una línea, una guía a la vez), sin persistencia.

Objetivo: que Entrada/Salida usen `ScanInput` **conservando** validación por escaneo y
remesa, y **ganando** las tres capacidades que el usuario pidió: pegar N guías,
vista rica/simple conmutable, y auto-persistencia por pantalla.

Repo: `app-pmy` (Next.js `output: export`, SPA estática — prohibido API routes/Server
Actions; todo va al backend NestJS). **No hay cambios de backend en este trabajo.**

## 2. Decisiones tomadas

1. **Paradigma:** conservar validación por escaneo + remesa DHL. `ScanInput` gana un
   **modo `perScan`**; se vuelve el único componente de escaneo de la app.
2. **Propiedad de datos:** `ScanInput` es dueño del buffer de paquetes + persistencia +
   display. El warehouse **delega la captura** y conserva su "cerebro" (validación
   `validateShipment` y el modal de remesa). `useWarehouseSession` **adelgaza**.
3. **Entrega:** un solo esfuerzo, inbound + outbound juntos.
4. **Capacidades a habilitar en Bodega:** pegar-N, toggle rico/simple, persistencia por
   pantalla (`scan:inbound` / `scan:outbound`), con `clear()` al guardar.
5. **Sin cambios de backend** ni de endpoints; se preserva el contrato de validación,
   remesa, stats, orden, PDF/Excel y cierre.

## 3. Extensión de `ScanInput` (modo `perScan`)

Nuevo contrato (aditivo; el modo `batch` actual de las bulk queda intacto y es el
default):

- `mode?: "batch" | "perScan"` (default `"batch"`).
- `onScan?: (code: string) => Promise<ScanResolution>` — en `perScan`, ScanInput llama
  a esto por **cada** código (escaneado con Enter o proveniente de un pegado-N,
  secuencialmente). `ScanResolution`:
  - `{ action: "add"; package: PackageInfo }` → ScanInput inserta el paquete **ya
    validado** (con datos del backend) en su buffer.
  - `{ action: "reject"; message: string }` → ScanInput muestra el banner de error, no
    agrega.
  - `{ action: "remittance"; masterTracking: string }` → ScanInput invoca
    `onRemittance?(masterTracking)`; no agrega nada por sí mismo (la guía maestra ya
    está en el buffer).
- `onRemittance?: (masterTracking: string) => void` — el warehouse abre su
  `WarehouseRemittanceDialog`.
- Handle `ScanInputHandle` gana:
  - `attachPieces(masterTracking: string, pieces: string[]): void` — cuelga las piezas
    escaneadas en el modal de la guía maestra en el buffer.
  - (se conservan `focus`, `clear`, `getInputElement`; `updateValidatedPackages` sigue
    para el modo `batch`).
- Normalización: la misma (`normalizeScannedCode`), pero el warehouse recorta FedEx a 12
  y conserva DHL — ya cubierto por `normalizeScannedCode`.
- **Display configurable (para paridad sin tocar las bulk):** prop opcional
  `renderRichList?: (packages: PackageInfo[], api: { onRemove: (id: string) => void }) => ReactNode`.
  Cuando se provee (warehouse), la vista rica delega en ese render (el warehouse pasa su
  `PackagesList` con agrupación de remesas + panel expandible + `RemittanceGroupToggle`).
  Cuando no se provee (bulk), la vista rica usa el render de tarjetas actual. La vista
  **simple** (fila de chips) es común a ambos.
- Orden de display: prop opcional `sortComparator?: (a: PackageInfo, b: PackageInfo) => number`
  para preservar el orden por sucursal/CP/carrier del warehouse (las bulk siguen en
  orden de escaneo).

## 4. Cambios en Entrada/Salida y `useWarehouseSession`

- Reemplazar `ScannerCard` + `PackagesList` por `<ScanInput mode="perScan" ...>` en
  ambas pantallas.
- `useWarehouseSession` **adelgaza**: deja de manejar `packages`, `scanInput`,
  `remittanceDialog` y la lógica de escaneo/dedup/stats de paquetes. Conserva: bodega
  efectiva, `operationalSubsidiaryId`, vehículo, choferes, `receivedByName`,
  `isSubmitting`/`runSubmit`, `safeSpeak`, y los modales que no son de remesa (atajos,
  detalle, firmas). El `handleScan` actual se transforma en la función `onScan` que se
  pasa a ScanInput (misma lógica: normaliza, valida local, `validateShipment`, decide
  `add`/`reject`/`remittance`).
- **Stats** (total/fedex/dhl/vencen hoy/alto valor/carga/cobros) se **derivan** de los
  paquetes que ScanInput emite por `onPackagesChange` (en la pantalla o en el hook
  adelgazado). Alimentan `WarehouseStatsRow`.
- **Remesa:** `onRemittance(masterTracking)` abre `WarehouseRemittanceDialog`; al escanear
  cada pieza (con validación/dedup de pieza como hoy), la pantalla llama
  `scanRef.current?.attachPieces(masterTracking, pieces)`.
- **Orden / PDF / Excel:** la pantalla ordena los paquetes recibidos (por
  sucursal/CP/carrier, como hoy) para el `sortComparator` del display y para
  generar PDF/Excel. Sin cambios de contenido en PDF/Excel.
- **Persistencia:** `storageKey="scan:inbound"` / `"scan:outbound"`; `clear()` en la ruta
  de éxito del guardado (igual que las bulk). Los paquetes del warehouse llevan datos ya
  validados del backend; al recargar se restauran sin re-validar (aceptable), y se
  limpian al guardar.
- Se conserva `isReadyToFinish`, la asignación de unidad/chofer, el tipo de salida
  (dispatch/traspaso) y el flujo de firmas/PDF/Excel tal cual.

## 5. Comportamientos que se preservan (no deben regresar)

- Validación por escaneo instantánea (FedEx recorte 12, DHL completo, avisos de estado).
- Duplicado FedEx → error; duplicado de guía maestra DHL → modal de remesa.
- Piezas de remesa (`pieces`) + piezas ya registradas (`existingPieces`) en el panel
  expandible; conteo por pieza en los stats.
- Orden del listado por sucursal/CP/carrier; agrupación de remesas + toggle.
- Cobros/alto valor/vencen hoy en los modales de detalle y en los stats.
- Cierre (firmas, unidad/chofer, dispatch/traspaso), PDF (`vehiculo`) y Excel manual,
  y la notificación por correo del backend — sin cambios.

## 6. Fuera de alcance

- Cambios de backend / endpoints / DTOs.
- Las pantallas bulk (ya migradas) — su modo `batch` y su vista rica de tarjetas no se
  tocan.
- Cambios de identidad visual más allá de mantener el acento `primary` ya establecido.

## 7. Verificación

Typecheck (`npx tsc --noEmit`, 0 errores nuevos en archivos tocados; baseline ~478; sin
`next lint`) + **smoke real obligatorio** (con app+backend+login) por pantalla:
1. Escaneo FedEx (recorte 12) y DHL (JJD/JD y numérica de 18) → validación instantánea.
2. **Pegar N guías** → cada una se valida por escaneo.
3. **Remesa DHL:** guía maestra re-escaneada → modal → escanear piezas → aparecen colgadas
   (panel expandible) y cuentan en stats.
4. Duplicado FedEx → error; guía no encontrada → error; aviso de estado.
5. Cobros / alto valor / vencen hoy correctos en stats y modales de detalle.
6. Alternar rica/simple; quitar guía; orden por CP/sucursal preservado.
7. **Persistencia:** recargar → se conservan; cambiar de pantalla (inbound↔outbound) →
   buffers aislados; guardar → `clear()` y el backend recibe el payload correcto
   (entrada/salida-ruta/traspaso), con correo.

## 8. Restricciones

- `output: export`: componentes cliente, sin API routes/Server Actions; `localStorage`
  solo tras montar (SSR-safe).
- Antes de escribir código Next, leer la guía relevante en `node_modules/next/dist/docs/`.
- Reutilizar `ScanInput`/`useScanBuffer`/`scan-normalize`, `PackagesList`,
  `WarehouseRemittanceDialog`, `WarehouseStatsRow`, `RemittancePiecesPanel`,
  `normalizeScannedCode`, `PackageInfo` — no reimplementar.
- No romper el modo `batch` de ScanInput (bulk screens dependen de él).
