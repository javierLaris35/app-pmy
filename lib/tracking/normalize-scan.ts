/**
 * Normalización y clasificación de códigos escaneados (FedEx / DHL).
 *
 * En una misma sesión se mezclan guías FedEx (numéricas; el lector entrega un
 * barcode largo, siempre >20 dígitos) y guías DHL (dhlUniqueId). El recorte
 * ciego a los últimos 12 dígitos mutilaba los DHL: aquí se decide por
 * paquetería ANTES de recortar.
 *
 * Formatos DHL reales observados (todos válidos como dhlUniqueId):
 *   - Con prefijo:  JD + 18 dígitos   -> "JD004600012672343626"   (20 chars)
 *                   JD + 19 dígitos   -> "JD0081105261048858403"  (21 chars)
 *   - Numérico puro: 18 dígitos       -> "008860660448181145"
 *
 * Detalle del prefijo:
 *   - El LECTOR de barras entrega "JJD"; en la BD/correo se guarda como "JD".
 *     Por eso normalizamos "JJD" -> "JD" (si no, el escaneo no haría match).
 *
 * Regla anti-colisión: FedEx escaneado SIEMPRE viene >20 dígitos y el master
 * son 12; por eso un numérico de 18 no puede ser FedEx -> es DHL.
 */

export type ScanCarrier = "fedex" | "dhl";

export interface NormalizedScan {
  /** Identificador final a enviar al backend (dhlUniqueId para DHL, master de 12 para FedEx). */
  code: string;
  carrier: ScanCarrier;
}

/** DHL: el lector entrega "JJD", la BD guarda "JD". Detecta ambos. */
const DHL_PREFIX = /^J?JD/;

/** Longitud del dhlUniqueId DHL cuando llega como puros números (ej. 008860660448181145). */
const DHL_NUMERIC_LENGTH = 18;

/** Longitud final de una guía master FedEx. */
export const FEDEX_CODE_LENGTH = 12;

/** dhlUniqueId válido: "JD" + 16-20 dígitos, o numérico puro de 18. */
const DHL_VALID = new RegExp(`^(JD\\d{16,20}|\\d{${DHL_NUMERIC_LENGTH}})$`);

/** Guía FedEx válida (master). */
const FEDEX_VALID = /^\d{10,12}$/;

/**
 * Normaliza un código escaneado/pegado y determina su paquetería.
 * Es idempotente: normalizar un código ya normalizado devuelve el mismo valor.
 */
export function normalizeScannedCode(raw: string): NormalizedScan | null {
  if (!raw) return null;

  // 1. Limpiar separadores, espacios, símbolos y caracteres invisibles
  //    (esto neutraliza QR con $, ", #, %, etc.).
  const clean = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (!clean) return null;

  // 2. DHL con prefijo: JJD (lector) o JD (correo/BD) -> normalizar a "JD" y conservar completo.
  if (DHL_PREFIX.test(clean)) {
    return { code: clean.replace(/^JJD/, "JD"), carrier: "dhl" };
  }

  // 3. DHL numérico puro (longitud fija conocida) -> conservar completo.
  if (clean.length === DHL_NUMERIC_LENGTH && /^\d+$/.test(clean)) {
    return { code: clean, carrier: "dhl" };
  }

  // 4. Cualquier otro código con letras NO es FedEx ni DHL válido (probable QR/basura).
  //    Se clasifica como DHL para que la validación de formato lo rechace.
  if (/[A-Z]/.test(clean)) {
    return { code: clean, carrier: "dhl" };
  }

  // 5. FedEx (numérico) -> últimos 12 dígitos si viene el barcode largo.
  const code =
    clean.length > FEDEX_CODE_LENGTH ? clean.slice(-FEDEX_CODE_LENGTH) : clean;
  return { code, carrier: "fedex" };
}

/** Valida que un código normalizado tenga formato aceptable para validar contra el backend. */
export function isValidScannedCode(
  scan: NormalizedScan | null,
): scan is NormalizedScan {
  if (!scan) return false;
  return scan.carrier === "fedex"
    ? FEDEX_VALID.test(scan.code)
    : DHL_VALID.test(scan.code);
}
