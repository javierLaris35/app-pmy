/**
 * Tipos del "Conteo manual vs sistema" (Consolidador). Espejo de pmy-api:
 * `src/consolidador/logic/manual-count.types.ts` — mantener en sync.
 */

/** Lo que el usuario puede contar: entregado (POD), DEX07 o DEX08. */
export type Mark = 'POD' | '07' | '08';
export const MARKS: Mark[] = ['POD', '07', '08'];

/** Desenlace de una guía en el día: un Mark, otro evento (`OTRO`) o nada (`null`). */
export type DayOutcome = Mark | 'OTRO' | null;

/** Lo que dice FedEx en vivo para el día consultado. */
export type Verdict = 'CUADRA' | 'ERROR_SISTEMA' | 'ERROR_CONTEO' | 'REGLA' | 'OTRO_DIA';
export const VERDICTS: Verdict[] = ['CUADRA', 'ERROR_SISTEMA', 'ERROR_CONTEO', 'REGLA', 'OTRO_DIA'];

export type Cause =
  | 'NO_EXISTE'
  | 'OTRA_SUCURSAL'
  | 'SIN_CONSOLIDADO'
  | 'SIN_RUTA'
  | 'RUTA_OTRO_DIA'
  | 'ESTATUS_DESFASADO'
  | 'COBRO_DE_MAS'
  | 'COBRO_FALTANTE'
  | 'INGRESO_OTRO_DIA'
  | 'DUPLICADO'
  | 'MONTO_INCORRECTO'
  | 'ERROR_CONTEO'
  | 'REGLA_NO_COBRA'
  | 'F2_INFORMATIVO'
  | 'ENTREGADO_OTRO_DIA';

export interface ChainStep {
  step: number;
  label: string;
  ok: boolean | null; // null = no aplica / sin datos
  detail: string;
}

export interface DiagnosisRow {
  trackingNumber: string;
  manual: Mark | null;
  fedexSays: DayOutcome;
  systemSays: DayOutcome;
  charged: Mark[];
  expected: Mark | null;
  deliveredDay: string | null; // día real de entrega según FedEx (o el ingreso POD), si ya se entregó
  verdict: Verdict;
  cause: Cause | null;
  subCause: string | null;
  explanation: string;
  chain: ChainStep[];
  cost: number | null;
  incomeIds: string[];
}

export interface ManualCountTotals {
  manual: Record<Mark, number>;
  fedex: Record<Mark, number>;
  charged: Record<Mark, number>;
  byVerdict: Record<Verdict, number>;
}

export interface ManualCountReport {
  subsidiaryId: string;
  subsidiaryName: string | null;
  day: string;
  fedexFailures: number;
  totals: ManualCountTotals;
  rows: DiagnosisRow[];
}

export interface ManualLists {
  pod: string[];
  dex07: string[];
  dex08: string[];
}
