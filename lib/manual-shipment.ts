/**
 * Alta manual de paquetes (desembarque "Crear nuevo" y el "+" del header).
 * Espejo de pmy-api src/shipments/manual-shipment.util.ts — mantener en sync:
 * mismas reglas de guía por paquetería y mismos mensajes.
 */
import { normalizeScannedCode } from "@/lib/tracking/normalize-scan";

export type ManualCarrier = "fedex" | "dhl";
export type ManualKind = "shipment" | "charge";

export interface ManualShipmentValues {
  kind: ManualKind;
  carrier: ManualCarrier;
  trackingNumber: string;
  dhlUniqueId: string;
  recipientName: string;
  recipientAddress: string;
  recipientCity: string;
  recipientZip: string;
  recipientPhone: string;
  /** datetime-local: "yyyy-MM-ddTHH:mm" (hora local Hermosillo). */
  commitDateTime: string;
  consNumber: string;
  exceptionCode: string;
  isHighValue: boolean;
}

export type ManualShipmentErrors = Partial<Record<keyof ManualShipmentValues, string>>;

const FEDEX_VALID = /^\d{10,12}$/;
const DHL_WAYBILL_VALID = /^\d{10}$/;
const DHL_PIECE_VALID = /^(J?JD\d{16,20}|\d{18})$/;

export const cleanCode = (v?: string | null) => (v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();

export function emptyManualShipment(overrides: Partial<ManualShipmentValues> = {}): ManualShipmentValues {
  return {
    kind: "shipment",
    carrier: "fedex",
    trackingNumber: "",
    dhlUniqueId: "",
    recipientName: "",
    recipientAddress: "",
    recipientCity: "",
    recipientZip: "",
    recipientPhone: "",
    commitDateTime: "",
    consNumber: "",
    exceptionCode: "",
    isHighValue: false,
    ...overrides,
  };
}

/**
 * Prellenado desde un código escaneado (sobrante): un JD/18 dígitos es pieza DHL;
 * lo demás se toma como guía FedEx. El usuario puede cambiar la paquetería.
 */
export function prefillFromScannedCode(raw: string): Pick<ManualShipmentValues, "carrier" | "trackingNumber" | "dhlUniqueId"> {
  const scan = normalizeScannedCode(raw);
  if (!scan) return { carrier: "fedex", trackingNumber: "", dhlUniqueId: "" };
  if (scan.carrier === "dhl" && DHL_PIECE_VALID.test(scan.code)) {
    return { carrier: "dhl", trackingNumber: "", dhlUniqueId: scan.code.replace(/^JJD/, "JD") };
  }
  if (scan.carrier === "fedex") return { carrier: "fedex", trackingNumber: scan.code, dhlUniqueId: "" };
  return { carrier: "fedex", trackingNumber: "", dhlUniqueId: "" };
}

/** Valida campo por campo; mensajes en lenguaje simple para mostrar bajo cada input. */
export function validateManualShipment(v: ManualShipmentValues): ManualShipmentErrors {
  const errors: ManualShipmentErrors = {};
  const tn = cleanCode(v.trackingNumber);

  if (v.carrier === "fedex") {
    if (!tn) errors.trackingNumber = "Escribe el número de guía.";
    else if (!FEDEX_VALID.test(tn)) errors.trackingNumber = "La guía de FedEx debe tener de 10 a 12 números.";
  } else {
    if (!tn) errors.trackingNumber = "Escribe la guía de DHL (10 números).";
    else if (DHL_PIECE_VALID.test(tn)) errors.trackingNumber = "Eso es el ID de pieza (JD). Ponlo en \"ID de pieza\" y escribe la guía de DHL de 10 números.";
    else if (!DHL_WAYBILL_VALID.test(tn)) errors.trackingNumber = "La guía de DHL debe tener 10 números.";

    const piece = cleanCode(v.dhlUniqueId);
    if (piece && !DHL_PIECE_VALID.test(piece)) errors.dhlUniqueId = "El ID de pieza de DHL no es válido (empieza con JD).";
  }

  if (!v.recipientName.trim()) errors.recipientName = "Escribe el nombre del destinatario.";
  if (!v.recipientAddress.trim()) errors.recipientAddress = "Escribe la dirección.";
  if (!v.recipientCity.trim()) errors.recipientCity = "Escribe la ciudad.";
  if (v.recipientZip.trim() && !/^\d{5}$/.test(v.recipientZip.trim())) errors.recipientZip = "El código postal debe tener 5 números.";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v.commitDateTime)) errors.commitDateTime = "Elige la fecha y hora de entrega.";

  return errors;
}

/** Cuerpo para POST /shipments/add-shipment. */
export function toAddShipmentPayload(v: ManualShipmentValues, subsidiary: { id: string; name?: string | null }) {
  const [date, time = "00:00"] = v.commitDateTime.split("T");
  const piece = cleanCode(v.dhlUniqueId);
  return {
    kind: v.kind,
    shipmentType: v.carrier,
    trackingNumber: cleanCode(v.trackingNumber),
    dhlUniqueId: v.carrier === "dhl" && piece ? piece.replace(/^JJD/, "JD") : undefined,
    recipientName: v.recipientName.trim(),
    recipientAddress: v.recipientAddress.trim(),
    recipientCity: v.recipientCity.trim(),
    recipientZip: v.recipientZip.trim(),
    recipientPhone: v.recipientPhone.trim(),
    commitDate: date,
    commitTime: `${time.slice(0, 5)}:00`,
    consNumber: v.consNumber.trim() || undefined,
    exceptionCode: v.kind === "charge" ? v.exceptionCode.trim() || undefined : undefined,
    isHighValue: v.isHighValue,
    subsidiary: { id: subsidiary.id, name: subsidiary.name ?? undefined },
  };
}

/** Lo que regresa POST /shipments/add-shipment en `shipment` (proyección plana). */
export interface CreatedManualShipment {
  id: string;
  trackingNumber: string;
  dhlUniqueId?: string | null;
  shipmentType: ManualCarrier;
  recipientName?: string;
  recipientAddress?: string;
  recipientCity?: string;
  recipientZip?: string;
  recipientPhone?: string;
  commitDateTime?: string;
  priority?: "alta" | "media" | "baja";
  status?: string;
  isHighValue?: boolean;
  consNumber?: string;
  consolidatedId?: string | null;
  isCharge: boolean;
}
