# Escáner unificado (pantallas bulk) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un solo componente `ScanInput` configurable (escaneo uno/pegar N, normalización FedEx/DHL, vista rica/simple conmutable con default por pantalla, auto-persistencia por `storageKey`) que reemplaza las variantes de escaneo bulk en desembarque, dispatch, inventario y devoluciones.

**Architecture:** Un componente cliente `ScanInput` + un hook de persistencia `useScanBuffer(storageKey)` (localStorage, aislado por pantalla) + helpers puros de dedup/match extraídos. Conserva el contrato de validación push-back (`onPackagesChange` → el padre valida → `ref.updateValidatedPackages`). Migración casi drop-in por pantalla.

**Tech Stack:** Next.js `output: export` (SPA estática), React, Tailwind, lucide-react, `lib/tracking/normalize-scan.ts`, `PackageInfo` de `@/lib/types`.

## Global Constraints

- Front es `output: export` (SPA estática): **prohibido** API routes y Server Actions; toda lógica de servidor va al backend NestJS.
- Componentes cliente (`"use client"`). Leer `localStorage` **solo tras montar** (SSR-safe: `output: export` prerenderiza) para evitar hydration mismatch.
- Reutilizar `normalizeScannedCode`/`isValidScannedCode` (`@/lib/tracking/normalize-scan`) — NO reimplementar la normalización. Usar el tipo `PackageInfo` de `@/lib/types`.
- Normalización mixta FedEx/DHL **siempre** activa (se elimina el flag `multiCarrier`).
- Acento visual = `primary`; colores semánticos solo donde informan (vence hoy=rojo, mañana=ámbar, cobro=azul info). Botón Copiar en `primary`.
- Verificación: el repo tiene ~484 errores `tsc` PRE-EXISTENTES; estándar = **0 errores nuevos** en archivos tocados (`npx tsc --noEmit` y grep del archivo). **No** existe lint (`next lint` removido en Next 16) — no ejecutarlo. Para lógica pura, verificación ejecutable vía `npx ts-node` (RED→GREEN). Comportamiento de UI/persistencia: smoke real en navegador.
- Rama: `feat/unified-scanner`.
- `storageKey` por pantalla (asignadas en las tareas): `scan:inventario`, `scan:desembarque`, `scan:desembarque-wizard`, `scan:dispatch-close`, y las que se determinen para devoluciones/dispatch-form.

---

### Task 1: Helpers puros de dedup y match (`scan-normalize.ts`)

**Files:**
- Create: `components/scanner/scan-normalize.ts`
- Test (script ejecutable, temporal): `scripts/verify-scan-normalize.ts`

**Interfaces:**
- Produces:
  - `variantOf(code: string): string` — devuelve la variante JJD↔JD del código (o el mismo si no aplica).
  - `addNewCodes(existing: PackageInfo[], normalizedCodes: string[]): PackageInfo[]` — agrega solo códigos no presentes (por `trackingNumber`/`dhlUniqueId` y su variante JJD/JD), devolviendo SOLO los nuevos `PackageInfo` pendientes (`isValid:false, isPendingValidation:true`).
  - `matchValidatedPackage(local: PackageInfo, validated: PackageInfo[]): PackageInfo | null` — empareja un paquete local con su versión validada por `trackingNumber`/variante/`dhlUniqueId`.

- [ ] **Step 1: Escribir el script de verificación (RED)**

```ts
// scripts/verify-scan-normalize.ts
import { variantOf, addNewCodes, matchValidatedPackage } from '../components/scanner/scan-normalize';

let ok = true;
const assert = (cond: boolean, msg: string) => { if (!cond) { ok = false; console.log('FAIL:', msg); } else console.log('ok:', msg); };

// variantOf
assert(variantOf('JJD123') === 'JD123', 'JJD->JD');
assert(variantOf('JD123') === 'JJD123', 'JD->JJD');
assert(variantOf('398705305877') === '398705305877', 'fedex sin variante');

// addNewCodes: no duplica por variante
const existing = [{ id: 'a', trackingNumber: 'JD123', isValid: true } as any];
const added = addNewCodes(existing, ['JJD123', '111111111111']);
assert(added.length === 1 && added[0].trackingNumber === '111111111111', 'dedup por variante, agrega solo el nuevo');
assert(added[0].isPendingValidation === true && added[0].isValid === false, 'nuevo queda pendiente');

// matchValidatedPackage
const local = { id: 'x', trackingNumber: 'JJD999', isPendingValidation: true } as any;
const validated = [{ trackingNumber: 'JD999', commitDateTime: '2026-07-11', isValid: true } as any];
const m = matchValidatedPackage(local, validated);
assert(!!m && m!.commitDateTime === '2026-07-11', 'match por variante JJD/JD');

console.log(ok ? 'ALL OK' : 'FAILURES'); process.exit(ok ? 0 : 1);
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `cd /d/PMY/app-pmy && npx ts-node -r tsconfig-paths/register scripts/verify-scan-normalize.ts`
Expected: FAIL — módulo `scan-normalize` no existe.

- [ ] **Step 3: Implementar los helpers**

```ts
// components/scanner/scan-normalize.ts
import { PackageInfo } from "@/lib/types";

/** DHL: el lector entrega "JJD", la BD guarda "JD". Devuelve la variante opuesta. */
export function variantOf(code: string): string {
  const c = String(code || "").trim().toUpperCase();
  if (c.startsWith("JJD")) return c.substring(1);      // JJD... -> JD...
  if (c.startsWith("JD")) return "J" + c;              // JD...  -> JJD...
  return c;
}

/** Claves de dedup de un paquete: su tracking, su dhlUniqueId, y las variantes JJD/JD de ambos. */
function keysOf(p: PackageInfo): string[] {
  const raw = [p.trackingNumber, (p as any).dhlUniqueId].filter(Boolean).map((k) => String(k).trim().toUpperCase());
  return raw.flatMap((k) => [k, variantOf(k)]);
}

/**
 * Devuelve SOLO los códigos nuevos como PackageInfo pendientes. Un código no se
 * agrega si él o su variante JJD/JD ya existe en `existing` o entre los recién
 * agregados en esta misma llamada (pegado múltiple).
 */
export function addNewCodes(existing: PackageInfo[], normalizedCodes: string[]): PackageInfo[] {
  const seen = new Set<string>(existing.flatMap(keysOf));
  const toAdd: PackageInfo[] = [];
  for (const code of normalizedCodes) {
    const c = String(code || "").trim().toUpperCase();
    if (!c) continue;
    if (seen.has(c) || seen.has(variantOf(c))) continue;
    seen.add(c);
    seen.add(variantOf(c));
    toAdd.push({
      id: `tmp-${Date.now()}-${Math.random()}`,
      trackingNumber: c,
      isValid: false,
      isPendingValidation: true,
    } as PackageInfo);
  }
  return toAdd;
}

/** Empareja un paquete local con su versión validada (por tracking/variante/dhlUniqueId). */
export function matchValidatedPackage(local: PackageInfo, validated: PackageInfo[]): PackageInfo | null {
  const localKeys = new Set(keysOf(local));
  const found = validated.find((v) => keysOf(v).some((k) => localKeys.has(k)));
  return found ? ({ ...found, isPendingValidation: false } as PackageInfo) : null;
}
```

- [ ] **Step 4: Correr y verificar que pasa**

Run: `npx ts-node -r tsconfig-paths/register scripts/verify-scan-normalize.ts`
Expected: `ALL OK`, exit 0.

- [ ] **Step 5: Borrar el script temporal y commit**

```bash
rm scripts/verify-scan-normalize.ts
git add components/scanner/scan-normalize.ts
git commit -m "feat(scanner): helpers puros de dedup y match JJD/JD"
```

---

### Task 2: Hook de persistencia `useScanBuffer(storageKey)`

**Files:**
- Create: `components/scanner/use-scan-buffer.ts`

**Interfaces:**
- Consumes: `PackageInfo` (`@/lib/types`).
- Produces:
```ts
export type ScanView = "rich" | "simple";
export interface ScanBuffer {
  packages: PackageInfo[];
  setPackages: (updater: PackageInfo[] | ((prev: PackageInfo[]) => PackageInfo[])) => void;
  view: ScanView;
  setView: (v: ScanView) => void;
  clear: () => void;
  hydrated: boolean; // true tras leer localStorage en cliente
}
export function useScanBuffer(storageKey: string, defaultView?: ScanView): ScanBuffer;
```

- [ ] **Step 1: Implementar el hook (SSR-safe)**

```ts
// components/scanner/use-scan-buffer.ts
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { PackageInfo } from "@/lib/types";

export type ScanView = "rich" | "simple";
export interface ScanBuffer {
  packages: PackageInfo[];
  setPackages: (u: PackageInfo[] | ((prev: PackageInfo[]) => PackageInfo[])) => void;
  view: ScanView;
  setView: (v: ScanView) => void;
  clear: () => void;
  hydrated: boolean;
}

const keyFor = (storageKey: string) => `scanbuf:${storageKey}`;

export function useScanBuffer(storageKey: string, defaultView: ScanView = "rich"): ScanBuffer {
  const [packages, setPackagesState] = useState<PackageInfo[]>([]);
  const [view, setViewState] = useState<ScanView>(defaultView);
  const [hydrated, setHydrated] = useState(false);
  const loadedKey = useRef<string | null>(null);

  // Cargar desde localStorage al montar / cambiar storageKey (solo cliente).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(keyFor(storageKey));
      if (raw) {
        const parsed = JSON.parse(raw) as { packages?: PackageInfo[]; view?: ScanView };
        setPackagesState(Array.isArray(parsed.packages) ? parsed.packages : []);
        if (parsed.view === "rich" || parsed.view === "simple") setViewState(parsed.view);
      } else {
        setPackagesState([]);
        setViewState(defaultView);
      }
    } catch {
      setPackagesState([]);
    }
    loadedKey.current = storageKey;
    setHydrated(true);
  }, [storageKey]); // defaultView intencionalmente fuera: es solo valor inicial

  // Persistir en cada cambio (solo tras hidratar, para no pisar con el estado inicial).
  useEffect(() => {
    if (typeof window === "undefined" || !hydrated || loadedKey.current !== storageKey) return;
    try {
      window.localStorage.setItem(keyFor(storageKey), JSON.stringify({ packages, view }));
    } catch {
      /* cuota llena / modo privado: persistencia best-effort */
    }
  }, [packages, view, hydrated, storageKey]);

  const setPackages = useCallback(
    (u: PackageInfo[] | ((prev: PackageInfo[]) => PackageInfo[])) => setPackagesState(u as any),
    [],
  );
  const setView = useCallback((v: ScanView) => setViewState(v), []);
  const clear = useCallback(() => {
    setPackagesState([]);
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(keyFor(storageKey));
    } catch { /* noop */ }
  }, [storageKey]);

  return { packages, setPackages, view, setView, clear, hydrated };
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `cd /d/PMY/app-pmy && npx tsc --noEmit 2>&1 | grep "scanner/use-scan-buffer"`
Expected: sin salida (0 errores del archivo nuevo).

- [ ] **Step 3: Commit**

```bash
git add components/scanner/use-scan-buffer.ts
git commit -m "feat(scanner): hook useScanBuffer (persistencia por storageKey, SSR-safe)"
```

---

### Task 3: Componente `ScanInput` (vistas rica/simple, toggle, copiar, quitar)

**Files:**
- Create: `components/scanner/scan-input.tsx`
- Reference (para adaptar la vista rica y el markup existente): `components/barcode-input/barcode-scanner-input-list.tsx`

**Interfaces:**
- Consumes: `useScanBuffer`/`ScanView` (Task 2); `addNewCodes`, `matchValidatedPackage`, `variantOf` (Task 1); `normalizeScannedCode` (`@/lib/tracking/normalize-scan`); `PackageInfo` (`@/lib/types`).
- Produces:
```ts
export interface ScanInputHandle {
  focus: () => void;
  clear: () => void;
  getInputElement: () => HTMLTextAreaElement | null;
  updateValidatedPackages: (validated: PackageInfo[]) => void;
}
export interface ScanInputProps {
  storageKey: string;                 // requerida
  defaultView?: "rich" | "simple";    // default "rich"
  id?: string;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  hasErrors?: boolean;
  onPackagesChange?: (packages: PackageInfo[]) => void;
  onTrackingNumbersChange?: (trackingNumbers: string) => void;
  onHasDueTomorrow?: (has: boolean) => void;
}
// export const ScanInput: forwardRef<ScanInputHandle, ScanInputProps>
```

- [ ] **Step 1: Implementar el componente**

Construir `ScanInput` como `forwardRef<ScanInputHandle, ScanInputProps>` "use client". Estructura:

1. **Estado vía hook:** `const { packages, setPackages, view, setView, clear, hydrated } = useScanBuffer(storageKey, defaultView)`.
2. **Refs:** `textareaRef`, `packagesListRef`, `wasPastedRef`, `copyTimeoutRef`, `copied` state, `currentScan` state.
3. **Entrada:** copiar de `barcode-scanner-input-list.tsx` `processTrackingLines`, `handlePaste`, `handleKeyDown` — pero usando los helpers puros:
   - Normalizar cada línea con `normalizeScannedCode(l)?.code`.
   - `const toAdd = addNewCodes(packages, normalizedLines); if (toAdd.length) setPackages(prev => [...prev, ...toAdd]);`
   - Limpiar `currentScan` tras procesar.
4. **Imperative handle:** `focus`, `getInputElement`, `clear: () => { clear(); setCurrentScan(""); onTrackingNumbersChange?.(""); }`, `updateValidatedPackages: (validated) => setPackages(prev => prev.map(p => matchValidatedPackage(p, validated) ?? p))`.
5. **Effects:** emitir `onPackagesChange?.(packages)` y `onTrackingNumbersChange?.(packages.map(p=>p.trackingNumber).join("\n"))` cuando cambie `packages`; emitir `onHasDueTomorrow` (misma lógica de fechas del `-list`); autoscroll de la lista.
6. **Contadores** (`dueTodayCount`, `dueTomorrowCount`, `notFoundCount`) y `copyAllTrackingNumbers`: copiar del `-list` tal cual (helpers `isDueToday`/`isDueTomorrow`/`formatDate`).
7. **Encabezado:** identidad (`BarcodeIcon` en cuadro `bg-primary text-primary-foreground`) + contador de guías + **switch de vista** (dos botones "Detallada"/"Simple" o un toggle; el activo con `bg-primary/10 text-primary`) que llama `setView` + botón **Copiar** (`bg-primary/10 text-primary`, estado copiado en verde).
8. **Zona de escaneo:** `textarea` (borde `focus-within:border-primary`), `onPaste`, `onKeyDown`, `onChange`.
9. **Cuerpo condicional por `view`:**
   - **`rich`:** la lista de tarjetas del `-list.tsx` (badge carrier, guía, "Validando…", cobro, fecha vencimiento hoy/mañana, "Guía no encontrada", botón quitar) + el pie de `MetricChip` (Hoy/Mañana/No encontradas). Cambiar acentos azules genéricos a `primary`; conservar rojo=hoy, ámbar=mañana, azul=cobro (semánticos). Reutilizar el subcomponente `MetricChip` (copiarlo a este archivo).
   - **`simple`:** una **fila de chips** horizontal con scroll:
     ```tsx
     <div className="flex gap-1.5 overflow-x-auto rounded-xl border bg-background p-2">
       {packages.length === 0 ? (
         <span className="px-2 py-1 text-sm text-muted-foreground">Sin guías</span>
       ) : packages.map((pkg) => (
         <span key={(pkg as any).dhlUniqueId ?? pkg.trackingNumber}
           className="inline-flex shrink-0 items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 font-mono text-xs">
           {pkg.trackingNumber}
           {!disabled && (
             <button type="button" onClick={() => removeById((pkg as any).dhlUniqueId || pkg.trackingNumber)}
               className="text-muted-foreground hover:text-destructive" title="Quitar">
               <XIcon className="h-3 w-3" />
             </button>
           )}
         </span>
       ))}
     </div>
     ```
10. **`removeById`:** `setPackages(prev => prev.filter(p => ((p as any).dhlUniqueId || p.trackingNumber) !== id))` (igual que el `-list`).
11. Mientras `!hydrated`, renderizar el mismo layout con `packages` vacío (evita mismatch); como el hook parte de `[]`, no se requiere rama especial salvo no parpadear.

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "scanner/scan-input"`
Expected: sin salida.

- [ ] **Step 3: Smoke en navegador (si hay dev server)**

Montar el componente en una pantalla de prueba o directamente en una migración posterior. Verificación real completa se hace en las tareas de migración (4-8). Si no hay dev server disponible, anotarlo y diferir el smoke a la primera migración.

- [ ] **Step 4: Commit**

```bash
git add components/scanner/scan-input.tsx
git commit -m "feat(scanner): componente ScanInput (vistas rica/simple, toggle, persistencia)"
```

---

### Task 4: Migrar `inventory-form.tsx`

**Files:**
- Modify: `components/operaciones/inventory/inventory-form.tsx`

**Interfaces:**
- Consumes: `ScanInput`, `ScanInputHandle` (Task 3).

- [ ] **Step 1: Cambiar import y ref type**

En `inventory-form.tsx:43` reemplazar:
```ts
import { BarcodeScannerInput, BarcodeScannerInputHandle } from "@/components/barcode-input/barcode-scanner-input-list";
```
por:
```ts
import { ScanInput, ScanInputHandle } from "@/components/scanner/scan-input";
```
Y `useRef<BarcodeScannerInputHandle>(null)` → `useRef<ScanInputHandle>(null)`.

- [ ] **Step 2: Actualizar el JSX**

Sustituir `<BarcodeScannerInput ... />` por `<ScanInput ... />` conservando `ref`, `onPackagesChange`, `onHasDueTomorrow` y los demás handlers; **quitar** el prop `multiCarrier` (ya no existe); **añadir** `storageKey="scan:inventario"` y (opcional) `defaultView="rich"`. La llamada `barScannerInputRef.current?.updateValidatedPackages?.(...)` se mantiene igual.

- [ ] **Step 3: Verificar typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "inventory/inventory-form"`
Expected: sin salida (0 errores nuevos).

- [ ] **Step 4: Smoke en navegador**

Abrir la pantalla de inventario: escanear FedEx + DHL, pegar N, dedup, alternar vista, quitar, **recargar** (persiste), guardar (limpia). Si no hay dev server, anotar y continuar.

- [ ] **Step 5: Commit**

```bash
git add components/operaciones/inventory/inventory-form.tsx
git commit -m "refactor(inventario): usa ScanInput unificado con persistencia"
```

---

### Task 5: Migrar `desembarque/unloading-form.tsx`

**Files:**
- Modify: `components/operaciones/desembarque/unloading-form.tsx`

**Interfaces:**
- Consumes: `ScanInput`, `ScanInputHandle` (Task 3).

- [ ] **Step 1: Cambiar import y ref**

`unloading-form.tsx:31` `import { BarcodeScannerInput, BarcodeScannerInputHandle } from "@/components/barcode-input/barcode-scanner-input-list";` → `import { ScanInput, ScanInputHandle } from "@/components/scanner/scan-input";`. `useRef<BarcodeScannerInputHandle>` → `useRef<ScanInputHandle>`.

- [ ] **Step 2: Actualizar el JSX (~línea 1311)**

`<BarcodeScannerInput multiCarrier onPackagesChange={setScannedPackages} onHasDueTomorrow={setScannerHasDueTomorrow} ... />` → `<ScanInput storageKey="scan:desembarque" onPackagesChange={setScannedPackages} onHasDueTomorrow={setScannerHasDueTomorrow} ... />` (quitar `multiCarrier`, añadir `storageKey`, conservar `ref` y demás). La llamada `barScannerInputRef.current.updateValidatedPackages(result.validatedShipments)` (~línea 880) se mantiene.

- [ ] **Step 3: Verificar typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "desembarque/unloading-form.tsx"`
Expected: sin salida.

- [ ] **Step 4: Smoke en navegador**

Desembarque: escanear/pegar, dedup JJD/JD, validación en lote muestra datos, recargar persiste, guardar limpia. Anotar si no hay dev server.

- [ ] **Step 5: Commit**

```bash
git add components/operaciones/desembarque/unloading-form.tsx
git commit -m "refactor(desembarque): usa ScanInput unificado con persistencia"
```

---

### Task 6: Migrar `desembarque/unloading-form-wizard.tsx`

**Files:**
- Modify: `components/operaciones/desembarque/unloading-form-wizard.tsx`

**Interfaces:**
- Consumes: `ScanInput`, `ScanInputHandle` (Task 3).

- [ ] **Step 1: Cambiar import, ref y JSX**

`unloading-form-wizard.tsx:14` import → `import { ScanInput, ScanInputHandle } from "@/components/scanner/scan-input";`. Cambiar el tipo de ref a `ScanInputHandle`. En el JSX, `<BarcodeScannerInput .../>` → `<ScanInput storageKey="scan:desembarque-wizard" .../>`, quitar `multiCarrier`, conservar handlers/ref. (Usa una `storageKey` distinta de la del form no-wizard para aislar buffers.)

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "unloading-form-wizard"`
Expected: sin salida.

- [ ] **Step 3: Smoke (si aplica) y Commit**

Si el wizard es alcanzable en la UI, smoke igual que Task 5. Luego:
```bash
git add components/operaciones/desembarque/unloading-form-wizard.tsx
git commit -m "refactor(desembarque-wizard): usa ScanInput unificado"
```

---

### Task 7: Migrar `close-package-dispatch-form.tsx` (consumidor de la base simple)

**Files:**
- Modify: `components/package-dispatch/close-package-dispatch-form.tsx`

**Interfaces:**
- Consumes: `ScanInput` (Task 3).

- [ ] **Step 1: Leer el uso actual**

Este archivo importa la base simple `@/components/barcode-scanner-input` (solo usa `onTrackingNumbersChange`, sin `ref`/`onPackagesChange`). Leer cómo la usa (props exactas) antes de migrar.

- [ ] **Step 2: Cambiar import y JSX**

`import { BarcodeScannerInput } from "@/components/barcode-scanner-input";` → `import { ScanInput } from "@/components/scanner/scan-input";`. Reemplazar `<BarcodeScannerInput ... />` por `<ScanInput storageKey="scan:dispatch-close" defaultView="simple" ... />` conservando `onTrackingNumbersChange` (y `label`/`placeholder`/`disabled`/`hasErrors` si los pasa). Como esta pantalla solo colecta códigos, `defaultView="simple"` es el default razonable (el operador puede cambiar a rica). No pasa `ref` → no requiere handle.

- [ ] **Step 3: Verificar typecheck**

Run: `npx tsc --noEmit 2>&1 | grep "close-package-dispatch-form"`
Expected: sin salida.

- [ ] **Step 4: Smoke y Commit**

Smoke: cerrar despacho, escanear/pegar, el string de guías llega igual al padre. Luego:
```bash
git add components/package-dispatch/close-package-dispatch-form.tsx
git commit -m "refactor(dispatch-close): usa ScanInput unificado (vista simple por defecto)"
```

---

### Task 8: Auditar y migrar consumidores restantes (devoluciones + package-dispatch-form)

**Files:**
- Modify (según auditoría): `components/devoluciones/unified-collection-return-form.tsx`, `components/package-dispatch/package-dispatch-form.tsx`

**Interfaces:**
- Consumes: `ScanInput`, `ScanInputHandle` (Task 3).

- [ ] **Step 1: Auditar**

Run: `cd /d/PMY/app-pmy && grep -rn "barcode-scanner-input\|BarcodeScannerInput" components/devoluciones components/package-dispatch`
Determinar qué variante usa cada uno (base simple vs `-list`) y qué props/ref consume.

- [ ] **Step 2: Migrar cada uno**

Para cada archivo con consumo: cambiar import a `@/components/scanner/scan-input`, ref type a `ScanInputHandle` (si usa ref), reemplazar el JSX por `<ScanInput storageKey="scan:devoluciones" .../>` y `<ScanInput storageKey="scan:dispatch" .../>` respectivamente, quitar `multiCarrier`, conservar todos los handlers/ref existentes. Elegir `defaultView` según si la pantalla muestra datos ("rich") o solo colecta ("simple").

- [ ] **Step 3: Verificar typecheck**

Run: `npx tsc --noEmit 2>&1 | grep -E "unified-collection-return-form|package-dispatch-form"`
Expected: sin salida.

- [ ] **Step 4: Smoke y Commit**

Smoke de cada pantalla migrada. Luego:
```bash
git add components/devoluciones/unified-collection-return-form.tsx components/package-dispatch/package-dispatch-form.tsx
git commit -m "refactor(devoluciones,dispatch): usan ScanInput unificado"
```

---

### Task 9: Limpieza de escáneres viejos + verificación integral

**Files:**
- Delete: `components/barcode-input/barcode-scanner-input-list copy.tsx`
- Delete (si quedan sin referencias): `components/barcode-scanner-input.tsx`, `components/barcode-input/barcode-scanner-input.tsx`, `components/barcode-input/barcode-scanner-input-list.tsx`

- [ ] **Step 1: Borrar el duplicado muerto**

```bash
cd /d/PMY/app-pmy
git rm "components/barcode-input/barcode-scanner-input-list copy.tsx"
```

- [ ] **Step 2: Verificar referencias antes de borrar los viejos**

Run: `grep -rn "barcode-scanner-input" components app --include=*.tsx --include=*.ts | grep -v "components/scanner/"`
Para cada archivo viejo (`components/barcode-scanner-input.tsx`, `components/barcode-input/barcode-scanner-input.tsx`, `components/barcode-input/barcode-scanner-input-list.tsx`): si NO tiene consumidores restantes, `git rm` el archivo. Si alguno aún tiene consumidores (fuera de alcance), dejarlo y anotarlo en el reporte.

- [ ] **Step 3: Verificación integral**

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | wc -l`
Expected: ≤ 484 (baseline; sin errores nuevos). Confirmar además que ningún archivo bajo `components/scanner/` ni las pantallas migradas aparecen en la salida de errores.

- [ ] **Step 4: Smoke integral (navegador)**

Recorrer las pantallas migradas confirmando: escaneo FedEx/DHL, pegar N, dedup, vista rica/simple, quitar, **persistencia al recargar**, **aislamiento entre pantallas** (buffers no se mezclan), y **clear al guardar**.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(scanner): elimina escáneres bulk viejos; verificación integral"
```

---

## Self-review (cobertura del spec)

- §3 Componente `ScanInput` (entrada uno/N, normalización, dedup, vistas rica/simple, toggle, copiar, quitar) → Task 3 (helpers Task 1). §3.3 API/handle → Task 3.
- §4 Persistencia por `storageKey` (localStorage, aislamiento, clear, SSR-safe) → Task 2, consumido en Task 3.
- §5 Migración de las 4 bulk (inventario, desembarque form+wizard, dispatch-close, devoluciones, dispatch-form) → Tasks 4-8.
- §6 Limpieza (duplicado muerto + viejos sin referencias) → Task 9.
- §7 Warehouse fuera de alcance → respetado (ninguna tarea toca `warehouse/`).
- §8 Verificación (typecheck 0-nuevos + smoke real por pantalla) → pasos de verificación en cada tarea + Task 9.
- Contrato de validación push-back conservado (`onPackagesChange`/`updateValidatedPackages`) → Task 3 handle + Tasks 4-8 mantienen la llamada.
- Normalización mixta siempre (sin `multiCarrier`) → Task 1/3 + se quita el prop en cada migración.
