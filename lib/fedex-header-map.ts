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

export interface MappedTable {
  fields: FieldDef[];
  rows: MappedRow[];
  hasTracking: boolean;
  hasPayment: boolean;
  counts: MappedCounts;
  meta: DetectedMeta;
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

/** Convierte "dd/mm/yyyy" (convención MX) a "yyyy-MM-dd" para inputs date. */
function toIsoDate(value: string): string | undefined {
  const m = String(value ?? "").trim().match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (!m) return undefined;
  let [, d, mo, y] = m;
  if (y.length === 2) y = "20" + y;
  const dd = d.padStart(2, "0");
  const mm = mo.padStart(2, "0");
  if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) return undefined;
  return `${y}-${mm}-${dd}`;
}

/**
 * Lee la(s) fila(s) meta que van ANTES del encabezado (p.ej.
 * "305794238300  ALBERTO GUTIERREZ  SALIDA AEREA … 05/06/2026") y extrae el
 * consNumber (primer token de dígitos), la fecha y si es aérea.
 */
export function detectMeta(rawRows: string[][], headerRowIndex: number): DetectedMeta {
  const meta: DetectedMeta = {};
  for (let i = 0; i < headerRowIndex; i++) {
    const row = rawRows[i] ?? [];
    const joined = row.join(" ");
    if (!meta.consNumber) {
      for (const cell of row) {
        const v = String(cell ?? "").trim();
        if (/^\d{6,}$/.test(v)) { meta.consNumber = v; break; }
      }
    }
    if (!meta.date) {
      for (const cell of row) {
        const iso = toIsoDate(String(cell ?? ""));
        if (iso) { meta.date = iso; break; }
      }
    }
    if (meta.aereo === undefined && /\bAERE/i.test(joined)) meta.aereo = true;
    else if (meta.aereo === undefined && /\b(TERRESTRE|ORDINARIA)\b/i.test(joined)) meta.aereo = false;
  }
  return meta;
}

function recompute(table: { fields: FieldDef[]; rows: MappedRow[]; meta?: DetectedMeta }): MappedTable {
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
  };
}

/**
 * Construye la tabla limpia desde el pegado principal (Master/Aéreo/F2).
 * Combina dirección + dirección2, conserva solo columnas reconocidas, marca
 * problemas por fila y calcula conteos. `null` si no hay encabezados FedEx.
 */
export function buildMappedTable(rawRows: string[][]): MappedTable | null {
  const detected = detectHeaderMap(rawRows);
  if (!detected) return null;

  const { headerRowIndex, map } = detected;
  const addr2Index = map["recipientAddress2"];
  const dataRows = rawRows.slice(headerRowIndex + 1).filter((r) => r.some((c) => String(c ?? "").trim() !== ""));

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

  const meta = detectMeta(rawRows, headerRowIndex);
  return recompute({ fields, rows, meta });
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
  return recompute({ fields, rows, meta: table.meta });
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
  return recompute({ fields: table.fields, rows, meta: table.meta });
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
