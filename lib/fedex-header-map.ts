/**
 * Espejo (frontend) del mapeo de encabezados FedEx del backend
 * (`src/utils/header-detector.util.ts`) + motor de validación/enriquecimiento
 * para el flujo de "pegar desde Excel". Construye la tabla IGUAL que el import
 * por archivo (mapea por encabezado, ignora columnas irrelevantes) y además:
 *  - detecta problemas por fila/celda (guía faltante, duplicada, fecha inválida),
 *  - permite enriquecer con Pagos (COD) y High Value pegados/manuales,
 *  - lleva conteos rápidos.
 * Si cambian los alias del backend, actualizar aquí también.
 */

/** Normaliza un encabezado igual que el backend. */
export function normalizeHeader(header: string): string {
  if (!header || typeof header !== "string") return "";
  return header
    .trim()
    .toLowerCase()
    .replace(/[^\w\d\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s/g, "");
}

/** Alias normalizados → campo canónico. */
export const HEADER_ALIASES: Record<string, string> = {
  trackingnumber: "trackingNumber", tracking: "trackingNumber", trackingno: "trackingNumber",
  numeroguia: "trackingNumber", hwbno: "trackingNumber", guia: "trackingNumber",
  awbmaster: "trackingNumber", awbmaestro: "trackingNumber",
  recipname: "recipientName", recipientname: "recipientName", nombredest: "recipientName",
  nombre: "recipientName", destinatario: "recipientName", receptor: "recipientName",
  recipaddr: "recipientAddress", recipientaddress: "recipientAddress", rcvraddr1: "recipientAddress",
  calledest: "recipientAddress", address: "recipientAddress", direccion: "recipientAddress",
  domicilio: "recipientAddress", direccin: "recipientAddress",
  rcvraddr2: "recipientAddress2", address2: "recipientAddress2", direccion2: "recipientAddress2",
  recipientcity: "recipientCity", recipcity: "recipientCity", ciudad: "recipientCity", city: "recipientCity",
  recipientzip: "recipientZip", recipostal: "recipientZip", rcvrpostcode: "recipientZip",
  codigopostaldest: "recipientZip", zip: "recipientZip", postal: "recipientZip",
  codigopostal: "recipientZip", recippostal: "recipientZip", cp: "recipientZip",
  commitdate: "commitDate", edd: "commitDate", date: "commitDate", fecha: "commitDate",
  fechacompromiso: "commitDate", fechaentrega: "commitDate", vencimiento: "commitDate",
  committime: "commitTime", time: "commitTime", hora: "commitTime", horacompromiso: "commitTime",
  recipphone: "recipientPhone", phone: "recipientPhone", telefono: "recipientPhone",
  celular: "recipientPhone", phonenumber: "recipientPhone", cel: "recipientPhone",
  tel: "recipientPhone", telfono: "recipientPhone",
  cod: "cod", payment: "cod", cashondelivery: "cod", contraentrega: "cod",
  pagocontraentrega: "cod", pago: "cod", monto: "cod", importe: "cod", amount: "cod",
  lastcommscanupdate: "cod", commcommentcommentcontainall: "cod",
};

export interface FieldDef { field: string; header: string; label: string; }

/**
 * Campos canónicos que exportamos en el .xlsx. El `header` emitido DEBE
 * normalizar a una key de HEADER_ALIASES para que el backend lo reconozca.
 */
export const CANONICAL_FIELDS: FieldDef[] = [
  { field: "trackingNumber", header: "trackingNumber", label: "Guía" },
  { field: "recipientName", header: "recipientName", label: "Destinatario" },
  { field: "recipientAddress", header: "recipientAddress", label: "Dirección" },
  { field: "recipientCity", header: "recipientCity", label: "Ciudad" },
  { field: "recipientZip", header: "recipientZip", label: "CP" },
  { field: "commitDate", header: "commitDate", label: "Fecha" },
  { field: "commitTime", header: "commitTime", label: "Hora" },
  { field: "recipientPhone", header: "phone", label: "Teléfono" },
  { field: "cod", header: "cod", label: "Pago" },
];

const COD_FIELD = CANONICAL_FIELDS.find((f) => f.field === "cod")!;

export interface MappedRow {
  values: Record<string, string>; // campo canónico → valor (incluye 'cod')
  missingTracking: boolean;
  duplicateTracking: boolean;
  badDate: boolean;
  hasPayment: boolean;
  paymentNoType: boolean;
  isHighValue: boolean;
  manual: boolean; // agregada por enriquecimiento (no venía en el pegado principal)
}

export interface MappedCounts {
  total: number;
  withTracking: number;
  missingTracking: number;
  duplicates: number;
  withPayment: number;
  paymentsNoType: number;
  highValue: number;
}

export interface DetectedMeta {
  /** No. de consolidado tomado de la fila meta (antes del encabezado). */
  consNumber?: string;
  /** Fecha (yyyy-MM-dd) tomada de la fila meta, si venía. */
  date?: string;
  /** true si la fila meta menciona "AEREA/AEREO". undefined si no hay señal. */
  aereo?: boolean;
}

export interface ColumnProblem {
  level: "error" | "warn";
  message: string;
}

export interface MappedTable {
  fields: FieldDef[];
  rows: MappedRow[];
  hasTracking: boolean;
  hasPayment: boolean;
  counts: MappedCounts;
  meta: DetectedMeta;
  /** Problemas de columna/estructura para mostrar en tiempo real. */
  problems: ColumnProblem[];
  /** Explicabilidad: campo canónico → de qué encabezado/origen salió. */
  sources: Record<string, string>;
}

interface HeaderMapResult { headerRowIndex: number; map: Record<string, number>; }

/** Escanea las primeras filas y detecta la fila de encabezados FedEx. */
export function detectHeaderMap(rows: string[][], maxScanRows = 15): HeaderMapResult | null {
  const limit = Math.min(rows.length, maxScanRows);
  for (let i = 0; i < limit; i++) {
    const row = rows[i] ?? [];
    const hasKnown = row.some((cell) => {
      const n = normalizeHeader(String(cell ?? ""));
      return n && HEADER_ALIASES[n];
    });
    if (!hasKnown) continue;
    const map: Record<string, number> = {};
    row.forEach((cell, index) => {
      const n = normalizeHeader(String(cell ?? ""));
      if (n && HEADER_ALIASES[n] && map[HEADER_ALIASES[n]] === undefined) {
        map[HEADER_ALIASES[n]] = index;
      }
    });
    return { headerRowIndex: i, map };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Resolutor INTELIGENTE de columnas (puntaje por encabezado + inferencia por
// contenido). Prioriza destinatario sobre remitente y nunca lanza excepción.
// ---------------------------------------------------------------------------

type Field =
  | "trackingNumber" | "recipientName" | "recipientAddress" | "recipientAddress2"
  | "recipientCity" | "recipientZip" | "commitDate" | "commitTime" | "recipientPhone" | "cod";

const RECIP_FIELDS: Field[] = ["recipientName", "recipientAddress", "recipientAddress2", "recipientCity", "recipientZip", "recipientPhone"];

const RECIP_CTX = ["dest", "destino", "destinatario", "recip", "recipient", "consignee", "cliente", "receptor", "recibe", "entrega", "deliver", "shipto", "to"];
const SENDER_CTX = ["rem", "remitente", "remit", "shipper", "shpr", "orig", "origen", "sender", "from"];

const FIELD_PRIMARY: Record<Field, string[]> = {
  trackingNumber: ["tracking", "guia", "awb", "hwb", "waybill", "seguimiento", "rastreo", "guias"],
  recipientName: ["nombre", "name", "consignee"],
  recipientAddress: ["direccion", "address", "addr", "calle", "domicilio", "street"],
  recipientAddress2: ["interior", "depto", "suite"],
  recipientCity: ["ciudad", "city", "municipio", "localidad", "poblacion", "town"],
  recipientZip: ["cp", "postal", "zip", "postcode"],
  commitDate: ["commit", "vencimiento", "edd", "fecha", "date"],
  commitTime: ["hora", "time"],
  recipientPhone: ["telefono", "phone", "celular", "tel", "cel", "movil", "contacto"],
  cod: ["cod", "cobro", "pago", "payment", "collect", "importe", "monto", "amount"],
};

const FIELD_LABEL: Record<Field, string> = {
  trackingNumber: "Guía", recipientName: "Destinatario", recipientAddress: "Dirección",
  recipientAddress2: "Dirección 2", recipientCity: "Ciudad", recipientZip: "CP",
  commitDate: "Fecha", commitTime: "Hora", recipientPhone: "Teléfono", cod: "Pago",
};

function tokenize(header: string): string[] {
  return String(header ?? "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // sin acentos
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** Puntaje de un encabezado (ya tokenizado) para un campo. 0 = no aplica. */
function scoreHeaderForField(tokens: string[], field: Field): number {
  if (tokens.length === 0) return 0;
  const has = (t: string) => tokens.includes(t);
  const hasAny = (arr: string[]) => arr.some((t) => tokens.includes(t));
  const recip = hasAny(RECIP_CTX);
  const sender = hasAny(SENDER_CTX);

  // Campos del destinatario: descarta si es claramente del remitente.
  if (RECIP_FIELDS.includes(field) && sender && !recip) return 0;

  if (field === "commitDate") {
    // Excluye fechas que NO son de compromiso (salida/escaneo/registro).
    if (hasAny(["salida", "scan", "escaneo", "captura", "registro", "creacion"])) return 0;
    if (hasAny(["commit", "vencimiento", "edd"])) return 5;
    if (hasAny(["fecha", "date"])) return 3;
    return 0;
  }
  if (field === "commitTime") {
    if (hasAny(["salida", "scan"])) return 0;
    if (hasAny(["hora", "time"])) return has("commit") ? 5 : 3;
    return 0;
  }
  if (field === "cod") {
    if (hasAny(FIELD_PRIMARY.cod)) return 4;
    if (has("comm") && (has("update") || has("comment"))) return 4; // FedEx "Last COMM Scan Update"
    return 0;
  }

  const primary = hasAny(FIELD_PRIMARY[field]);
  if (!primary) return 0;
  let score = 3;
  if (RECIP_FIELDS.includes(field) && recip) score += 2; // refuerzo destinatario
  return score;
}

/** Muestra de valores no vacíos de una columna (filas de datos). */
function sampleColumn(rows: string[][], colIdx: number, fromRow: number, limit = 25): string[] {
  const out: string[] = [];
  for (let i = fromRow; i < rows.length && out.length < limit; i++) {
    const v = String(rows[i]?.[colIdx] ?? "").trim();
    if (v) out.push(v);
  }
  return out;
}

const frac = (vals: string[], re: RegExp) => (vals.length ? vals.filter((v) => re.test(v)).length / vals.length : 0);

/** Infiere el campo de una columna por el patrón de sus valores. */
function inferFieldByContent(vals: string[]): Field | null {
  if (vals.length < 3) return null;
  if (frac(vals, /^\d{10,18}$/) >= 0.6) return "trackingNumber";
  if (frac(vals, /^\d{4,5}$/) >= 0.6) return "recipientZip";
  if (frac(vals, /^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}$/) >= 0.6) return "commitDate";
  if (frac(vals, /^([01]?\d|2[0-3]):[0-5]\d/) >= 0.6) return "commitTime";
  if (frac(vals, /^\+?\d[\d\s()-]{6,14}$/) >= 0.6) return "recipientPhone";
  return null;
}

/**
 * Resuelve columnas de forma robusta: elige la fila de encabezados (la que más
 * columnas reconoce), puntúa cada columna contra cada campo (destinatario >
 * remitente) y, para campos sin encabezado, infiere por contenido. Devuelve el
 * mapa, el origen por campo (explicabilidad) y problemas para mostrar.
 */
export function resolveColumns(rows: string[][], maxScanRows = 20): {
  headerRowIndex: number;
  map: Record<string, number>;
  sources: Record<string, string>;
  problems: ColumnProblem[];
} {
  const problems: ColumnProblem[] = [];
  const map: Record<string, number> = {};
  const sources: Record<string, string> = {};
  if (!rows.length) {
    problems.push({ level: "error", message: "No hay datos pegados." });
    return { headerRowIndex: -1, map, sources, problems };
  }

  // 1) Elegir fila de encabezados: la que maximiza columnas reconocidas.
  const limit = Math.min(rows.length, maxScanRows);
  let headerRowIndex = -1;
  let bestScore = 0;
  const fields = Object.keys(FIELD_PRIMARY) as Field[];
  for (let i = 0; i < limit; i++) {
    const row = rows[i] ?? [];
    let recognized = 0;
    for (const cell of row) {
      const tk = tokenize(String(cell ?? ""));
      if (fields.some((f) => scoreHeaderForField(tk, f) > 0)) recognized++;
    }
    if (recognized > bestScore) { bestScore = recognized; headerRowIndex = i; }
  }
  // Umbral: si ninguna fila reconoce >=2 columnas, no hay encabezado → contenido.
  if (bestScore < 2) headerRowIndex = -1;

  // 2) Puntuar columnas del encabezado elegido y asignar de forma greedy.
  const usedCols = new Set<number>();
  if (headerRowIndex >= 0) {
    const header = rows[headerRowIndex];
    const cands: { col: number; field: Field; score: number; text: string }[] = [];
    header.forEach((cell, col) => {
      const text = String(cell ?? "").trim();
      const tk = tokenize(text);
      for (const f of fields) {
        const s = scoreHeaderForField(tk, f);
        if (s > 0) cands.push({ col, field: f, score: s, text });
      }
    });
    cands.sort((a, b) => b.score - a.score);
    for (const cnd of cands) {
      if (map[cnd.field] !== undefined || usedCols.has(cnd.col)) continue;
      map[cnd.field] = cnd.col;
      usedCols.add(cnd.col);
      sources[cnd.field] = cnd.text || `columna ${cnd.col + 1}`;
    }
  } else {
    problems.push({ level: "warn", message: "No se reconoció una fila de encabezados; se intentará inferir por contenido." });
  }

  // 3) Inferencia por contenido para campos clave sin resolver.
  const dataFrom = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
  const inferable: Field[] = ["trackingNumber", "recipientZip", "commitDate", "commitTime", "recipientPhone"];
  for (const field of inferable) {
    if (map[field] !== undefined) continue;
    const ncols = Math.max(...rows.slice(dataFrom, dataFrom + 25).map((r) => r.length), 0);
    for (let col = 0; col < ncols; col++) {
      if (usedCols.has(col)) continue;
      const guess = inferFieldByContent(sampleColumn(rows, col, dataFrom));
      if (guess === field) {
        map[field] = col;
        usedCols.add(col);
        sources[field] = "inferido por contenido";
        break;
      }
    }
  }

  if (map["trackingNumber"] === undefined) {
    problems.push({ level: "error", message: "No se encontró la columna de Guía/Tracking. Verifica que pegaste los encabezados." });
  }
  return { headerRowIndex, map, sources, problems };
}

// ---------------------------------------------------------------------------
// Validación de celdas
// ---------------------------------------------------------------------------

/** Fecha vacía = ok (backend aplica default). No vacía e ininterpretable = mala. */
export function isBadDate(value: string): boolean {
  const v = String(value ?? "").trim();
  if (!v) return false;
  if (/^\d+(\.\d+)?$/.test(v)) return false; // serial de Excel
  // M/D/Y, D/M/Y o Y-M-D con separadores / - .
  const m = v.match(/^(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{1,4})/);
  if (m) {
    const a = Number(m[1]), b = Number(m[2]), c = Number(m[3]);
    const parts = [a, b, c];
    const hasDay = parts.some((p) => p >= 1 && p <= 31);
    const hasMonthOk = b >= 1 && b <= 12;
    return !(hasDay && (hasMonthOk || a <= 12));
  }
  return isNaN(Date.parse(v));
}

const PAY_TYPE_RE = /\b(COD|FTC|ROD)\b/i;
/** Extrae {type, amount} de una celda de pago (espejo de parsePaymentCell). */
export function parsePaymentCell(value: string): { type: string | null; amount: number | null } {
  const raw = String(value ?? "").trim();
  if (!raw) return { type: null, amount: null };
  const typeMatch = raw.match(PAY_TYPE_RE);
  const type = typeMatch ? typeMatch[1].toUpperCase() : null;
  const numbers = raw.match(/[\d][\d.,]*/g);
  let amount: number | null = null;
  if (numbers && numbers.length) {
    const last = numbers[numbers.length - 1];
    // normaliza miles/decimales: quita separadores de miles, deja punto decimal
    const cleaned = last.replace(/,(?=\d{3}\b)/g, "").replace(/,(\d{1,2})$/, ".$1").replace(/,/g, "");
    const n = parseFloat(cleaned);
    amount = isFinite(n) && n > 0 ? n : null;
  }
  return { type, amount };
}

function analyzeRow(values: Record<string, string>, manual: boolean): MappedRow {
  const tracking = String(values["trackingNumber"] ?? "").trim();
  const codCell = String(values["cod"] ?? "").trim();
  const pay = parsePaymentCell(codCell);
  const hasPayment = pay.amount !== null;
  return {
    values,
    missingTracking: tracking === "",
    duplicateTracking: false, // se calcula al final (necesita el set completo)
    badDate: isBadDate(values["commitDate"] ?? ""),
    hasPayment,
    paymentNoType: hasPayment && !pay.type,
    isHighValue: false,
    manual,
  };
}

/**
 * Convierte una fecha a "yyyy-MM-dd". Los archivos FedEx usan MM/DD/YYYY, así
 * que se asume ese orden; si el primer número > 12 se interpreta como DD/MM.
 */
function toIsoDate(value: string): string | undefined {
  const m = String(value ?? "").trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (!m) return undefined;
  let [, a, b, y] = m;
  if (y.length === 2) y = "20" + y;
  let mm: number, dd: number;
  const na = Number(a), nb = Number(b);
  if (na > 12) { dd = na; mm = nb; }        // DD/MM
  else if (nb > 12) { mm = na; dd = nb; }   // MM/DD
  else { mm = na; dd = nb; }                // ambiguo → MM/DD (FedEx)
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return undefined;
  return `${y}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/**
 * Lee la(s) fila(s) meta que van ANTES del encabezado (p.ej.
 * "305794238300  ALBERTO GUTIERREZ  SALIDA AEREA … 05/06/2026") y extrae el
 * consNumber (primer token de dígitos), la fecha y si es aérea.
 */
export function detectMeta(rawRows: string[][], headerRowIndex: number): DetectedMeta {
  const meta: DetectedMeta = {};
  // Se busca sobre el TEXTO COMPLETO de cada fila meta (no celda por celda),
  // para funcionar aunque la fila venga como una sola celda o con espacios.
  for (let i = 0; i < headerRowIndex; i++) {
    const joined = (rawRows[i] ?? []).join(" ").trim();
    if (!joined) continue;
    if (!meta.consNumber) {
      const m = joined.match(/\b\d{6,}\b/); // primer token largo de dígitos = consolidado
      if (m) meta.consNumber = m[0];
    }
    if (!meta.date) {
      const m = joined.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/);
      if (m) {
        const iso = toIsoDate(m[0]);
        if (iso) meta.date = iso;
      }
    }
    if (meta.aereo === undefined && /\bAERE/i.test(joined)) meta.aereo = true;
    else if (meta.aereo === undefined && /\b(TERRESTRE|ORDINARIA)\b/i.test(joined)) meta.aereo = false;
  }
  return meta;
}

function recompute(table: {
  fields: FieldDef[];
  rows: MappedRow[];
  meta?: DetectedMeta;
  problems?: ColumnProblem[];
  sources?: Record<string, string>;
}): MappedTable {
  // duplicados por guía (entre filas con guía)
  const seen = new Map<string, number>();
  for (const r of table.rows) {
    const t = String(r.values["trackingNumber"] ?? "").trim();
    if (t) seen.set(t, (seen.get(t) ?? 0) + 1);
  }
  for (const r of table.rows) {
    const t = String(r.values["trackingNumber"] ?? "").trim();
    r.duplicateTracking = !!t && (seen.get(t) ?? 0) > 1;
  }
  const hasPayment = table.rows.some((r) => r.hasPayment);
  // Asegura la columna Pago visible si hay pagos.
  let fields = table.fields;
  if (hasPayment && !fields.some((f) => f.field === "cod")) fields = [...fields, COD_FIELD];

  const counts: MappedCounts = {
    total: table.rows.length,
    withTracking: table.rows.filter((r) => !r.missingTracking).length,
    missingTracking: table.rows.filter((r) => r.missingTracking).length,
    duplicates: table.rows.filter((r) => r.duplicateTracking).length,
    withPayment: table.rows.filter((r) => r.hasPayment).length,
    paymentsNoType: table.rows.filter((r) => r.paymentNoType).length,
    highValue: table.rows.filter((r) => r.isHighValue).length,
  };
  return {
    fields,
    rows: table.rows,
    hasTracking: fields.some((f) => f.field === "trackingNumber"),
    hasPayment,
    counts,
    meta: table.meta ?? {},
    problems: table.problems ?? [],
    sources: table.sources ?? {},
  };
}

/**
 * Construye la tabla limpia desde el pegado principal (Master/Aéreo/F2) con el
 * resolutor inteligente (puntaje por encabezado + inferencia por contenido).
 * Combina dirección + dirección2, marca problemas por fila y calcula conteos.
 * Devuelve `null` solo si no hay NINGUNA columna de guía (ni por encabezado ni
 * por contenido) — todo lo demás se reporta en `problems`, nunca lanza.
 */
export function buildMappedTable(rawRows: string[][]): MappedTable | null {
  const { headerRowIndex, map, sources, problems } = resolveColumns(rawRows);
  if (map["trackingNumber"] === undefined) return null;

  const addr2Index = map["recipientAddress2"];
  const dataFrom = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
  const dataRows = rawRows.slice(dataFrom).filter((r) => r.some((c) => String(c ?? "").trim() !== ""));

  const fields = CANONICAL_FIELDS.filter((f) => map[f.field] !== undefined);

  const rows: MappedRow[] = dataRows.map((raw) => {
    const values: Record<string, string> = {};
    for (const f of fields) {
      let value = String(raw[map[f.field]] ?? "").trim();
      if (f.field === "recipientAddress" && addr2Index !== undefined) {
        const a2 = String(raw[addr2Index] ?? "").trim();
        if (a2) value = [value, a2].filter(Boolean).join(", ");
      }
      values[f.field] = value;
    }
    return analyzeRow(values, false);
  });

  const meta = detectMeta(rawRows, headerRowIndex >= 0 ? headerRowIndex : 0);
  return recompute({ fields, rows, meta, problems, sources });
}

// ---------------------------------------------------------------------------
// Enriquecimiento: Pagos (COD) y High Value
// ---------------------------------------------------------------------------

export interface ParsedPayment { tracking: string; amount: number | null; type: string | null; raw: string; }

/**
 * Parsea un pegado de pagos: primero intenta por encabezados (tracking + cod);
 * si no hay encabezados (vienen del cuerpo del correo), usa heurística por línea:
 * token largo de dígitos = guía; tipo COD/FTC/ROD si aparece; último número = monto.
 */
export function parsePaymentsPaste(raw: string): ParsedPayment[] {
  const rows = toMatrix(raw);
  if (!rows.length) return [];
  const detected = detectHeaderMap(rows);
  const out: ParsedPayment[] = [];

  if (detected && detected.map["trackingNumber"] !== undefined) {
    const { headerRowIndex, map } = detected;
    for (const r of rows.slice(headerRowIndex + 1)) {
      const tracking = String(r[map["trackingNumber"]] ?? "").trim();
      if (!tracking) continue;
      const codCell = map["cod"] !== undefined ? String(r[map["cod"]] ?? "") : r.join(" ");
      const { type, amount } = parsePaymentCell(codCell);
      out.push({ tracking, amount, type, raw: codCell.trim() });
    }
    return out;
  }

  // Heurística (texto libre del correo). Se quita la guía de la línea ANTES de
  // leer el monto, para que el número de guía no se confunda con el importe.
  for (const cells of rows) {
    const line = cells.join(" ").trim();
    if (!line) continue;
    const trackMatch = line.match(/\b\d{9,}\b/);
    if (!trackMatch) continue;
    const rest = line.replace(trackMatch[0], " ");
    const { type, amount } = parsePaymentCell(rest);
    out.push({ tracking: trackMatch[0], amount, type, raw: rest.trim() });
  }
  return out;
}

export interface ParsedHv { tracking: string; address: string; }

/** Parsea un pegado de High Value: guía (+ dirección si viene). */
export function parseHvPaste(raw: string): ParsedHv[] {
  const rows = toMatrix(raw);
  if (!rows.length) return [];
  const detected = detectHeaderMap(rows);
  const out: ParsedHv[] = [];

  if (detected && detected.map["trackingNumber"] !== undefined) {
    const { headerRowIndex, map } = detected;
    const addrIdx = map["recipientAddress"];
    for (const r of rows.slice(headerRowIndex + 1)) {
      const tracking = String(r[map["trackingNumber"]] ?? "").trim();
      if (!tracking) continue;
      out.push({ tracking, address: addrIdx !== undefined ? String(r[addrIdx] ?? "").trim() : "" });
    }
    return out;
  }
  // Heurística: primer token largo de dígitos por línea.
  for (const cells of rows) {
    const line = cells.join(" ").trim();
    const m = line.match(/\b\d{9,}\b/);
    if (m) out.push({ tracking: m[0], address: "" });
  }
  return out;
}

/** Aplica pagos a la tabla: marca filas existentes y agrega las que falten. */
export function mergePayments(table: MappedTable, payments: ParsedPayment[]): MappedTable {
  const rows = table.rows.map((r) => ({ ...r, values: { ...r.values } }));
  const byTracking = new Map<string, MappedRow>();
  for (const r of rows) {
    const t = String(r.values["trackingNumber"] ?? "").trim();
    if (t) byTracking.set(t, r);
  }
  let fields = table.fields.some((f) => f.field === "cod") ? table.fields : [...table.fields, COD_FIELD];

  for (const p of payments) {
    if (!p.tracking) continue;
    const codText = `${p.type ? p.type + " " : ""}${p.amount ?? p.raw}`.trim();
    const existing = byTracking.get(p.tracking);
    if (existing) {
      existing.values["cod"] = codText;
      const pay = parsePaymentCell(codText);
      existing.hasPayment = pay.amount !== null;
      existing.paymentNoType = existing.hasPayment && !pay.type;
    } else {
      const values: Record<string, string> = { trackingNumber: p.tracking, cod: codText };
      const nr = analyzeRow(values, true);
      rows.push(nr);
      byTracking.set(p.tracking, nr);
    }
  }
  return recompute({ fields, rows, meta: table.meta, problems: table.problems, sources: table.sources });
}

/** Marca filas como High Value y agrega las que falten. */
export function mergeHighValue(table: MappedTable, hv: ParsedHv[]): MappedTable {
  const rows = table.rows.map((r) => ({ ...r, values: { ...r.values } }));
  const byTracking = new Map<string, MappedRow>();
  for (const r of rows) {
    const t = String(r.values["trackingNumber"] ?? "").trim();
    if (t) byTracking.set(t, r);
  }
  for (const h of hv) {
    if (!h.tracking) continue;
    const existing = byTracking.get(h.tracking);
    if (existing) {
      existing.isHighValue = true;
      if (h.address && !existing.values["recipientAddress"]) existing.values["recipientAddress"] = h.address;
    } else {
      const values: Record<string, string> = { trackingNumber: h.tracking };
      if (h.address) values["recipientAddress"] = h.address;
      const nr = analyzeRow(values, true);
      nr.isHighValue = true;
      rows.push(nr);
      byTracking.set(h.tracking, nr);
    }
  }
  return recompute({ fields: table.fields, rows, meta: table.meta, problems: table.problems, sources: table.sources });
}

/**
 * Pegado → matriz de celdas. Divide por TAB (pegado de Excel) o por 2+ espacios
 * (columnas alineadas). NO divide por coma: rompería montos ("1,250.00") y
 * direcciones ("Calle 1, Int 2"). El texto libre del correo queda como 1 celda
 * y lo resuelve la heurística por regex.
 */
export function toMatrix(raw: string): string[][] {
  return String(raw ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => (line.includes("\t") ? line.split("\t") : line.split(/ {2,}/)));
}
