"use client";

import { pdf } from "@react-pdf/renderer";
import type { Inventory, PackageInfo } from "@/lib/types";
import { mapToPackageInfo } from "@/lib/utils";
import { getInventoryDetail, uploadFiles } from "@/lib/services/inventories";
import { InventoryPDFReport } from "@/lib/services/inventory/inventory-pdf-generator";
import { generateInventoryExcel } from "@/lib/services/inventory/inventory-excel-generator";
import { orderWarehousePackages } from "@/components/warehouse/shared/warehouse-scan";
import { inventoryFileBase } from "@/lib/inventory-files";

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** PDF + Excel de un inventario (para descargar o mandar por correo). */
export async function buildInventoryFiles(inventory: Inventory, packages: PackageInfo[]) {
  const baseName = inventoryFileBase(inventory);
  const options = { packages };
  const pdfBlob = await pdf(<InventoryPDFReport report={inventory} {...options} />).toBlob();
  const excelBuffer = await generateInventoryExcel(inventory, false, options);
  return {
    baseName,
    pdfBlob,
    pdfFile: new File([pdfBlob], `${baseName}.pdf`, { type: "application/pdf" }),
    excelFile: new File([excelBuffer], `${baseName}.xlsx`, { type: XLSX_TYPE }),
  };
}

/**
 * Reenvía el correo de un inventario ya guardado (historial / detalle). Arma de nuevo el PDF y el
 * Excel (agrupados por paquetería, como en el historial) y NO repite el correo de "críticos".
 */
export async function resendInventoryEmail(inventoryOrId: Inventory | string) {
  const inventory = typeof inventoryOrId === "string" ? await getInventoryDetail(inventoryOrId) : inventoryOrId;
  const packages = orderWarehousePackages(mapToPackageInfo(inventory.shipments, inventory.chargeShipments), "carrier");
  const { pdfFile, excelFile } = await buildInventoryFiles(inventory, packages);
  await uploadFiles(pdfFile, excelFile, inventory.subsidiary?.name ?? "", inventory.id, undefined, { resend: true });
  return inventory;
}
