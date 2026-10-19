/** Buscador de Correos: consolidado, guía o texto → correos donde aparece + historia completa. */

export type HeadType = "paquete" | "carga";
export type GuideBucket = "entregado" | "dex" | "devuelto" | "en_ruta" | "en_bodega" | "pendiente" | "otro";

export interface EmailRef {
  id: string;
  subject: string;
  receivedAt: string;
  carrier: string;
  subsidiaryName: string | null;
  where: string;
  attachmentId: string | null;
  filename: string | null;
  sheet: string | null;
  guides?: number;
}

export interface ConsolidationHit {
  id: string | null;
  consNumber: string;
  type: HeadType;
  subsidiaryName: string | null;
  day: string | null;
  createdAt: string | null;
  declared: number | null;
  total: number;
  inSystem: boolean;
  emails: EmailRef[];
}

export interface GuideHit {
  trackingNumber: string;
  records: { id: string; type: HeadType; status: string; bucket: GuideBucket; subsidiaryName: string; consNumber: string | null; createdAt: string }[];
  emails: EmailRef[];
}

export interface SearchResult {
  query: string;
  consolidations: ConsolidationHit[];
  guides: GuideHit[];
  messages: EmailRef[];
}

export interface Insight {
  severity: "alta" | "media" | "info";
  text: string;
}

export interface Finding {
  code: string;
  severity: "alta" | "media" | "info";
  text: string;
  count: number;
  samples: string[];
}

export interface DispatchInfo {
  id: string;
  folio: string;
  routeDay: string | null;
  createdAt: string;
  status: string;
  is315: boolean;
  subsidiaryName: string | null;
  vehicle: string | null;
  routes: string | null;
  drivers: string | null;
  createdByName: string | null;
  closedAt: string | null;
  closureStatus?: string | null;
}

export interface UnloadingInfo {
  id: string;
  folio: string;
  at: string;
  subsidiaryName: string | null;
  vehicle: string | null;
  createdByName: string | null;
  scannedFromThis: number;
  /** Marcadas como "Guía faltante" (no llegaron). */
  missingFromThis: string[];
  /** Marcadas como "Guía sin escaneo" (llegaron sin poder escanearse). */
  unscannedFromThis: string[];
  /** Anotadas en ese desembarque que no son de este consolidado. */
  notedOther: string[];
  /** Escaneadas en ese mismo desembarque de otros consolidados. */
  otherConsolidations: { consNumber: string; count: number }[];
  /** Escaneadas sin consolidado (sobrantes dados de alta a mano). */
  surplus: number;
}

export interface ConsolidatedGuide {
  id: string;
  trackingNumber: string;
  status: string;
  bucket: GuideBucket;
  dexCode: string | null;
  recipientName: string | null;
  recipientCity: string | null;
  recipientZip: string | null;
  commitDateTime: string | null;
  isHighValue: boolean;
  lastEventAt: string | null;
  unloadingFolio: string | null;
  unloadedAt: string | null;
  dispatchFolio: string | null;
  routeDay: string | null;
  routes: string | null;
  drivers: string | null;
  dispatchCount: number;
  closed: boolean;
  income: number | null;
  payment: { amount: number; type: string; status: string } | null;
  devolution: { date: string; reason: string } | null;
  insights: Insight[];
}

export interface ConsolidatedDetail {
  head: {
    id: string;
    consNumber: string;
    type: HeadType;
    consType: string | null;
    carrier: string | null;
    isHalfTon: boolean | null;
    day: string | null;
    createdAt: string;
    createdByName: string | null;
    subsidiaryName: string | null;
    declared: number | null;
    announcedCount: number | null;
    receivedAt: string | null;
    uploadMinutes: number | null;
  };
  summary: {
    total: number;
    unloaded: number;
    notUnloaded: number;
    routed: number;
    closed: number;
    entregado: number;
    dex: number;
    devuelto: number;
    en_ruta: number;
    en_bodega: number;
    pendiente: number;
    otro: number;
    dexByCode: Record<string, number>;
    devolutions: number;
    income: number | null;
    cod: number;
    withIssues: number;
  };
  findings: Finding[];
  emails: EmailRef[];
  unloadings: UnloadingInfo[];
  dispatches: (DispatchInfo & { count: number; delivered: number; dex: number })[];
  guides: ConsolidatedGuide[];
}

export interface GuideRecord {
  id: string;
  type: HeadType;
  trackingNumber: string;
  dhlUniqueId: string | null;
  carrier: string | null;
  status: string;
  bucket: GuideBucket;
  dexCode: string | null;
  subsidiaryName: string;
  consolidated: { id: string; consNumber: string; day: string | null } | null;
  recipient: { name: string | null; address: string | null; city: string | null; zip: string | null; phone: string | null; receivedBy: string | null };
  commitDateTime: string | null;
  isHighValue: boolean;
  createdAt: string;
  createdByName: string | null;
  unloading: { id: string; folio: string; at: string; subsidiaryName: string | null; vehicle: string | null; createdByName: string | null } | null;
  dispatches: DispatchInfo[];
  history: { status: string; exceptionCode: string | null; at: string; notes: string | null }[];
  incomes: { date: string; cost: number; incomeType: string; sourceType: string; active: boolean }[];
  incomeTotal: number | null;
  devolutions: { date: string; reason: string; undone: boolean }[];
  payment: { amount: number; type: string; status: string } | null;
  insights: Insight[];
}

export interface GuideDetail {
  trackingNumber: string;
  records: GuideRecord[];
  emails: EmailRef[];
}

/** Qué resaltar al abrir un correo desde el buscador. */
export interface EmailHighlight {
  text: string;
  label: string;
  attachmentId: string | null;
  sheet: string | null;
  where: string;
}
