export type InboxStatus = "nuevo" | "detectado" | "revision" | "confirmado" | "ignorado" | "error";
export type InboxView = "revision" | "detectado" | "confirmado" | "ignorado" | "error" | "todos";
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
export type ConsolidationKind = "master" | "f2" | "aereo" | "high_value" | "dhl";
export type LinkStatus = "pendiente" | "subido" | "no_aplica";

export interface InboxListItem {
  id: string;
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

export interface PastePlan {
  ready: boolean;
  reason: string | null;
  batches: PasteBatch[];
}
