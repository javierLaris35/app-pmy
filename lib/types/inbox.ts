export type InboxStatus = "nuevo" | "detectado" | "revision" | "confirmado" | "ignorado" | "error";
export type InboxView = "falta_confirmar" | "listos" | "subidos" | "todos" | "ignorado";
export type UploadState = "falta_confirmar" | "listo" | "subido" | "parcial" | "sin_guias" | "ignorado" | "error";
export type AttachmentKind =
  | "master"
  | "master_aereo"
  | "f2"
  | "high_value"
  | "ccp"
  | "ccp_ignored"
  | "dhl"
  | "pdf"
  | "other";
export type ConsolidationKind = "master" | "f2" | "aereo" | "high_value" | "dhl" | "cod";
export type LinkStatus = "pendiente" | "subido" | "no_aplica";

export interface InboxListItem {
  id: string;
  uploadState: UploadState;
  receivedAt: string;
  fromAddress: string;
  fromName: string | null;
  subject: string;
  status: InboxStatus;
  subsidiaryId: string | null;
  subsidiaryName: string | null;
  confidence: number | null;
  autoSafe: boolean;
  reason: string | null;
  attachments: { id: string; filename: string; kind: AttachmentKind }[];
  consolidations: { consNumber: string; kind: ConsolidationKind; announcedCount: number | null; linkStatus: LinkStatus; uploadMinutes: number | null }[];
  cobrosCount: number;
}

export interface InboxListResult {
  items: InboxListItem[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<InboxView, number>;
}

export interface InboxSignal {
  type: string;
  value: string;
  subsidiaryId: string;
  subsidiaryName: string | null;
  weight: number;
  note: string;
}

export interface Cobro {
  trackingNumber: string;
  date: string | null;
  concept: string;
  amount: number | null;
}

export interface InboxDetail {
  message: {
    id: string;
    receivedAt: string;
    fromAddress: string;
    fromName: string | null;
    toAddresses: string[] | null;
    ccAddresses: string[] | null;
    subject: string;
    textTop: string | null;
    htmlSafe: string | null;
    hasQuotedHistory: boolean;
    status: InboxStatus;
    ignoreReason: string | null;
    errorMessage: string | null;
    subsidiaryId: string | null;
    subsidiaryName: string | null;
    confirmedAt: string | null;
    confirmedByName: string | null;
  };
  attachments: {
    id: string;
    filename: string;
    size: number;
    contentType: string;
    kind: AttachmentKind;
    kindSource: "nombre" | "contenido" | "manual";
    consNumber: string | null;
    rowCount: number | null;
    zipSummary: Record<string, number> | null;
    parseError: string | null;
  }[];
  detection: {
    subsidiaryId: string | null;
    subsidiaryName: string | null;
    confidence: number;
    autoSafe: boolean;
    reason: string;
    runnerUpName: string | null;
    signals: InboxSignal[];
    createdAt: string;
  } | null;
  consolidations: {
    id: string;
    consNumber: string;
    kind: ConsolidationKind;
    announcedCount: number | null;
    cobros: Cobro[] | null;
    receivedAt: string;
    uploadedAt: string | null;
    uploadedByName: string | null;
    uploadMinutes: number | null;
    linkStatus: LinkStatus;
  }[];
}

export interface BoardItem {
  id: string;
  inboxMessageId: string;
  consNumber: string;
  kind: ConsolidationKind;
  announcedCount: number | null;
  receivedAt: string;
  uploadedAt: string | null;
  uploadedByName: string | null;
  uploadedVia: "manual" | "auto" | "correo" | null;
  linkStatus: LinkStatus;
  minutes: number | null;
}

export interface BoardRow {
  subsidiaryId: string | null;
  subsidiaryName: string;
  day: string;
  received: number;
  uploaded: number;
  pending: number;
  avgMinutes: number | null;
  worstMinutes: number | null;
  items: BoardItem[];
}

export interface InboxStatusInfo {
  mailbox: string;
  configured: boolean;
  serverEnabled: boolean;
  enabled: boolean;
  health: "ok" | "atrasado" | "pausado" | "sin_configurar";
  lastRunAt: string | null;
  lastOkAt: string | null;
  lastError: string | null;
  lastUid: number;
  allowedDomains: string[];
  today: Record<string, number>;
}

export interface ZipCoverageRow {
  id: string;
  zip: string;
  subsidiaryId: string;
  city: string | null;
  shipmentCount: number;
  share: string;
  source: "historial" | "correo" | "manual";
  status: "sugerido" | "confirmado" | "excluido";
  lastSeenAt: string | null;
  sharedWith: string[];
}

export type PasteBatchKind = "master" | "aereo" | "f2";

export interface PasteBatch {
  key: string;
  kind: PasteBatchKind;
  attachmentId: string;
  filename: string;
  subsidiaryId: string | null;
  consNumber: string;
  consDate: string;
  isAereo: boolean;
  raw: string;
  paymentsRaw: string;
  hvRaw: string;
  rows: number;
  blockedReason: string | null;
  done: boolean;
}

export interface PasteBatchView extends PasteBatch {
  hvCount: number;
  cobrosCount: number;
  uploaded: { at: string; byName: string | null; minutes: number | null; via: string | null } | null;
  duplicateOf?: string;
  /** Guías que también vienen en la F2 del mismo correo y por eso NO van en este bloque. */
  movedToF2?: number;
  /** F2: guías de este bloque que ya se subieron como paquete en el master de este mismo correo. */
  alreadyInMaster?: { count: number; consNumber: string };
  /** Revisión por guías: cuántas del bloque ya están en el sistema y en qué consolidados. */
  inSystem?: { found: number; total: number; complete: boolean; groups: { consNumber: string; subsidiaryName: string; type: "paquete" | "carga"; count: number; at: string; byName: string | null }[] } | null;
  sheet?: string;
  /** El archivo no trae número: se armó con el formato que usa la sucursal (fecha + ruta). */
  consSuggested?: { pattern: "fecha+ruta" | "ruta+fecha"; route: string } | null;
}

export interface PastePlan {
  ready: boolean;
  reason: string | null;
  batches: PasteBatchView[];
  /** Consolidados que el correo anuncia sin archivo adjunto (COD, F2 o HV solo en el texto). */
  announcedOnly: { consNumber: string; kind: ConsolidationKind; announcedCount: number | null; insideSheet: string | null; uploaded: { at: string; byName: string | null; minutes: number | null } | null }[];
  /** Guías de cobros del correo que no están en ningún archivo. */
  unmatchedCobros: string[];
}

export interface RouteSummary {
  route: string;
  daysReceived: number;
  daysUploaded: number;
  daysPartial: number;
  missingDays: string[];
  guides: number;
  asPackage: number;
  asCharge: number;
  subsidiaries: { name: string; days: number }[];
  last: { day: string; consNumber: string | null; type: "paquete" | "carga" | null; subsidiaryName: string | null } | null;
}

export interface RoutesReport {
  from: string;
  to: string;
  routes: RouteSummary[];
}
