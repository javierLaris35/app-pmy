# Estandarización de Entradas y Salidas a Bodega — Diseño

Fecha: 2026-07-10
Estado: Aprobado (pendiente de plan de implementación)
Autor: Arquitectura (revisión asistida)

## 1. Contexto y objetivo

Los módulos **Entrada a Bodega** y **Salida de Bodega** comparten ~80% de código
duplicado y han divergido en estructura, estilo y arquitectura de notificación.
Además arrastran bugs confirmados (uno rompe por completo el traspaso). El objetivo
es **estandarizar de raíz** ambos flujos —frontend y backend— sobre una capa
compartida, **unificar el look visual**, y **resolver todos los bugs** detectados.

Repos afectados:
- Frontend: `D:\PMY\app-pmy` (Next.js con `output: export`, SPA estática — **prohibido**
  API routes / Server Actions; todo va al backend NestJS).
- Backend: `D:\PMY\pmy-api` (NestJS + TypeORM).

Archivos ancla actuales:
- `app/bodega/entrada/page.tsx`, `app/bodega/salida/page.tsx`
- `components/warehouse/inbound-package/inbound-package.tsx`
- `components/warehouse/outbound-package/outbound-package.tsx`
- `components/warehouse/shared/warehouse-package-list.helpers.tsx`
- `components/warehouse/warehouse-history-dialog.tsx`
- `components/package-entry-pdf.tsx`
- `lib/services/warehouse/warehouse.ts`
- `pmy-api/src/warehouse/*` (controller, service, dtos)

## 2. Decisiones tomadas

1. **Alcance: refactor profundo.** Hook compartido + componentes compartidos; entrada
   y salida quedan como capas delgadas.
2. **Notificación unificada en backend.** Ambos flujos (entrada, salida-ruta, traspaso)
   generan PDF+Excel y envían correo desde el servidor. El cliente solo dispara.
3. **Look unificado idéntico (un solo color de acento).** Mismo sistema visual en
   ambas pantallas. Acento único = `primary` de la app (bordes de card, foco del
   escáner, ícono del header). Acciones en verde (confirmar/finalizar). La única
   diferencia entre pantallas es el **título + ícono** del `OperationHeader`.
4. **El traspaso también notifica** por correo (hoy no lo hace).
5. **`ValidationPipe` global NO se toca** (riesgo para otros módulos); se endurecen
   los DTOs.

## 3. Bugs confirmados a resolver

| # | Severidad | Descripción | Ubicación |
|---|-----------|-------------|-----------|
| 1 | Alta | **Traspaso roto (400).** `CreateOutboundDto` exige `kms` y `routes`; el front los omite en traspaso y `ValidationPipe()` rechaza. | `create-outbound.dto.ts`, `outbound-package.tsx` |
| 2 | Alta | **Entrada no marca "en bodega" la Carga ni registra historial.** `update(Shipment, {id In...})` no toca `ChargeShipment`; no crea `ShipmentStatus`. | `warehouse.service.ts:create` |
| 3 | Media | **PDF de correo de Entrada pierde el vehículo.** Se pasa `vehicle=` pero el componente espera `vehiculo=`. | `inbound-package.tsx:562`, `package-entry-pdf.tsx:33` |
| 4 | Media | **`isReadyToFinish` (salida) con deps obsoletas** (`selectedRutas`/`selectedKms` fuera del array). | `outbound-package.tsx:258` |
| 5 | Media | **`handleScan` (entrada) captura `effectiveWarehouseId` obsoleto** (falta en deps). | `inbound-package.tsx:459` |
| 6 | Media | **Doble submit posible:** "Confirmar" no se deshabilita durante el guardado. | ambos componentes |
| 7 | Alta | **PDF/Excel de "Salida a Ruta" sale con Nombre/Dirección/CP/Teléfono en blanco:** el backend genera con `dto.shipments` (sin datos del destinatario) en vez de re-consultar BD. | `warehouse.service.ts:generate*Buffer` |

Código muerto / limpieza: `validateTrackingNumberResp1306`, parámetro `subsidiaryId`
no usado en la validación, `session.routes`/`session.initialKms` sin uso, `console.log`
de debug (front y back), `StatCard`/`DetailModal` locales duplicados.

## 4. Arquitectura objetivo — Frontend

### 4.1 Capa compartida nueva (`components/warehouse/shared/`)

**`use-warehouse-session.ts`** — hook núcleo que concentra todo lo hoy duplicado:
- Estado: `session`, `scanInput`, `isScanning`, `error`, `remittanceDialog`,
  `groupRemesas`, `modals`, bodega efectiva + nombre, `operationalSubsidiaryId`,
  `isSubmitting`.
- Lógica: `safeSpeak`, atajos de teclado (F1/F2/F3/ESC), `handleScan`,
  `handlePieceScan`, `handleRemovePackage`, `sortedPackages`, `listPackages`,
  stats (total/fedex/dhl/vencenHoy/altoValor/carga/cobros).
- **Parametrización** — sólo difieren dos cosas entre entrada y salida:
  - `context: 'inbound' | 'outbound'` (afecta `validateShipment` y avisos).
  - `validateReady(session, extras) => boolean` — regla de habilitación de cierre.
  - `buildPayload(session, extras) => dto` — arma el cuerpo de guardado.
- Todas las dependencias de `useCallback`/`useMemo` correctas (arregla #4 y #5).
- Expone `isSubmitting` y bloquea reentradas en el guardado (arregla #6).

**Componentes compartidos** (todos con el sistema visual unificado; sin color por
contexto):
- `warehouse-stats-row.tsx` — las 6 tarjetas (Total, Carrier FedEx/DHL, Vencen Hoy,
  Alto Valor, Carga, Cobros) usando el `StatCard` compartido (`@/components/shared/stat-card`).
- `scanner-card.tsx` — input de escáner + error.
- `transport-assignment-card.tsx` — `UnidadSelector` + `RepartidorSelector`.
- `remittance-dialog.tsx` — modal remesa DHL (confirm/scan).
- `shortcuts-dialog.tsx` — atajos de teclado.
- `detail-modal.tsx` — tabla de detalle (vencen/alto valor/cobros).
- `signature-dialog.tsx` — esqueleto de firmas común; labels y campos por contexto.
- `resolve-id.ts` — helper `resolveId(x)` para normalizar `Driver/Vehicle/Route`
  (`id` puede venir como objeto o string) y eliminar los `as any`.

### 4.2 Componentes finos

- `inbound-package.tsx`: `OperationHeader` (PackagePlus, "Entrada a Bodega") +
  `WarehouseStatsRow` + `PackagesList` + columna derecha (`ScannerCard`,
  `TransportAssignmentCard`, botón finalizar) + diálogos compartidos. Usa el hook
  con `context: 'inbound'`, `validateReady` = paquetes+vehículo+chofer+bodega,
  `buildPayload` = DTO de entrada.
- `outbound-package.tsx`: igual, con `OperationHeader` (PackageMinus, "Salida de
  Bodega") + su card única **"Tipo de Salida"** (dispatch/transfer, kms, rutas,
  sucursal destino). Usa el hook con `context: 'outbound'`, `validateReady` que
  contempla dispatch vs transfer, `buildPayload` condicional.

### 4.3 Servicio front (`lib/services/warehouse/warehouse.ts`)
- Se conserva `validateShipment`, `saveWarehouseInbound`, `saveWarehouseOutbound`,
  `getInboundHistory`, `getOutboundHistory`.
- Se **retira** `sendNotificationEmail` del flujo automático (la notificación pasa a
  backend). Puede quedar un endpoint de reenvío manual si se decide después (fuera de
  alcance de esta iteración salvo indicación).

## 5. Arquitectura objetivo — Backend

### 5.1 DTOs
- `CreateOutboundDto`: `kms` y `routes` → `@IsOptional()`. La exigencia de
  `kms`/`routes` para `dispatch` y de `destinationId` para `transfer` se valida en el
  servicio con mensajes claros (`BadRequestException`). **Arregla #1.**

### 5.2 Entrada (`create`)
- Separar `shipments` en normales vs carga (por `isCharge`), y:
  - `Shipment` → `EN_BODEGA` para ids normales.
  - `ChargeShipment` → `EN_BODEGA` para ids de carga.
  - Crear registros `ShipmentStatus` de historial para ambos (nota "Entrada a
    bodega"). **Arregla #2.**
- Remesas de entrada: guardar sólo las nuevas (evitar duplicar `existingPieces`);
  considerar guard de unicidad por `(pieceTrackingNumber, shipmentId)`.

### 5.3 Notificación unificada
- Un método/servicio único `generateAndSendWarehouseNotification({ kind, entityId })`
  que, tras el commit y en **fire-and-forget**:
  1. **Re-hidrata los envíos desde BD por id** (recipientName/Address/Zip/Phone,
     payment, etc.) — no confía en el DTO delgado. **Arregla #7.**
  2. Genera **PDF + Excel** en servidor (generalizando los generadores actuales para
     soportar entrada, salida-ruta y traspaso).
  3. Envía correo a la sucursal (y copia) vía `MailService`.
- Se invoca para **entrada, salida-ruta y traspaso** (traspaso ahora notifica).
- Errores de notificación no afectan la transacción ya confirmada (se loguean).

### 5.4 Limpieza backend
- Eliminar `validateTrackingNumberResp1306` (muerto) y el parámetro `subsidiaryId`
  no usado en `validateTrackingNumber` (o cablearlo si se decide scoping — fuera de
  alcance por ahora).
- Quitar `console.log` de debug.

## 6. Sistema visual unificado

- Mismo layout/tipografía/espaciado y componentes en ambas pantallas.
- Acento único = `primary` de la app: bordes de card, anillo de foco del escáner,
  color del ícono del header. Sin rojo/naranja por contexto.
- Botones de acción en verde (confirmar/finalizar), semántico y común.
- Carrier card idéntica en ambas.
- Diferenciador de pantalla: sólo título + ícono del `OperationHeader`
  (`PackagePlus` vs `PackageMinus`).

## 7. Estrategia de verificación

Refactor sin cambio de comportamiento observable (salvo los bugs corregidos):
1. Comparar pantalla de entrada y salida antes/después (layout equivalente,
   acento unificado).
2. Escaneo FedEx (recorte a 12 dígitos), duplicado, y aviso de estado.
3. Remesa DHL: guía maestra → modal → agregar piezas → vista agrupada/expandible.
4. **Traspaso**: hoy responde 400; debe guardar y notificar correctamente.
5. **Salida a ruta**: el correo debe traer Nombre/Dirección/CP/Teléfono (no vacíos).
6. **Entrada con paquete de carga**: debe quedar `EN_BODEGA` y con historial.
7. Doble clic en "Confirmar": una sola entrada/salida.
8. Historial (entrada/salida) sigue funcionando.

## 8. Fuera de alcance (por ahora)

- Cambios al `ValidationPipe` global.
- Scoping de validación por sucursal (`subsidiaryId`) — se documenta pero no se cablea.
- Endpoint de reenvío manual de notificación.
- Deduplicación/limpieza de guías duplicadas a nivel de datos.

## 9. Restricciones de implementación

- El front es `output: export`: **nada** de API routes ni Server Actions; toda lógica
  de servidor va al backend NestJS.
- Antes de escribir código Next, leer la guía correspondiente en
  `node_modules/next/dist/docs/` (regla del repo `AGENTS.md`: "This is NOT the Next.js
  you know").
- Reutilizar `OperationHeader`, `PackagesList` y `StatCard` compartidos (estándar de
  UI ya establecido).
