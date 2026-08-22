/**
 * Espejo (frontend) del mapeo de encabezados FedEx del backend
 * (`src/utils/header-detector.util.ts`). Se usa en el flujo de "pegar" para
 * construir la tabla IGUAL que el import por archivo: detecta la fila de
 * encabezados, mapea columnas FedEx → campos del shipment e IGNORA todo lo que
 * no aplica. Si cambian los alias del backend, actualizar aquí también.
 */

/** Normaliza un encabezado igual que el backend (minúsculas, sin símbolos ni espacios). */
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

/** Alias normalizados → campo canónico (subconjunto usado para pegar FedEx). */
export const HEADER_ALIASES: Record<string, string> = {
  // Tracking
  trackingnumber: "trackingNumber",
  tracking: "trackingNumber",
  trackingno: "trackingNumber",
  numeroguia: "trackingNumber",
  hwbno: "trackingNumber",
  guia: "trackingNumber",
  awbmaster: "trackingNumber",
  awbmaestro: "trackingNumber",
  // Nombre
  recipname: "recipientName",
  recipientname: "recipientName",
  nombredest: "recipientName",
  nombre: "recipientName",
  destinatario: "recipientName",
  receptor: "recipientName",
  // Dirección
  recipaddr: "recipientAddress",
  recipientaddress: "recipientAddress",
  rcvraddr1: "recipientAddress",
  calledest: "recipientAddress",
  address: "recipientAddress",
  direccion: "recipientAddress",
  domicilio: "recipientAddress",
  direccin: "recipientAddress",
  // Dirección 2
  rcvraddr2: "recipientAddress2",
  address2: "recipientAddress2",
  direccion2: "recipientAddress2",
  // Ciudad
  recipientcity: "recipientCity",
  recipcity: "recipientCity",
  ciudad: "recipientCity",
  city: "recipientCity",
  // CP
  recipientzip: "recipientZip",
  recipostal: "recipientZip",
  rcvrpostcode: "recipientZip",
  codigopostaldest: "recipientZip",
  zip: "recipientZip",
  postal: "recipientZip",
  codigopostal: "recipientZip",
  recippostal: "recipientZip",
  cp: "recipientZip",
  // Fecha compromiso
  commitdate: "commitDate",
  edd: "commitDate",
  date: "commitDate",
  fecha: "commitDate",
  fechacompromiso: "commitDate",
  fechaentrega: "commitDate",
  vencimiento: "commitDate",
  // Hora compromiso
  committime: "commitTime",
  time: "commitTime",
  hora: "commitTime",
  horacompromiso: "commitTime",
  // Teléfono
  recipphone: "recipientPhone",
  phone: "recipientPhone",
  telefono: "recipientPhone",
  celular: "recipientPhone",
  phonenumber: "recipientPhone",
  cel: "recipientPhone",
  tel: "recipientPhone",
  telfono: "recipientPhone",
  // Pago / COD
  cod: "cod",
  payment: "cod",
  cashondelivery: "cod",
  contraentrega: "cod",
  pagocontraentrega: "cod",
  pago: "cod",
  lastcommscanupdate: "cod",
  commcommentcommentcontainall: "cod",
};

/**
 * Campos canónicos que exportamos en el .xlsx generado. El encabezado emitido
 * DEBE normalizar a una key de HEADER_ALIASES para que el backend lo reconozca.
 * (p.ej. "phone" → "phone" ✓; "cod" → "cod" ✓)
 */
export const CANONICAL_FIELDS = [
  { field: "trackingNumber", header: "trackingNumber", label: "Guía" },
  { field: "recipientName", header: "recipientName", label: "Destinatario" },
  { field: "recipientAddress", header: "recipientAddress", label: "Dirección" },
  { field: "recipientCity", header: "recipientCity", label: "Ciudad" },
  { field: "recipientZip", header: "recipientZip", label: "CP" },
  { field: "commitDate", header: "commitDate", label: "Fecha" },
  { field: "commitTime", header: "commitTime", label: "Hora" },
  { field: "recipientPhone", header: "phone", label: "Teléfono" },
  { field: "cod", header: "cod", label: "Pago" },
] as const;

export type CanonicalField = (typeof CANONICAL_FIELDS)[number]["field"];

export interface HeaderMapResult {
  headerRowIndex: number;
  /** campo canónico → índice de columna en la fila cruda */
  map: Record<string, number>;
}

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

export interface MappedTable {
  /** Campos canónicos presentes (en orden de CANONICAL_FIELDS). */
  fields: typeof CANONICAL_FIELDS[number][];
  /** Filas de datos ya mapeadas: cada fila es un objeto campo→valor. */
  rows: Record<string, string>[];
  hasTracking: boolean;
  hasPayment: boolean;
}

/**
 * Construye la tabla limpia (igual que el import de FedEx): combina dirección +
 * dirección2, conserva solo columnas reconocidas y agrega Pago si viene.
 */
export function buildMappedTable(rawRows: string[][]): MappedTable | null {
  const detected = detectHeaderMap(rawRows);
  if (!detected) return null;

  const { headerRowIndex, map } = detected;
  const addr2Index = map["recipientAddress2"];
  const dataRows = rawRows.slice(headerRowIndex + 1).filter((r) => r.some((c) => String(c ?? "").trim() !== ""));

  const fields = CANONICAL_FIELDS.filter((f) => map[f.field] !== undefined);
  const hasPayment = map["cod"] !== undefined;
  const hasTracking = map["trackingNumber"] !== undefined;

  const rows = dataRows.map((raw) => {
    const out: Record<string, string> = {};
    for (const f of fields) {
      let value = String(raw[map[f.field]] ?? "").trim();
      if (f.field === "recipientAddress" && addr2Index !== undefined) {
        const a2 = String(raw[addr2Index] ?? "").trim();
        if (a2) value = [value, a2].filter(Boolean).join(", ");
      }
      out[f.field] = value;
    }
    return out;
  }).filter((r) => String(r["trackingNumber"] ?? "").trim() !== "");

  return { fields: fields as any, rows, hasTracking, hasPayment };
}
