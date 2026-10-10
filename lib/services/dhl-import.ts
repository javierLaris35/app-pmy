import type { ParsedDhlShipment, FinalDhlSubmission } from "@/components/import-components/import-dhl-text-modal";
import { parseDhlExcelFile, updateFromDHL, uploadShipmentFileDhl } from "@/lib/services/shipments";

/**
 * Acciones del asistente "Importar DHL", compartidas por Operaciones → Envíos y la
 * Bandeja de correos (mismo backend, mismo resultado).
 */

/** Paso 1 (texto pegado): el backend lee los bloques "AWB :" y devuelve las guías/JD. */
export const dhlProcessText = (text: string): Promise<ParsedDhlShipment[]> => uploadShipmentFileDhl(text);

/** Paso 1 (Excel DHL de 3 hojas): guías/JD con vencimiento ya precargado. */
export const dhlParseFile = (file: File): Promise<ParsedDhlShipment[]> => parseDhlExcelFile(file);

/** Guardado final: manda el layout armado + sucursal / fecha / consolidado. */
export async function dhlFinalSave(data: FinalDhlSubmission): Promise<void> {
  const formData = new FormData();
  formData.append("file", data.file);
  formData.append("subsidiaryId", data.subsidiaryId);
  if (data.consDate) formData.append("consDate", data.consDate);
  if (data.consNumber && data.consNumber.trim() !== "") formData.append("consNumber", data.consNumber.trim());
  await updateFromDHL(formData);
}
