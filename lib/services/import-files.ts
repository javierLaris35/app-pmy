import { axiosConfig } from "../axios-config";

export type ImportFileKind = "master" | "payment" | "high_value" | "f2";

export interface ImportFileItem {
  id: string;
  carrier: string;
  kind: ImportFileKind;
  originalName: string;
  size: number;
  rowCount: number | null;
  subsidiaryId: string | null;
  consNumber: string | null;
  consolidatedId: string | null;
  uploadedByName: string | null;
  createdAt: string;
}

export const IMPORT_KIND_LABEL: Record<ImportFileKind, string> = {
  master: "Aéreo/Master",
  payment: "Cobros",
  high_value: "Alto Valor",
  f2: "F2/Cargas",
};

export async function listImportFiles(
  params: { subsidiaryId?: string; kind?: string; from?: string; to?: string } = {},
): Promise<ImportFileItem[]> {
  const { data } = await axiosConfig.get("/import-files", { params });
  return data;
}

export async function getImportFilesByConsolidated(consolidatedId: string): Promise<ImportFileItem[]> {
  const { data } = await axiosConfig.get(`/import-files/by-consolidated/${consolidatedId}`);
  return data;
}

/** Descarga el archivo original vía blob autenticado y dispara el guardado en el navegador. */
export async function downloadImportFile(item: Pick<ImportFileItem, "id" | "originalName">): Promise<void> {
  const res = await axiosConfig.get(`/import-files/${item.id}/download`, { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = item.originalName || "archivo";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
