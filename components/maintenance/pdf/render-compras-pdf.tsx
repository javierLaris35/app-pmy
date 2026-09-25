"use client";

/**
 * Genera en el navegador los PDF de Compras (orden, solicitud de cotización y comparativo) con
 * @react-pdf/renderer. Sirven para verlos y para adjuntarlos al enviar por correo/WhatsApp (se suben al
 * backend), así no dependemos de Chromium/Playwright en el servidor.
 */
import { pdf } from "@react-pdf/renderer";
import { getCompanySettings } from "@/lib/services/company-settings";
import { mapComparisonPdf, mapPurchaseOrderPdf, mapRfqPdf } from "@/lib/compras-pdf";
import type { Comparison, MaintenanceRequest, NeedView, PurchaseOrder, SupplierContact } from "@/lib/types/maintenance";
import { ComparisonDocument, PdfCompany, PurchaseOrderDocument, RfqDocument } from "./compras-pdf-documents";

let companyCache: Promise<PdfCompany> | null = null;

/** Datos de la empresa (Configuración → Empresa) + logo; se piden una vez por sesión. */
function loadCompany(): Promise<PdfCompany> {
  companyCache ??= getCompanySettings()
    .then((c) => ({ name: c.name || "PMY", taxId: c.taxId, address: c.address, phone: c.phone, email: c.email, website: c.website }))
    .catch(() => ({ name: "Paquetería y Mensajería del Yaqui" }))
    .then((c) => ({ ...c, logoUrl: typeof window !== "undefined" ? `${window.location.origin}/pmy_logo.png` : undefined }));
  return companyCache;
}

export async function purchaseOrderPdfBlob(po: PurchaseOrder): Promise<Blob> {
  const company = await loadCompany();
  return pdf(<PurchaseOrderDocument data={mapPurchaseOrderPdf(po)} company={company} />).toBlob();
}

export async function rfqPdfBlob(
  request: MaintenanceRequest,
  needs: NeedView[],
  supplier: { name: string } | null,
  contact: SupplierContact | null,
  sender: { name: string; email?: string | null },
  notes?: string | null,
): Promise<Blob> {
  const company = await loadCompany();
  return pdf(<RfqDocument data={mapRfqPdf(request, needs, supplier, contact, sender, notes)} company={company} />).toBlob();
}

export async function comparisonPdfBlob(request: MaintenanceRequest, comparison: Comparison, preparedBy: string): Promise<Blob> {
  const company = await loadCompany();
  return pdf(<ComparisonDocument data={mapComparisonPdf(request, comparison, preparedBy)} company={company} />).toBlob();
}
