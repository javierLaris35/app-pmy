# Integración de ScanInput en Bodega (Entrada/Salida) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que Entrada y Salida a Bodega usen el `ScanInput` unificado (pegar-N, vista rica/simple, auto-persistencia) conservando la validación por escaneo y el flujo de remesa DHL.

**Architecture:** `ScanInput` gana un modo `perScan` (delega la validación de cada código a un `onScan` del padre y el flujo de remesa a `onRemittance`, con handle `attachPieces`); es dueño del buffer/persistencia/display. El warehouse conserva su cerebro (validación `validateShipment` + modal de remesa) en helpers puros y en la pantalla; `useWarehouseSession` adelgaza. Sin cambios de backend.

**Tech Stack:** Next.js `output: export` (SPA estática), React 19, Tailwind, lucide-react. Reutiliza `PackageInfo`, `normalizeScannedCode`/`trimFedexCode`, `validateShipment`, `PackagesList`, `WarehouseRemittanceDialog`, `WarehouseStatsRow`, `RemittancePiecesPanel`, `toPackageInfo`/`groupRemittances`.

## Global Constraints

- Front `output: export`: componentes cliente (`"use client"`), sin API routes/Server Actions; `localStorage` solo tras montar (SSR-safe).
- **No hay cambios de backend / endpoints / DTOs.**
- **No romper el modo `batch` de `ScanInput`** (lo usan inventario/desembarque/dispatch/devoluciones). Todo lo nuevo es aditivo; `mode` default `"batch"`.
- Acento visual `primary`; semánticos donde informan (vence hoy=rojo, mañana=ámbar, cobro=azul info, carrier FedEx `#4d148c` / DHL `#ffcc00`+`#d40511`).
- Verificación: repo baseline ~478 errores `tsc` PRE-EXISTENTES; estándar = **0 errores nuevos** en archivos tocados (`npx tsc --noEmit 2>&1 | grep "<archivo>"`). **No** hay lint (`next lint` removido en Next 16). Lógica pura → `npx tsx` (RED→GREEN); comportamiento UI → smoke real en navegador (lo hace el usuario donde no haya dev server/login).
- Rama: `feat/warehouse-scanner-unify`.
- `storageKey`: `scan:inbound` (Entrada), `scan:outbound` (Salida). `clear()` en la ruta de éxito del guardado.

---

### Task 1: Extender `ScanInput` con modo `perScan`

**Files:**
- Modify: `components/scanner/scan-input.tsx`

**Interfaces:**
- Produces (aditivo):
```ts
export type ScanResolution =
  | { action: "add"; package: PackageInfo }
  | { action: "reject"; message: string }
  | { action: "remittance"; masterTracking: string };

// ScanInputProps gana (todos opcionales):
//   mode?: "batch" | "perScan"                       (default "batch")
//   onScan?: (code: string, current: PackageInfo[]) => Promise<ScanResolution>
//   onRemittance?: (masterTracking: string) => void
//   renderRichList?: (packages: PackageInfo[], api: { onRemove: (id: string) => void }) => React.ReactNode
//   sortComparator?: (a: PackageInfo, b: PackageInfo) => number
// ScanInputHandle gana:
//   attachPieces: (masterTracking: string, pieces: string[]) => void
```

- [ ] **Step 1: Añadir tipos y props**

En `scan-input.tsx`, exportar `ScanResolution` (arriba) y ampliar `ScanInputProps` con: `mode?: "batch" | "perScan"` (default `"batch"`), `onScan?`, `onRemittance?`, `renderRichList?`, `sortComparator?` (firmas de arriba). Ampliar `ScanInputHandle` con `attachPieces`. Añadir estado local: `const [scanError, setScanError] = useState<string | null>(null)` y `const [isScanning, setIsScanning] = useState(false)`.

- [ ] **Step 2: Procesamiento en modo perScan**

Reemplazar `processTrackingLines` para ramificar por `mode`. En `batch` queda igual (usa `addNewCodes`). En `perScan`, procesar los códigos **secuencialmente** llamando a `onScan`:

```tsx
const processTrackingLines = useCallback(
  async (text: string) => {
    const normalizedLines = text
      .split("\n")
      .map((l) => normalizeScannedCode(l)?.code ?? null)
      .filter(Boolean) as string[];
    if (!normalizedLines.length) return;

    if (mode === "batch") {
      setPackages((prev) => {
        const toAdd = addNewCodes(prev, normalizedLines);
        return toAdd.length ? [...prev, ...toAdd] : prev;
      });
      setCurrentScan("");
      return;
    }

    // perScan: delega cada código al padre (validación + remesa).
    setIsScanning(true);
    setScanError(null);
    try {
      for (const code of normalizedLines) {
        // Snapshot del buffer actual para que el padre detecte duplicados.
        const current = packagesRef.current;
        const res = await onScan?.(code, current);
        if (!res) continue;
        if (res.action === "add") {
          setPackages((prev) => [res.package, ...prev]);
        } else if (res.action === "reject") {
          setScanError(res.message);
        } else if (res.action === "remittance") {
          onRemittance?.(res.masterTracking);
        }
      }
    } finally {
      setIsScanning(false);
      setCurrentScan("");
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  },
  [mode, onScan, onRemittance, setPackages]
);
```

Añadir un `packagesRef` que espeje `packages` (para leer el buffer actual dentro del loop sin recrear el callback):
```tsx
const packagesRef = useRef<PackageInfo[]>(packages);
useEffect(() => { packagesRef.current = packages; }, [packages]);
```
`handleKeyDown`/`handlePaste` ya llaman `processTrackingLines`; como ahora es async, invocarlas con `void processTrackingLines(...)`.

- [ ] **Step 3: `attachPieces` en el handle + banner de error/scanning**

Ampliar `useImperativeHandle`:
```tsx
attachPieces: (masterTracking: string, pieces: string[]) => {
  setPackages((prev) =>
    prev.map((p) =>
      p.trackingNumber === masterTracking
        ? { ...p, pieces: Array.from(new Set([...(p.pieces || []), ...pieces])) }
        : p
    )
  );
},
```
(`PackageInfo` ya admite `pieces?: string[]` vía `WarehousePackageInfo`; si `pieces` no está en `PackageInfo`, tratarlo como `(p as WarehousePackageInfo)` — ver `warehouse-package-list.helpers.ts`.)

Renderizar, cuando `mode === "perScan"`, un banner de error debajo de la zona de escaneo:
```tsx
{mode === "perScan" && scanError && (
  <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded-md flex items-start gap-2 border border-red-100">
    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
    <span className="font-medium">{scanError}</span>
  </div>
)}
```
(importar `AlertTriangle` de lucide). En la zona de escaneo, deshabilitar el textarea mientras `isScanning` (spinner opcional).

- [ ] **Step 4: `renderRichList` y `sortComparator`**

Calcular la lista a mostrar con el comparador opcional:
```tsx
const displayPackages = useMemo(
  () => (sortComparator ? [...packages].sort(sortComparator) : packages),
  [packages, sortComparator]
);
```
En la rama `view === "rich"`: si `renderRichList` está definido, renderizar `renderRichList(displayPackages, { onRemove: removeById })` en lugar de la `<ul>` de tarjetas por defecto (y omitir el pie de `MetricChip`, que en warehouse lo cubre `WarehouseStatsRow`). Si no, comportamiento actual (tarjetas) pero iterando `displayPackages`. La vista `simple` también itera `displayPackages`.

- [ ] **Step 5: Verificar typecheck (batch intacto)**

Run: `cd /d/PMY/app-pmy && npx tsc --noEmit 2>&1 | grep -E "scanner/scan-input"`
Expected: sin salida (0 errores nuevos). Confirmar que los consumidores `batch` (p. ej. `inventory-form.tsx`) siguen compilando: `npx tsc --noEmit 2>&1 | grep -E "inventory-form|unloading-form|package-dispatch-form|unified-collection-return-form" | wc -l` no debe aumentar respecto al baseline.

- [ ] **Step 6: Commit**

```bash
git add components/scanner/scan-input.tsx
git commit -m "feat(scanner): ScanInput modo perScan (onScan/onRemittance/attachPieces, renderRichList, sortComparator)"
```

---

### Task 2: Helpers puros de escaneo del warehouse

**Files:**
- Create: `components/warehouse/shared/warehouse-scan.ts`
- Test (temporal): `scripts/verify-warehouse-scan.ts`

**Interfaces:**
- Consumes: `ScanResolution` (Task 1), `validateShipment` (tipo), `toPackageInfo`, `trimFedexCode`, `PackageInfo`, `WarehouseShipment`.
- Produces:
```ts
export function sortWarehousePackages(a: PackageInfo, b: PackageInfo): number;
export function computeWarehouseStats(packages: PackageInfo[]): {
  total: number; fedex: number; dhl: number;
  expiringToday: PackageInfo[]; highValue: PackageInfo[];
  cargo: PackageInfo[]; withCharges: PackageInfo[]; totalCharges: number;
};
// Factory: inyecta validate (para test) y devuelve el resolvedor por escaneo.
export function makeResolveWarehouseScan(deps: {
  validate: (code: string, warehouseId: string, ctx: "inbound" | "outbound") => Promise<any>;
  warehouseId: string;
  context: "inbound" | "outbound";
  speak?: (t: string) => void;
}): (code: string, current: PackageInfo[]) => Promise<ScanResolution>;
```

- [ ] **Step 1: Escribir el script de verificación (RED)**

```ts
// scripts/verify-warehouse-scan.ts
import { makeResolveWarehouseScan, sortWarehousePackages, computeWarehouseStats } from "../components/warehouse/shared/warehouse-scan";

let ok = true;
const assert = (c: boolean, m: string) => { if (!c) { ok = false; console.log("FAIL:", m); } else console.log("ok:", m); };

const mk = (validateResult: any) => makeResolveWarehouseScan({
  validate: async () => validateResult, warehouseId: "w1", context: "inbound",
});

(async () => {
  // add: código nuevo válido
  const addRes = await mk({ isValid: true, trackingNumber: "111111111111", shipmentType: "fedex", commitDateTime: new Date().toISOString(), existingPieces: [] })("111111111111", []);
  assert(addRes.action === "add" && (addRes as any).package.trackingNumber === "111111111111", "nuevo válido -> add");

  // reject: no encontrado
  const rejRes = await mk({ isValid: false, reason: "no existe" })("222", []);
  assert(rejRes.action === "reject", "inválido -> reject");

  // reject: dup FedEx local
  const dupFedex = await mk({ isValid: true })("111111111111", [{ trackingNumber: "111111111111", shipmentType: "fedex" } as any]);
  assert(dupFedex.action === "reject", "dup fedex local -> reject");

  // remittance: dup DHL maestra local
  const dupDhl = await mk({ isValid: true })("JD004600012672343626", [{ trackingNumber: "JD004600012672343626", shipmentType: "dhl" } as any]);
  assert(dupDhl.action === "remittance", "dup dhl maestra -> remittance");

  // stats + sort
  const pkgs: any[] = [
    { trackingNumber: "b", shipmentType: "fedex", recipientZip: "85000", subsidiary: { name: "B" } },
    { trackingNumber: "a", shipmentType: "dhl", recipientZip: "85000", subsidiary: { name: "A" }, isHighValue: true },
  ];
  const stats = computeWarehouseStats(pkgs);
  assert(stats.total === 2 && stats.fedex === 1 && stats.dhl === 1 && stats.highValue.length === 1, "stats cuenta carrier/altoValor");
  const sorted = [...pkgs].sort(sortWarehousePackages);
  assert(sorted[0].subsidiary.name === "A", "sort por sucursal");

  console.log(ok ? "ALL OK" : "FAILURES"); process.exit(ok ? 0 : 1);
})();
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `npx tsx scripts/verify-warehouse-scan.ts`  (el repo es ESM → usar `tsx`, no `ts-node`)
Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar los helpers**

```ts
// components/warehouse/shared/warehouse-scan.ts
import { PackageInfo } from "@/lib/types";
import { toPackageInfo, WarehousePackageInfo } from "@/components/warehouse/shared/warehouse-package-list.helpers";
import { isToday } from "@/components/warehouse/shared/warehouse-utils";
import type { ScanResolution } from "@/components/scanner/scan-input";

const countPieces = (p: WarehousePackageInfo) =>
  1 + (p.pieces?.length || 0) + (p.existingPieces?.length || 0);

export function computeWarehouseStats(packages: PackageInfo[]) {
  const ps = packages as WarehousePackageInfo[];
  const expiringToday = ps.filter((p) => isToday(new Date(p.commitDateTime as any)));
  const highValue = ps.filter((p) => p.isHighValue);
  const cargo = ps.filter((p) => p.isCharge);
  const withCharges = ps.filter((p) => !!p.payment);
  const totalCharges = withCharges.reduce((a, p) => a + (Number(p.payment?.amount) || 0), 0);
  const byCarrier = (c: string) =>
    ps.reduce((a, p) => ((p.shipmentType || "").toLowerCase() === c ? a + countPieces(p) : a), 0);
  const total = ps.reduce((a, p) => a + countPieces(p), 0);
  return { total, fedex: byCarrier("fedex"), dhl: byCarrier("dhl"), expiringToday, highValue, cargo, withCharges, totalCharges };
}

export function sortWarehousePackages(a: PackageInfo, b: PackageInfo): number {
  const sub = (p: any) => String(p?.subsidiary?.name ?? "S/N").trim();
  const cmpB = sub(a).localeCompare(sub(b));
  if (cmpB !== 0) return cmpB;
  const zip = (p: any) => String(p?.recipientZip ?? "").trim();
  const cmpZ = zip(a).localeCompare(zip(b), undefined, { numeric: true });
  if (cmpZ !== 0) return cmpZ;
  return String(a.shipmentType ?? "").toUpperCase().localeCompare(String(b.shipmentType ?? "").toUpperCase());
}

export function makeResolveWarehouseScan(deps: {
  validate: (code: string, warehouseId: string, ctx: "inbound" | "outbound") => Promise<any>;
  warehouseId: string;
  context: "inbound" | "outbound";
  speak?: (t: string) => void;
}) {
  const { validate, warehouseId, context, speak } = deps;
  return async (code: string, current: PackageInfo[]): Promise<ScanResolution> => {
    // 1. Defensa local.
    const localMatch = current.find(
      (p) => p.trackingNumber === code || (p as WarehousePackageInfo).dhlUniqueId === code,
    );
    if (localMatch) {
      if ((localMatch as WarehousePackageInfo).dhlUniqueId === code) {
        speak?.("Pieza repetida."); return { action: "reject", message: `La pieza ${code} ya está en la lista.` };
      }
      if (localMatch.trackingNumber === code) {
        if ((localMatch.shipmentType || "").toLowerCase() === "dhl") {
          speak?.("Guía principal detectada. Confirme remesa.");
          return { action: "remittance", masterTracking: localMatch.trackingNumber };
        }
        speak?.("Guía repetida."); return { action: "reject", message: `Guía ya en lista: ${code}` };
      }
    }
    // 2. Backend.
    let result: any;
    try { result = await validate(code, warehouseId, context); }
    catch { speak?.("Error de sistema"); return { action: "reject", message: "Error de servidor" }; }
    if (result?.isValid === false) {
      speak?.("No encontrado."); return { action: "reject", message: result.reason || "No encontrado en sistema" };
    }
    // 3. Dedup post-backend.
    const dup = current.find((p) => {
      if (p.trackingNumber !== result.trackingNumber) return false;
      const a = (p as WarehousePackageInfo).dhlUniqueId, b = result.dhlUniqueId;
      if (a && b) return a === b;
      return true;
    });
    if (dup) {
      if ((result.shipmentType || "").toLowerCase() === "dhl") {
        speak?.("Guía repetida. Confirme remesa."); return { action: "remittance", masterTracking: result.trackingNumber };
      }
      speak?.("Paquete duplicado."); return { action: "reject", message: `El paquete con guía ${result.trackingNumber} ya está en la lista.` };
    }
    // 4. Válido → PackageInfo listo para mostrar.
    const pkg = toPackageInfo({
      ...result,
      recipientZip: result.recipientZip ? String(result.recipientZip).trim() : "",
      commitDateTime: new Date(result.commitDateTime),
      isCharge: result.isCharge || false,
      hasPayment: result.hasPayment || false,
      paymentAmount: result.paymentAmount || 0,
      pieces: [],
      existingPieces: result.existingPieces || [],
      recipientName: result.recipientName || "",
      recipientAddress: result.recipientAddress || "",
    });
    if (result.statusWarning) speak?.("Atención, revise el estado del paquete.");
    else if ((result.existingPieces || []).length > 0) speak?.("Guía existente. Escanee piezas restantes.");
    else speak?.(isToday(new Date(result.commitDateTime)) ? "Vence hoy" : "Registrado");
    return { action: "add", package: pkg };
  };
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx tsx scripts/verify-warehouse-scan.ts`
Expected: `ALL OK`, exit 0.

- [ ] **Step 5: Borrar el script temporal y commit**

```bash
rm scripts/verify-warehouse-scan.ts
git add components/warehouse/shared/warehouse-scan.ts
git commit -m "feat(warehouse): helpers puros de escaneo (resolve/stats/sort) para ScanInput perScan"
```

---

### Task 3: Migrar `inbound-package.tsx` a `ScanInput` perScan

**Files:**
- Modify: `components/warehouse/inbound-package/inbound-package.tsx`

**Interfaces:**
- Consumes: `ScanInput`/`ScanInputHandle`/`ScanResolution` (Task 1); `makeResolveWarehouseScan`/`computeWarehouseStats`/`sortWarehousePackages` (Task 2); `PackagesList`, `WarehouseRemittanceDialog`, `WarehouseStatsRow`, `useWarehouseSession`.

- [ ] **Step 1: Leer el estado actual**

Leer `inbound-package.tsx` completo. Hoy usa `useWarehouseSession` para `packages`, `scanInput`, `handleScan`, `remittanceDialog`, `handlePieceScan`, `stats`, `sortedPackages`, `listPackages`, y renderiza `ScannerCard` + `PackagesList` + `WarehouseRemittanceDialog` + `WarehouseStatsRow`.

- [ ] **Step 2: Introducir ScanInput + estado local de paquetes**

- Añadir `const scanRef = useRef<ScanInputHandle>(null)` y `const [packages, setPackages] = useState<PackageInfo[]>([])` en la pantalla (alimentado por `onPackagesChange` de ScanInput).
- Construir el resolvedor: `const resolveScan = useMemo(() => makeResolveWarehouseScan({ validate: validateShipment, warehouseId: s.effectiveWarehouseId, context: "inbound", speak: s.safeSpeak }), [s.effectiveWarehouseId])`.
- Estado de remesa local: `const [remittance, setRemittance] = useState<{ open: boolean; step: "confirm"|"scan"; master: string; pieceInput: string; error: string|null }>(...)`. `onRemittance = (master) => setRemittance({ open:true, step:"confirm", master, pieceInput:"", error:null })`. El handler de pieza deduplica contra el paquete y llama `scanRef.current?.attachPieces(master, [piece])`.
- Reemplazar `ScannerCard` + `PackagesList` por:
```tsx
<ScanInput
  ref={scanRef}
  mode="perScan"
  storageKey="scan:inbound"
  defaultView="rich"
  label="Escáner de Entrada"
  onScan={resolveScan}
  onRemittance={onRemittance}
  onPackagesChange={setPackages}
  sortComparator={sortWarehousePackages}
  renderRichList={(pkgs, { onRemove }) => (
    <PackagesList
      packages={s.groupRemesas ? groupRemittances(pkgs) : pkgs}
      onRemove={onRemove}
      renderExpanded={(pkg) => (hasRemittancePieces(pkg) ? <RemittancePiecesPanel pkg={pkg} /> : null)}
      maxHeightClass="max-h-[640px]"
      emptyTitle="Sin paquetes escaneados"
      emptyDescription="Escanee un código de barras para comenzar el ingreso."
    />
  )}
/>
```
(importar `groupRemittances`, `hasRemittancePieces`, `RemittancePiecesPanel` de los helpers; mantener el `RemittanceGroupToggle` usando `s.groupRemesas`/`s.setGroupRemesas`).

- [ ] **Step 3: Stats, orden, payload, cierre**

- Stats: `const stats = useMemo(() => computeWarehouseStats(packages), [packages])`; pasar a `WarehouseStatsRow` y a los `DetailModal` (vencen hoy/alto valor/cobros) igual que hoy.
- `isReadyToFinish`: `packages.length > 0 && !!s.vehicleId && s.driverIds.length > 0 && !!s.effectiveWarehouseId`.
- `buildInboundPayload()`: usar `[...packages].sort(sortWarehousePackages)` y mapear (id/trackingNumber/shipmentType/isCharge + `remittances` desde `pkg.pieces`), idéntico al actual pero leyendo de `packages` local.
- PDF/Excel: construir la sesión para `PackageEntryPDF`/`generateWarehouseExcel` desde `[...packages].sort(sortWarehousePackages)` (mismo contenido que hoy; `vehiculo={s.vehicleId}`).
- Guardado: `s.runSubmit(async () => { await saveWarehouseInbound(buildInboundPayload()); scanRef.current?.clear(); setPackages([]); s.toggleModal("signatures", false); toast(...) })` — **`scanRef.current?.clear()` en la ruta de éxito** (evita guías colgadas).
- Teclado F1: enfocar el escáner con `scanRef.current?.focus()` (mover el manejo de F1 a la pantalla o pasar `onFocusScanner`); ESC cierra remesa/modales.

- [ ] **Step 4: Verificar typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "inbound-package"`
Expected: sin salida (0 errores nuevos).

- [ ] **Step 5: Smoke en navegador (si hay dev server/login)**

`/bodega/entrada`: escanear FedEx/DHL (validación instantánea), pegar N, remesa maestra→piezas (aparecen en el panel + cuentan en stats), duplicado→error, cobros/vencen hoy en stats/modales, alternar rica/simple, quitar, recargar→persiste, guardar→limpia + backend OK. Si no hay dev server/login, anotar y diferir al usuario.

- [ ] **Step 6: Commit**

```bash
git add components/warehouse/inbound-package/inbound-package.tsx
git commit -m "refactor(bodega-entrada): usa ScanInput perScan (pegar-N, rica/simple, persistencia)"
```

---

### Task 4: Migrar `outbound-package.tsx` a `ScanInput` perScan

**Files:**
- Modify: `components/warehouse/outbound-package/outbound-package.tsx`

**Interfaces:**
- Consumes: iguales que Task 3, `context: "outbound"`.

- [ ] **Step 1: Leer el estado actual**

Leer `outbound-package.tsx`. Igual que inbound pero conserva su estado propio (`outputType`, `selectedRutas`, `selectedKms`, `destinationSubsidiary`) y su card "Tipo de Salida".

- [ ] **Step 2: Introducir ScanInput (idéntico patrón a Task 3)**

Mismo cableado que Task 3 con: `storageKey="scan:outbound"`, `context:"outbound"`, `label="Escáner de Salida"`, `renderRichList` con `emptyDescription="Escanee un código de barras para comenzar la salida."`. `scanRef`/`packages` locales, `resolveScan` con `context:"outbound"`, `onRemittance`/pieza igual.

- [ ] **Step 3: Stats, isReadyToFinish, payload, cierre**

- Stats: `computeWarehouseStats(packages)`.
- `isReadyToFinish` (`useMemo`, deps completas): transfer → `destinationSubsidiary`; dispatch → `selectedRutas.length>0 && selectedKms>0`; ambos → `packages.length>0 && vehicleId && driverIds.length>0 && effectiveWarehouseId`.
- `buildOutboundPayload()`: idéntico al actual (base + spreads dispatch/transfer con `resolveId`), leyendo de `packages` local ordenado con `sortWarehousePackages`.
- Guardado: `s.runSubmit(async () => { await saveWarehouseOutbound(buildOutboundPayload()); scanRef.current?.clear(); setPackages([]); setSelectedRutas([]); setSelectedKms(0); s.toggleModal("signatures", false) })` — `clear()` en éxito.
- PDF `vehiculo={s.vehicleId}`; Excel `generateWarehouseExcel(session, sorted, true, { sheetName:"Salida", fileNamePrefix:"Salida_Bodega" })`.

- [ ] **Step 4: Verificar typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "outbound-package"`
Expected: sin salida.

- [ ] **Step 5: Smoke en navegador (si aplica)**

`/bodega/salida`: como Task 3 + traspaso (guarda sin 400 + correo) y salida a ruta. Anotar si no hay dev server/login.

- [ ] **Step 6: Commit**

```bash
git add components/warehouse/outbound-package/outbound-package.tsx
git commit -m "refactor(bodega-salida): usa ScanInput perScan (pegar-N, rica/simple, persistencia)"
```

---

### Task 5: Adelgazar `useWarehouseSession` + verificación integral

**Files:**
- Modify: `components/warehouse/shared/use-warehouse-session.ts`

- [ ] **Step 1: Confirmar qué siguen usando las pantallas**

Run: `cd /d/PMY/app-pmy && grep -nE "s\.(packages|scanInput|setScanInput|handleScan|handleRemovePackage|remittanceDialog|setRemittanceDialog|handlePieceScan|stats|sortedPackages|listPackages|inputRef|pieceInputRef|groupRemesas|setGroupRemesas)\b" components/warehouse/inbound-package/inbound-package.tsx components/warehouse/outbound-package/outbound-package.tsx`
Los que ya NO aparezcan son candidatos a eliminar del hook.

- [ ] **Step 2: Eliminar del hook lo que quedó sin uso**

Quitar de `useWarehouseSession` (y de la interfaz `UseWarehouseSession`) los miembros que el grep confirme sin consumidores: `packages`, `scanInput`/`setScanInput`, `isScanning`, `error`, `handleScan`, `handleRemovePackage`, `remittanceDialog`/`setRemittanceDialog`, `handlePieceScan`, `stats`, `sortedPackages`, `listPackages`, y el estado/efectos asociados (incluido el `useEffect` de teclado si la pantalla ya lo maneja, y el auto-focus de piezas). **Conservar**: `effectiveWarehouseId/Name`, `setEffectiveWarehouse`, `operationalSubsidiaryId`, `vehicleId`/`setVehicleId`, `driverIds`/`setDriverIds`, `derivedDriverName`, `receivedByName`/`setReceivedByName`, `modals`/`toggleModal` (menos lo de remesa), `isSubmitting`/`runSubmit`, `resetPackages` (ahora sin packages → renombrar/ajustar a lo que quede, o dejar reset de transporte), `safeSpeak`, `isClient`. Si algún miembro se conserva pero cambió de forma, actualizar ambas pantallas en el mismo commit para no romper.

- [ ] **Step 3: Verificación integral**

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | wc -l` → ≤ 478 (sin errores nuevos).
Run: `npx tsc --noEmit 2>&1 | grep -E "use-warehouse-session|inbound-package|outbound-package|scan-input|warehouse-scan"` → sin salida.
Run: `grep -rn "ScannerCard" components/warehouse` → solo la definición si aún se usa en algún lado; si quedó sin consumidores, considerar eliminarla (verificar con grep antes).

- [ ] **Step 4: Smoke integral (navegador, usuario)**

Recorrer §7 del spec en entrada y salida: validación por escaneo, pegar-N, remesa, cobros/vencen hoy, rica/simple, persistencia+aislamiento (inbound↔outbound con `scan:inbound`/`scan:outbound`), y guardar→clear→backend OK (entrada/ruta/traspaso + correo).

- [ ] **Step 5: Commit**

```bash
git add components/warehouse/shared/use-warehouse-session.ts
git commit -m "refactor(warehouse): adelgaza useWarehouseSession (escaneo/paquetes ahora en ScanInput)"
```

---

## Self-review (cobertura del spec)

- §3 extensión ScanInput (perScan, onScan/onRemittance/attachPieces, renderRichList, sortComparator, banner error/scanning) → Task 1.
- §4 warehouse delega + hook adelgaza + stats derivados + remesa vía attachPieces + orden/PDF/Excel + persistencia + clear → Tasks 3/4 (pantallas) + Task 5 (hook).
- Helpers puros (resolve/stats/sort) → Task 2.
- §5 comportamientos preservados (validación por escaneo, dup FedEx/remesa DHL, existingPieces, orden, cobros, cierre/PDF/Excel/correo) → Tasks 2 (resolve), 3/4 (wiring), verificación §7.
- §6 fuera de alcance (backend, bulk, modo batch) → respetado (Task 1 aditivo, batch intacto; ninguna tarea toca backend ni pantallas bulk).
- §7 verificación (typecheck 0-nuevos + tsx pura + smoke real) → pasos por tarea + Task 5.
- Persistencia por pantalla `scan:inbound`/`scan:outbound` + `clear()` en éxito → Tasks 3/4.
