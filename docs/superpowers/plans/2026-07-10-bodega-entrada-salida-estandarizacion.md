# Estandarización Entradas/Salidas a Bodega — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar Entrada y Salida a Bodega sobre una capa compartida (hook + componentes), con look idéntico, notificación unificada en backend, y todos los bugs confirmados resueltos.

**Architecture:** Backend NestJS: DTO tolerante + validación por servicio, entrada que separa normal/carga con historial, y un servicio único de notificación que re-hidrata envíos desde BD y genera PDF+Excel para entrada/salida-ruta/traspaso. Frontend Next (export estático): un hook `useWarehouseSession` y componentes compartidos que consumen ambas pantallas; `inbound-package.tsx` y `outbound-package.tsx` quedan finos.

**Tech Stack:** NestJS, TypeORM, jest (backend). Next.js (`output: export`), React, Tailwind, shadcn/ui, @react-pdf/renderer, exceljs (frontend).

## Global Constraints

- Frontend es `output: export` (SPA estática): **prohibido** API routes y Server Actions; toda lógica de servidor va al backend NestJS.
- Antes de escribir código Next, leer la guía relevante en `node_modules/next/dist/docs/` (regla de `AGENTS.md`: "This is NOT the Next.js you know").
- **No** modificar el `ValidationPipe` global en `pmy-api/src/main.ts`.
- Reutilizar componentes estándar existentes: `OperationHeader` (`@/components/shared/operation-header`), `PackagesList` (`@/components/shared/packages-list`), `StatCard` (`@/components/shared/stat-card`).
- Look unificado: un solo acento = `primary` de la app (bordes de card, foco del escáner, ícono del header); acciones en verde. Diferencia entre pantallas: solo título + ícono del header (`PackagePlus` entrada / `PackageMinus` salida).
- Rama de trabajo: `feat/bodega-estandarizacion` (ambos repos).
- Enums backend: usar `ShipmentStatusType`, `OutboundType` desde `src/common/enums`.
- Zona horaria backend para fechas de reportes: `America/Hermosillo` (constante ya existente en el servicio).

---

## FASE 1 — Backend (`D:\PMY\pmy-api`)

### Task 1: DTO de salida tolerante + validación dispatch/transfer en el servicio (bug #1)

**Files:**
- Modify: `src/warehouse/dto/create-outbound.dto.ts`
- Create: `src/warehouse/warehouse.validation.ts`
- Test: `src/warehouse/warehouse.validation.spec.ts`

**Interfaces:**
- Produces: `assertOutboundConsistency(dto: { type: OutboundType; kms?: number; routes?: unknown[]; destinationId?: string }): void` — lanza `BadRequestException` si faltan datos según el tipo.

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/warehouse/warehouse.validation.spec.ts
import { BadRequestException } from '@nestjs/common';
import { OutboundType } from 'src/common/enums/outbound-type.enum';
import { assertOutboundConsistency } from './warehouse.validation';

describe('assertOutboundConsistency', () => {
  it('acepta dispatch con kms y rutas', () => {
    expect(() =>
      assertOutboundConsistency({ type: OutboundType.DISPATCH, kms: 10, routes: ['r1'] }),
    ).not.toThrow();
  });

  it('rechaza dispatch sin rutas', () => {
    expect(() =>
      assertOutboundConsistency({ type: OutboundType.DISPATCH, kms: 10, routes: [] }),
    ).toThrow(BadRequestException);
  });

  it('rechaza dispatch sin kms', () => {
    expect(() =>
      assertOutboundConsistency({ type: OutboundType.DISPATCH, routes: ['r1'] }),
    ).toThrow(BadRequestException);
  });

  it('acepta transfer con destinationId y sin kms/rutas', () => {
    expect(() =>
      assertOutboundConsistency({ type: OutboundType.TRANSFER, destinationId: 'sucursal-1' }),
    ).not.toThrow();
  });

  it('rechaza transfer sin destinationId', () => {
    expect(() =>
      assertOutboundConsistency({ type: OutboundType.TRANSFER }),
    ).toThrow(BadRequestException);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `cd /d/PMY/pmy-api && npx jest src/warehouse/warehouse.validation.spec.ts`
Expected: FAIL — `Cannot find module './warehouse.validation'`.

- [ ] **Step 3: Implementar la validación**

```ts
// src/warehouse/warehouse.validation.ts
import { BadRequestException } from '@nestjs/common';
import { OutboundType } from 'src/common/enums/outbound-type.enum';

export function assertOutboundConsistency(dto: {
  type: OutboundType;
  kms?: number;
  routes?: unknown[];
  destinationId?: string;
}): void {
  if (dto.type === OutboundType.DISPATCH) {
    if (dto.kms === undefined || dto.kms === null || Number.isNaN(Number(dto.kms))) {
      throw new BadRequestException('El kilometraje inicial es obligatorio para una salida a ruta.');
    }
    if (!Array.isArray(dto.routes) || dto.routes.length === 0) {
      throw new BadRequestException('Debe seleccionar al menos una ruta para una salida a ruta.');
    }
    return;
  }
  if (dto.type === OutboundType.TRANSFER) {
    if (!dto.destinationId) {
      throw new BadRequestException('Debe seleccionar la sucursal destino para un traspaso.');
    }
    return;
  }
  throw new BadRequestException(`Tipo de salida '${dto.type}' no soportado.`);
}
```

Luego hacer opcionales `kms` y `routes` en el DTO:

```ts
// src/warehouse/dto/create-outbound.dto.ts  (reemplazar los decoradores de routes y kms)
    @IsOptional()
    @IsArray()
    routes?: string[];

    @IsOptional()
    @IsNumber()
    kms?: number;
```

(Agregar `IsOptional` al import de `class-validator` si no está; cambiar el tipo de `routes` de `Route[]` a `string[]` y quitar el import de `Route` si queda sin uso.)

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx jest src/warehouse/warehouse.validation.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Cablear la validación en el servicio**

En `src/warehouse/warehouse.service.ts`, dentro de `outbound(dto, userId)`, justo al inicio del `try` (antes de crear `WarehouseOutbound`), agregar:

```ts
      assertOutboundConsistency(dto);
```

Y el import arriba: `import { assertOutboundConsistency } from './warehouse.validation';`

- [ ] **Step 6: Commit**

```bash
cd /d/PMY/pmy-api
git add src/warehouse/dto/create-outbound.dto.ts src/warehouse/warehouse.validation.ts src/warehouse/warehouse.validation.spec.ts src/warehouse/warehouse.service.ts
git commit -m "fix(warehouse): traspaso ya no rompe por DTO; validación dispatch/transfer en servicio"
```

---

### Task 2: Entrada separa normal/carga, actualiza ambas tablas y registra historial (bug #2)

**Files:**
- Create: `src/warehouse/warehouse.helpers.ts`
- Test: `src/warehouse/warehouse.helpers.spec.ts`
- Modify: `src/warehouse/warehouse.service.ts:80-148` (método `create`)

**Interfaces:**
- Produces: `splitShipmentIds(shipments: { id: string; isCharge?: boolean }[]): { normalIds: string[]; chargeIds: string[] }`

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/warehouse/warehouse.helpers.spec.ts
import { splitShipmentIds } from './warehouse.helpers';

describe('splitShipmentIds', () => {
  it('separa normales y carga', () => {
    const res = splitShipmentIds([
      { id: 'a', isCharge: false },
      { id: 'b', isCharge: true },
      { id: 'c' },
    ]);
    expect(res.normalIds).toEqual(['a', 'c']);
    expect(res.chargeIds).toEqual(['b']);
  });

  it('maneja lista vacía', () => {
    expect(splitShipmentIds([])).toEqual({ normalIds: [], chargeIds: [] });
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `npx jest src/warehouse/warehouse.helpers.spec.ts`
Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar el helper**

```ts
// src/warehouse/warehouse.helpers.ts
export function splitShipmentIds(
  shipments: { id: string; isCharge?: boolean }[],
): { normalIds: string[]; chargeIds: string[] } {
  const normalIds: string[] = [];
  const chargeIds: string[] = [];
  for (const s of shipments || []) {
    if (s.isCharge) chargeIds.push(s.id);
    else normalIds.push(s.id);
  }
  return { normalIds, chargeIds };
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `npx jest src/warehouse/warehouse.helpers.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Usar el helper en `create` y agregar historial**

En `warehouse.service.ts`, reemplazar el bloque de "paso 3" del método `create` (el `if (shipmentIds.length > 0) { update(Shipment, {id In}, {status: EN_BODEGA}) }`) por:

```ts
      // 3. Separar normales vs carga y ponerlos EN_BODEGA en su tabla correspondiente,
      //    creando historial de estado para trazabilidad.
      const { normalIds, chargeIds } = splitShipmentIds(createWarehouseDto.shipments);
      const now = new Date();

      const setInWarehouse = async (
        ids: string[],
        entity: any,
        relationKey: 'shipment' | 'chargeShipment',
      ) => {
        if (ids.length === 0) return;
        await queryRunner.manager.update(entity, { id: In(ids) }, {
          status: ShipmentStatusType.EN_BODEGA,
        });
        const history = ids.map((id) =>
          queryRunner.manager.create(ShipmentStatus, {
            status: ShipmentStatusType.EN_BODEGA,
            notes: `Entrada a bodega (Recepción: ${savedReceiving.id})`,
            timestamp: now,
            [relationKey]: { id },
          }),
        );
        await queryRunner.manager.save(ShipmentStatus, history);
      };

      await setInWarehouse(normalIds, Shipment, 'shipment');
      await setInWarehouse(chargeIds, ChargeShipment, 'chargeShipment');
```

Agregar imports que falten: `splitShipmentIds` desde `./warehouse.helpers`, y `ShipmentStatus`, `ChargeShipment` ya están importados desde `src/entities` (verificar; si no, agregarlos). Eliminar la línea previa `const shipmentIds = createWarehouseDto.shipments.map(...)` si queda sin uso.

- [ ] **Step 6: Verificar compilación y specs**

Run: `npx jest src/warehouse` (deben pasar los specs de Task 1 y 2)
Run: `npx tsc --noEmit -p tsconfig.json` — Expected: sin errores nuevos en `warehouse.service.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/warehouse/warehouse.helpers.ts src/warehouse/warehouse.helpers.spec.ts src/warehouse/warehouse.service.ts
git commit -m "fix(warehouse): entrada marca carga EN_BODEGA y registra historial de estado"
```

---

### Task 3: Notificación unificada que re-hidrata envíos desde BD (bugs #3 backend y #7) + traspaso notifica

**Files:**
- Modify: `src/warehouse/warehouse.service.ts` (métodos `outbound`, `create`, `generateAndSendNotification`, `generateExcelBuffer`, `generatePdfBuffer`)
- Test: `src/warehouse/warehouse.helpers.spec.ts` (añadir casos)
- Modify: `src/warehouse/warehouse.helpers.ts`

**Interfaces:**
- Produces: `hydratePackageIds(shipments: { id: string }[]): string[]` — ids únicos para re-consultar.
- Produces (servicio, privado): `hydrateShipments(ids: string[]): Promise<HydratedPackage[]>` donde `HydratedPackage = { id; trackingNumber; dhlUniqueId?; recipientName; recipientAddress; recipientZip; recipientPhone; commitDateTime; isCharge; isHighValue; paymentAmount?: number }`.

- [ ] **Step 1: Test del helper de ids**

Añadir a `warehouse.helpers.spec.ts`:

```ts
import { splitShipmentIds, hydratePackageIds } from './warehouse.helpers';

describe('hydratePackageIds', () => {
  it('devuelve ids únicos', () => {
    expect(hydratePackageIds([{ id: 'a' }, { id: 'a' }, { id: 'b' }])).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 2: Correr y verificar fallo**

Run: `npx jest src/warehouse/warehouse.helpers.spec.ts`
Expected: FAIL — `hydratePackageIds` no exportado.

- [ ] **Step 3: Implementar `hydratePackageIds`**

Añadir a `warehouse.helpers.ts`:

```ts
export function hydratePackageIds(shipments: { id: string }[]): string[] {
  return Array.from(new Set((shipments || []).map((s) => s.id).filter(Boolean)));
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx jest src/warehouse/warehouse.helpers.spec.ts` — Expected: PASS.

- [ ] **Step 5: Agregar `hydrateShipments` al servicio**

En `warehouse.service.ts` añadir método privado que re-consulta datos del destinatario desde `Shipment` y `ChargeShipment`:

```ts
  private async hydrateShipments(ids: string[]): Promise<any[]> {
    if (!ids.length) return [];
    const [ships, charges] = await Promise.all([
      this.shipmentRepository.find({
        where: { id: In(ids) },
        select: {
          id: true, trackingNumber: true, dhlUniqueId: true,
          recipientName: true, recipientAddress: true, recipientZip: true,
          recipientPhone: true, commitDateTime: true, isHighValue: true,
          payment: { id: true, amount: true },
        },
        relations: ['payment'],
      }),
      this.chargeShipmentRepository.find({
        where: { id: In(ids) },
        select: {
          id: true, trackingNumber: true,
          recipientName: true, recipientAddress: true, recipientZip: true,
          recipientPhone: true, commitDateTime: true, isHighValue: true,
          payment: { id: true, amount: true },
        },
        relations: ['payment'],
      }),
    ]);
    const map = new Map<string, any>();
    ships.forEach((s) => map.set(s.id, { ...s, isCharge: false, paymentAmount: s.payment?.amount ?? null }));
    charges.forEach((c) => map.set(c.id, { ...c, isCharge: true, paymentAmount: c.payment?.amount ?? null }));
    // Conservar el orden de `ids`.
    return ids.map((id) => map.get(id)).filter(Boolean);
  }
```

- [ ] **Step 6: Re-hidratar en `generateAndSendNotification` (arregla #7)**

En `generateAndSendNotification(dispatch, shipments, outboundId)`, antes de generar Excel/PDF, reemplazar el uso directo de `shipments` por datos re-hidratados:

```ts
      const hydrated = await this.hydrateShipments(hydratePackageIds(shipments));
      const excelBuf = await this.generateExcelBuffer(fullDispatch, hydrated) ...
      const pdfBuf = await this.generatePdfBuffer(fullDispatch, hydrated) ...
```

Importar `hydratePackageIds` desde `./warehouse.helpers`. Quitar el `console.log("🚀 ... shipments")`.

- [ ] **Step 7: Unificar notificación para entrada y traspaso**

Crear un método `generateAndSendWarehouseNotification` que sirva a los tres casos, reutilizando `hydrateShipments` y los generadores. Diseño:

```ts
  private async generateAndSendWarehouseNotification(params: {
    kind: 'inbound' | 'dispatch' | 'transfer';
    entityId: string;               // id de WarehouseReceiving u WarehouseOutbound
    warehouseId: string;
    shipments: { id: string }[];
    dispatch?: PackageDispatch;     // solo dispatch (para folio/rutas/vehículo)
  }): Promise<void> {
    try {
      const hydrated = await this.hydrateShipments(hydratePackageIds(params.shipments));
      const header = await this.buildNotificationHeader(params); // sucursal, título, vehículo, rutas
      const excelBuf = await this.generateExcelBuffer(header, hydrated);
      const pdfBuf = await this.generatePdfBuffer(header, hydrated);
      const subsidiaryName = header.subsidiary?.name ?? 'Sucursal';
      const safeDate = new Date().toLocaleDateString('es-ES').replace(/\//g, '-');
      const label = params.kind === 'inbound' ? 'Entrada a Bodega'
        : params.kind === 'transfer' ? 'Traspaso' : 'Salida a Ruta';
      const pdfFile = this.createMockFile(pdfBuf, `${label}--${subsidiaryName}--${safeDate}.pdf`, 'application/pdf');
      const excelFile = this.createMockFile(excelBuf, `${label}--${subsidiaryName}--${safeDate}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      await this.sendEmailNotification(pdfFile, excelFile, subsidiaryName, params.kind === 'inbound' ? 'inbound' : 'outbound', params.entityId);
    } catch (error) {
      this.logger.error(`Error en notificación unificada (${params.kind}): ${error?.message}`, error?.stack);
    }
  }
```

Donde `buildNotificationHeader` resuelve la sucursal por `warehouseId` (o `dispatch.subsidiary`), el vehículo, rutas y folio cuando aplique, devolviendo un objeto con la misma forma que hoy consumen `generateExcelBuffer`/`generatePdfBuffer` (`{ subsidiary, vehicle?, routes?, trackingNumber? }`). Generalizar la firma de esos dos generadores para aceptar ese "header" en lugar de `PackageDispatch` estricto (los campos usados son `subsidiary?.name`, `vehicle?.name`, `routes?`, `trackingNumber`, todos opcionales — ya se leen con `?.`). Ajustar los títulos "SALIDA A RUTA" para que usen `header.title ?? 'SALIDA A RUTA'`.

- [ ] **Step 8: Disparar la notificación en los tres flujos**

En `outbound(...)`, tras el commit, disparar también para `transfer`:

```ts
      // Notificación fire-and-forget para dispatch y transfer.
      if (dto.type === 'dispatch' && dispatchResult) {
        this.generateAndSendWarehouseNotification({
          kind: 'dispatch', entityId: savedOutboundId, warehouseId: dto.warehouse,
          shipments: dto.shipments, dispatch: dispatchResult,
        }).catch((err) => this.logger.error(err?.message, err?.stack));
      } else if (dto.type === 'transfer') {
        this.generateAndSendWarehouseNotification({
          kind: 'transfer', entityId: savedOutboundId, warehouseId: dto.warehouse,
          shipments: dto.shipments,
        }).catch((err) => this.logger.error(err?.message, err?.stack));
      }
```

En `create(...)` (entrada), tras el commit, disparar la notificación de entrada:

```ts
      this.generateAndSendWarehouseNotification({
        kind: 'inbound', entityId: savedReceiving.id, warehouseId: createWarehouseDto.warehouse,
        shipments: createWarehouseDto.shipments,
      }).catch((err) => this.logger.error(err?.message, err?.stack));
```

(El `return savedReceiving;` se mantiene; la notificación es posterior al commit.)

- [ ] **Step 9: Verificar specs + typecheck**

Run: `npx jest src/warehouse`
Run: `npx tsc --noEmit -p tsconfig.json` — sin errores nuevos.

- [ ] **Step 10: Commit**

```bash
git add src/warehouse/warehouse.service.ts src/warehouse/warehouse.helpers.ts src/warehouse/warehouse.helpers.spec.ts
git commit -m "feat(warehouse): notificación unificada (entrada/ruta/traspaso) re-hidratando envíos desde BD"
```

---

### Task 4: Limpieza backend (código muerto y logs)

**Files:**
- Modify: `src/warehouse/warehouse.service.ts`
- Modify: `src/warehouse/warehouse.controller.ts`

- [ ] **Step 1: Eliminar método muerto y logs**

- Borrar el método `validateTrackingNumberResp1306` completo (`warehouse.service.ts:150-249`).
- Eliminar `console.log("🚀 ~ WarehouseService ~ generateAndSendNotification ~ shipments...")` si quedó.
- En `validateTrackingNumber`, dejar el parámetro `subsidiaryId` marcado como no usado (`_subsidiaryId`) o eliminarlo de la firma y del `controller` (mantener `context`). Si se elimina, actualizar la llamada en `validatePackage` del controller.

- [ ] **Step 2: Verificar build**

Run: `npx tsc --noEmit -p tsconfig.json` — Expected: sin errores.
Run: `npx jest src/warehouse` — Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/warehouse/warehouse.service.ts src/warehouse/warehouse.controller.ts
git commit -m "chore(warehouse): elimina método muerto y logs de debug"
```

---

## FASE 2 — Frontend (`D:\PMY\app-pmy`)

> Antes de empezar esta fase: leer `node_modules/next/dist/docs/` (guía de componentes cliente) como exige `AGENTS.md`.

### Task 5: Primitivas compartidas (helpers puros + resolveId)

**Files:**
- Create: `components/warehouse/shared/warehouse-utils.ts`
- Create: `components/warehouse/shared/resolve-id.ts`

**Interfaces:**
- Produces: `isToday(date: Date): boolean`, `isTomorrow(date: Date): boolean`, `checkIsWarehouse(val: unknown): boolean`, `trimFedexCode(raw: string): string`.
- Produces: `resolveId(x: unknown): string` — devuelve `x.id` si es objeto con id, o `String(x)`; `resolveName(x: unknown): string | undefined`.

- [ ] **Step 1: Crear `resolve-id.ts`**

```ts
// components/warehouse/shared/resolve-id.ts
export function resolveId(x: unknown): string {
  if (x && typeof x === 'object' && 'id' in (x as any)) {
    const inner = (x as any).id;
    if (inner && typeof inner === 'object' && 'id' in inner) return String(inner.id);
    return String(inner);
  }
  return String(x ?? '');
}

export function resolveName(x: unknown): string | undefined {
  if (x && typeof x === 'object') {
    const o = x as any;
    return o.name ?? o.nombre ?? (o.id && typeof o.id === 'object' ? o.id.name ?? o.id.nombre : undefined);
  }
  return undefined;
}
```

- [ ] **Step 2: Crear `warehouse-utils.ts`**

```ts
// components/warehouse/shared/warehouse-utils.ts
export const isToday = (date: Date) => new Date().toDateString() === new Date(date).toDateString();

export const isTomorrow = (date: Date) => {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return t.toDateString() === new Date(date).toDateString();
};

export const checkIsWarehouse = (val: any): boolean => {
  if (val && typeof val === 'object' && 'data' in val) return val.data[0] === 1;
  return Boolean(val);
};

/** FedEx: recorta códigos numéricos de >=20 dígitos a los últimos 12. DHL (con letras) pasa intacto. */
export const trimFedexCode = (raw: string): string => {
  const code = raw.trim().toUpperCase();
  return code.length >= 20 && /^\d+$/.test(code) ? code.slice(-12) : code;
};
```

- [ ] **Step 3: Verificar typecheck**

Run: `cd /d/PMY/app-pmy && npx tsc --noEmit` — Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add components/warehouse/shared/warehouse-utils.ts components/warehouse/shared/resolve-id.ts
git commit -m "feat(warehouse-ui): primitivas compartidas (utils + resolveId)"
```

---

### Task 6: Hook `useWarehouseSession` (concentra estado y lógica; arregla #4, #5, #6)

**Files:**
- Create: `components/warehouse/shared/use-warehouse-session.ts`

**Interfaces:**
- Consumes: `trimFedexCode`, `isToday`, `isTomorrow`, `checkIsWarehouse` (Task 5); `resolveId`, `resolveName` (Task 5); `validateShipment` (`@/lib/services/warehouse/warehouse`); `toPackageInfo`, `groupRemittances` (`@/components/warehouse/shared/warehouse-package-list.helpers`); `useSubsidiaries`, `useAuthStore`, `useBrowserVoice`.
- Produces:

```ts
export type WarehouseContext = 'inbound' | 'outbound';

export interface WarehouseShipment extends ScannedShipment {
  pieces?: string[];
  existingPieces?: string[];
  recipientName?: string;
  recipientAddress?: string;
}

export interface UseWarehouseSession {
  // refs
  inputRef: React.RefObject<HTMLInputElement>;
  pieceInputRef: React.RefObject<HTMLInputElement>;
  isClient: boolean;
  // packages + scan
  packages: WarehouseShipment[];
  scanInput: string;
  setScanInput: (v: string) => void;
  isScanning: boolean;
  error: string | null;
  handleScan: () => void;
  handleRemovePackage: (identifier: string) => void;
  // remesa
  remittanceDialog: RemittanceDialogState;
  setRemittanceDialog: React.Dispatch<React.SetStateAction<RemittanceDialogState>>;
  handlePieceScan: () => void;
  groupRemesas: boolean;
  setGroupRemesas: React.Dispatch<React.SetStateAction<boolean>>;
  // warehouse + transporte
  effectiveWarehouseId: string;
  effectiveWarehouseName: string;
  setEffectiveWarehouse: (id: string, name: string) => void;
  operationalSubsidiaryId: string;
  vehicleId: string;
  setVehicleId: (id: string) => void;
  driverIds: any[];
  setDriverIds: (ids: any[]) => void;
  derivedDriverName: string;
  receivedByName: string;
  setReceivedByName: (v: string) => void;
  // modales + derivados
  modals: WarehouseModals;
  toggleModal: (k: keyof WarehouseModals, v: boolean) => void;
  stats: {
    total: number; fedex: number; dhl: number;
    expiringToday: WarehouseShipment[]; highValue: WarehouseShipment[];
    cargo: WarehouseShipment[]; withCharges: WarehouseShipment[]; totalCharges: number;
  };
  sortedPackages: WarehouseShipment[];
  listPackages: WarehousePackageInfo[];
  // submit
  isSubmitting: boolean;
  runSubmit: (fn: () => Promise<void>) => Promise<void>; // guarda doble submit
  resetPackages: () => void;
  // voz
  safeSpeak: (t: string) => void;
}
```

- [ ] **Step 1: Implementar el hook**

Extraer a este hook la lógica hoy duplicada en `inbound-package.tsx` e `outbound-package.tsx`, con estas correcciones obligatorias:
- `handleScan` en `useCallback` con deps `[scanInput, packages, effectiveWarehouseId, context, safeSpeak]` (incluye `effectiveWarehouseId` — arregla #5). Usa `trimFedexCode`.
- `runSubmit(fn)`: si `isSubmitting` es `true`, retorna sin hacer nada; si no, marca `isSubmitting`, ejecuta `fn`, y en `finally` lo limpia (arregla #6).
- Stats con `useMemo` sobre `packages`.
- `operationalSubsidiaryId` con `useMemo([allSubsidiaries, effectiveWarehouseId])` usando `checkIsWarehouse`.
- `handleScan` recibe `context` (para `validateShipment(code, effectiveWarehouseId, context)` y avisos con `isToday/isTomorrow`).
- Teclado F1/F2/F3/ESC: mover al hook, pero **F2** (abrir finalizar) se delega vía callback opcional `onRequestFinish?: () => void` que el componente pasa (porque `isReadyToFinish` vive en el componente). Firma real del hook: `useWarehouseSession({ context, onRequestFinish }: { context: WarehouseContext; onRequestFinish?: () => void })`.

El cuerpo es la unión de la lógica existente (`inbound-package.tsx:105-483` y equivalente en outbound), parametrizada. Copiar `RemittanceDialogState` y `WarehouseModals` como tipos exportados aquí:

```ts
export type RemittanceDialogState = {
  isOpen: boolean; step: 'confirm' | 'scan'; masterTracking: string; pieceInput: string; error: string | null;
};
export type WarehouseModals = { shortcuts: boolean; expiringToday: boolean; highValue: boolean; charges: boolean; signatures: boolean };
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit` — Expected: sin errores en el hook (aún no consumido).

- [ ] **Step 3: Commit**

```bash
git add components/warehouse/shared/use-warehouse-session.ts
git commit -m "feat(warehouse-ui): hook useWarehouseSession (deps corregidas + guard anti doble-submit)"
```

---

### Task 7: Componentes compartidos de presentación (look unificado)

**Files:**
- Create: `components/warehouse/shared/warehouse-stats-row.tsx`
- Create: `components/warehouse/shared/scanner-card.tsx`
- Create: `components/warehouse/shared/transport-assignment-card.tsx`
- Create: `components/warehouse/shared/detail-modal.tsx`
- Create: `components/warehouse/shared/shortcuts-dialog.tsx`
- Create: `components/warehouse/shared/warehouse-remittance-dialog.tsx`
- Create: `components/warehouse/shared/signature-dialog.tsx`

**Interfaces (props):**
- `WarehouseStatsRow({ stats, onOpenExpiring, onOpenHighValue, onOpenCharges })` — usa `StatCard` de `@/components/shared/stat-card`. Card de carrier unificada (FedEx `#4d148c`, DHL `#d40511`).
- `ScannerCard({ title, inputRef, value, onChange, onScan, isScanning, error, disabled })` — acento `primary` (ring de foco `focus-visible:ring-primary`), botón "Agregar" con `bg-primary`.
- `TransportAssignmentCard({ vehicleId, onVehicleChange, driverIds, onDriversChange, subsidiaryId })` — `UnidadSelector` + `RepartidorSelector`.
- `DetailModal({ open, onOpenChange, title, description, packages })` — mover el `DetailModal` idéntico (hoy duplicado) aquí sin cambios de comportamiento.
- `ShortcutsDialog({ open, onOpenChange, finishActionLabel })` — el modal de atajos; `finishActionLabel` = "Finalizar Ingreso" / "Finalizar Salida".
- `WarehouseRemittanceDialog({ state, onStateChange, pieceInputRef, onPieceScan, onFocusScanner })` — el modal de remesa DHL (confirm/scan), acento `primary`.
- `SignatureDialog({ open, onOpenChange, variant, deliveredByLabel, deliveredByValue, receivedByLabel, receivedByValue, onReceivedByChange, extraTopSlot, onConfirm, isSubmitting, canConfirm, pdfDocument, excelButton })` — esqueleto común de firmas; deshabilita "Confirmar" con `!canConfirm || isSubmitting` (usa el guard). `pdfDocument` es el elemento `@react-pdf/renderer` para `PDFDownloadLink`; `excelButton` es un slot opcional.

- [ ] **Step 1: Crear los 7 componentes**

Para cada uno, extraer el JSX correspondiente de `inbound-package.tsx`/`outbound-package.tsx`, cambiando los colores de contexto (`red-*`/`orange-*`) por el acento unificado:
- Bordes de card: `border-primary/20`.
- Foco de inputs de escaneo: `focus-visible:ring-primary`.
- Botón "Agregar": `bg-primary hover:bg-primary/90 text-primary-foreground`.
- Botón finalizar/confirmar: se mantiene verde (`bg-green-600 hover:bg-green-700`).
- Ícono del header del modal de remesa: `text-primary`.

`DetailModal` y `ShortcutsDialog` se copian tal cual (ya son neutrales), agregando el prop de label donde se indica.

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit` — Expected: sin errores (componentes aún no consumidos).

- [ ] **Step 3: Commit**

```bash
git add components/warehouse/shared/warehouse-stats-row.tsx components/warehouse/shared/scanner-card.tsx components/warehouse/shared/transport-assignment-card.tsx components/warehouse/shared/detail-modal.tsx components/warehouse/shared/shortcuts-dialog.tsx components/warehouse/shared/warehouse-remittance-dialog.tsx components/warehouse/shared/signature-dialog.tsx
git commit -m "feat(warehouse-ui): componentes compartidos con look unificado (acento primary)"
```

---

### Task 8: Generalizar el generador de Excel del cliente

**Files:**
- Create: `components/warehouse/shared/warehouse-excel.ts` (mover desde `components/warehouse/inbound-package/excel-generator.ts`)
- Modify: importadores

**Interfaces:**
- Produces: `generateWarehouseExcel(session, sortedPackages, shouldDownload, opts?: { sheetName?: string; title?: string; fileNamePrefix?: string }): Promise<Buffer | void>`.

- [ ] **Step 1: Mover y parametrizar**

Copiar `excel-generator.ts` a `components/warehouse/shared/warehouse-excel.ts`. Añadir el 4º parámetro `opts` con defaults que reproducen el comportamiento actual (`sheetName: "Recepción de Envíos"`, `fileNamePrefix: "Recepcion_Bodega"`). Usar `opts.sheetName`/`opts.fileNamePrefix` donde hoy están los literales.

- [ ] **Step 2: Actualizar el import de entrada**

En `inbound-package.tsx`, cambiar `import { generateWarehouseExcel } from "./excel-generator"` por `import { generateWarehouseExcel } from "@/components/warehouse/shared/warehouse-excel"`. (Se completará al reescribir en Task 9.)

- [ ] **Step 3: Verificar typecheck**

Run: `npx tsc --noEmit` — Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add components/warehouse/shared/warehouse-excel.ts
git commit -m "refactor(warehouse-ui): mueve generador de Excel a shared y lo parametriza"
```

---

### Task 9: Reescribir `inbound-package.tsx` sobre la capa compartida

**Files:**
- Modify: `components/warehouse/inbound-package/inbound-package.tsx`
- Delete: `components/warehouse/inbound-package/excel-generator.ts` (ya movido)

**Interfaces:**
- Consumes: `useWarehouseSession` (Task 6), componentes compartidos (Task 7), `generateWarehouseExcel` (Task 8), `SessionState`/`PackageEntryPDF`.

- [ ] **Step 1: Reescribir el componente**

`InboundPackage` usa `useWarehouseSession({ context: 'inbound', onRequestFinish })`. Renderiza:
- `OperationHeader` (icon `PackagePlus`, "Entrada a Bodega") con `History` + `Keyboard` + `SucursalSelector` (`onlyWarehouses`).
- `WarehouseStatsRow`, `PackagesList` (con `RemittanceGroupToggle`), columna derecha: `ScannerCard`, `TransportAssignmentCard`, botón "FINALIZAR INGRESO".
- Diálogos: `WarehouseRemittanceDialog`, `ShortcutsDialog` (label "Finalizar Ingreso"), 3× `DetailModal`, `SignatureDialog` (variant inbound: "Entregado por (Operador)" = `derivedDriverName`, "Recibido por (Bodega)" = `receivedByName`).
- `isReadyToFinish` local: `packages.length>0 && vehicleId && driverIds.length>0 && effectiveWarehouseId`.
- Guardado con `runSubmit(async () => { await saveWarehouseInbound(buildInboundPayload()); resetPackages(); toast(...) })`. **La notificación por correo ya la hace el backend** — eliminar `handleSendEmailNotification`, el `window.open` del PDF y la llamada a `sendNotificationEmail`.
- `PackageEntryPDF` en el `SignatureDialog` con prop **`vehiculo`** (no `vehicle`) — arregla #3 en el cliente. Excel manual vía `generateWarehouseExcel(session, sortedPackages, true)`.

`buildInboundPayload()` (idéntico al actual `handleCompleteSession`): `{ warehouse, vehicle: resolveId(vehicleId), drivers: driverIds.map(resolveId), shipments: packages.map(p => ({ id, trackingNumber, shipmentType, isCharge, remittances: (p.pieces||[]).map(t => ({ pieceTrackingNumber: t, shipmentId: p.id })) })) }`.

- [ ] **Step 2: Eliminar el archivo viejo de Excel**

```bash
git rm components/warehouse/inbound-package/excel-generator.ts
```

- [ ] **Step 3: Verificar typecheck + lint**

Run: `npx tsc --noEmit` — Expected: sin errores.
Run: `npm run lint` — Expected: sin errores nuevos.

- [ ] **Step 4: Verificación visual (navegador)**

Levantar dev (`preview_start` name del launch.json o `next dev`), abrir `/bodega/entrada`. Verificar: escaneo FedEx agrega; guía DHL repetida abre modal de remesa; stats correctas; acento `primary`; finalizar guarda y limpia; botón "Confirmar" se bloquea durante el guardado.

- [ ] **Step 5: Commit**

```bash
git add components/warehouse/inbound-package/inbound-package.tsx
git commit -m "refactor(warehouse-ui): entrada a bodega sobre capa compartida + look unificado; PDF con vehiculo"
```

---

### Task 10: Reescribir `outbound-package.tsx` sobre la capa compartida

**Files:**
- Modify: `components/warehouse/outbound-package/outbound-package.tsx`

**Interfaces:**
- Consumes: `useWarehouseSession` (Task 6), componentes compartidos (Task 7), `generateWarehouseExcel` (Task 8).

- [ ] **Step 1: Reescribir el componente**

`OutboundPackage` usa `useWarehouseSession({ context: 'outbound', onRequestFinish })` y mantiene estado propio: `outputType`, `selectedRutas`, `selectedKms`, `destinationSubsidiary`/`Name`. Renderiza igual que entrada + card única "Tipo de Salida" (dispatch/transfer con kms/rutas o sucursal destino).
- `isReadyToFinish` en `useMemo` con **todas** las deps correctas: `[packages.length, vehicleId, driverIds.length, effectiveWarehouseId, outputType, destinationSubsidiary, selectedRutas, selectedKms]` (arregla #4). Reglas: transfer → requiere `destinationSubsidiary`; dispatch → requiere `selectedRutas.length>0` y `selectedKms>0`.
- Eliminar los `console.log` de debug y `StatCard`/`DetailModal` locales.
- Guardado con `runSubmit`; `buildOutboundPayload()` = el actual (con spreads condicionales de `kms`/`routes` para dispatch y `destinationId` para transfer, usando `resolveId`).
- `SignatureDialog` variant outbound: título dinámico ruta/traspaso; "Entregado por (Bodega)" y "Recibido por (Chofer/Sucursal Destino)"; slot superior con destino en transfer. Excel manual vía `generateWarehouseExcel(session, sortedPackages, true, { sheetName: 'Salida', title: 'Salida de Bodega', fileNamePrefix: 'Salida_Bodega' })`. `PackageEntryPDF` con prop `vehiculo`.

- [ ] **Step 2: Verificar typecheck + lint**

Run: `npx tsc --noEmit` — Expected: sin errores.
Run: `npm run lint` — Expected: sin errores nuevos.

- [ ] **Step 3: Verificación visual (navegador)**

Abrir `/bodega/salida`. Verificar: layout idéntico a entrada (acento `primary`); "Tipo de Salida" alterna ruta/traspaso; en traspaso el botón finalizar se habilita al elegir destino; guardar traspaso **no** da 400; doble clic no duplica.

- [ ] **Step 4: Commit**

```bash
git add components/warehouse/outbound-package/outbound-package.tsx
git commit -m "refactor(warehouse-ui): salida de bodega sobre capa compartida; look unificado; isReadyToFinish deps corregidas"
```

---

### Task 11: Limpieza del servicio front

**Files:**
- Modify: `lib/services/warehouse/warehouse.ts`

- [ ] **Step 1: Retirar `sendNotificationEmail` del uso automático**

Confirmar (grep) que `sendNotificationEmail` ya no se importa en `inbound-package.tsx` tras Task 9. Dejar la función exportada solo si algún otro módulo la usa; si no, eliminarla. Ejecutar:

Run: `cd /d/PMY/app-pmy && grep -rn "sendNotificationEmail" --include=*.tsx --include=*.ts app components lib | grep -v "warehouse.ts"`
Expected: sin resultados → eliminar la función y su export.

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit` — Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add lib/services/warehouse/warehouse.ts
git commit -m "chore(warehouse): notificación por correo ahora la envía el backend"
```

---

### Task 12: Verificación integral end-to-end

**Files:** (ninguno — verificación)

- [ ] **Step 1: Build backend**

Run: `cd /d/PMY/pmy-api && npx tsc --noEmit -p tsconfig.json && npx jest src/warehouse`
Expected: sin errores; todos los specs de warehouse PASS.

- [ ] **Step 2: Build frontend**

Run: `cd /d/PMY/app-pmy && npm run lint && npx tsc --noEmit`
Expected: sin errores nuevos. (Opcional, pesado: `npm run build`.)

- [ ] **Step 3: Pruebas funcionales guiadas (con backend corriendo)**

Recorrer y confirmar la sección 7 del spec:
1. Entrada: escaneo FedEx (recorte 12 díg.), duplicado, aviso de estado.
2. Remesa DHL: maestra → modal → piezas → agrupado/expandible.
3. Entrada con paquete de **carga** → queda `EN_BODEGA` + historial (revisar BD/`ShipmentStatus`).
4. Correo de entrada: PDF con vehículo correcto.
5. Salida a ruta: guarda; correo con Nombre/Dirección/CP/Teléfono **no vacíos**.
6. **Traspaso**: guarda sin 400 y envía correo.
7. Doble clic en "Confirmar": una sola operación.
8. Historial entrada/salida OK.

- [ ] **Step 4: Commit final (si hubo ajustes) y resumen**

```bash
git add -A && git commit -m "test(warehouse): verificación integral de estandarización entrada/salida" || echo "sin cambios"
```

---

## Self-review (cobertura del spec)

- Bug #1 (traspaso 400) → Task 1. #2 (carga/historial) → Task 2. #3 (PDF vehículo) → Task 9 (cliente) + Task 3 (correo backend). #4 (deps isReadyToFinish) → Task 10. #5 (deps handleScan) → Task 6. #6 (doble submit) → Task 6/9/10. #7 (correo salida sin destinatario) → Task 3.
- Notificación unificada backend (entrada/ruta/traspaso) → Task 3. Traspaso notifica → Task 3.
- Capa compartida (hook + componentes) → Tasks 5–8; consumo → Tasks 9–10.
- Look unificado (acento `primary`) → Task 7 (componentes) aplicado en 9–10.
- Limpieza código muerto/logs → Task 4 (backend) + Task 10/11 (front).
- Fuera de alcance (ValidationPipe global, scoping por sucursal, reenvío manual, dedup de guías) → respetado.
