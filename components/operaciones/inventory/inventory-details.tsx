"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, MapPin, PackageCheckIcon, Sheet } from "lucide-react";
import { Inventory } from "@/lib/types";
import { InventoryPDFReport } from "@/lib/services/inventory/inventory-pdf-generator";
import { generateInventoryExcel, inventoryRejectedRows } from "@/lib/services/inventory/inventory-excel-generator";
import { pdf } from "@react-pdf/renderer";
import { IconPdf } from "@tabler/icons-react";
import { useToast } from "@/components/ui/use-toast";
import { mapToPackageInfo } from "@/lib/utils";
import { PackagesList } from "@/components/shared/packages-list";
import { InventoryPackageToolbar, useInventoryPackageView } from "./inventory-package-view";

interface Props {
  inventory: Inventory;
  onClose: () => void;
}

const TYPE_LABEL: Record<string, string> = { initial: "Inicial", dex: "DEX", final: "Final" };

export default function InventoryDetails({ inventory, onClose }: Props) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const packages = useMemo(
    () => mapToPackageInfo(inventory.shipments, inventory.chargeShipments),
    [inventory.shipments, inventory.chargeShipments],
  );
  const view = useInventoryPackageView(packages);
  const rejected = inventoryRejectedRows(inventory);

  const fileStamp = new Date()
    .toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
    .replace(/\//g, "-");
  const baseName = `PMY_Inventario_${inventory.subsidiary?.name ?? "Sucursal"}_${fileStamp}`;

  // PDF/Excel con lo que se ve: paquetería/ciudad elegidas y el orden elegido.
  const exportOptions = { packages: view.visible, filterLabel: view.filterLabel };

  const handlePdfCreate = async () => {
    setIsLoading(true);
    try {
      const blob = await pdf(<InventoryPDFReport report={inventory} {...exportOptions} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${baseName}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ title: "Error al generar PDF", description: "Hubo un problema al generar el PDF.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExcelCreate = async () => {
    setIsLoading(true);
    try {
      await generateInventoryExcel(inventory, true, exportOptions);
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast({ title: "Error al generar Excel", description: "Hubo un problema al generar el Excel.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full border-0 shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PackageCheckIcon className="h-5 w-5" />
            <span>Detalle de inventario</span>
            <Badge variant="secondary">{TYPE_LABEL[inventory.type ?? ""] ?? "Inicial"}</Badge>
          </div>
          <div className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{inventory.subsidiary?.name ?? "N/A"}</span>
          </div>
        </CardTitle>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span>
            Fecha:{" "}
            <span className="font-medium text-foreground">
              {inventory.inventoryDate ? new Date(inventory.inventoryDate).toLocaleDateString("es-MX") : "N/A"}
            </span>
          </span>
          <span>
            Folio: <span className="font-mono font-medium text-foreground">{inventory.trackingNumber ?? "N/A"}</span>
          </span>
          <span>
            Paquetes: <span className="font-medium text-foreground">{packages.length}</span>
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-0">
        <InventoryPackageToolbar view={view} />

        <PackagesList
          packages={view.visible}
          showFilters={false}
          groupBy={view.groupBy}
                          showRowNumbers={view.showRowNumbers}
          maxHeightClass="max-h-[50vh]"
          emptyTitle="Sin paquetes"
          emptyDescription="Ningún paquete coincide con la paquetería o ciudad elegida."
        />

        {rejected.length > 0 && (
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Guías no incluidas ({rejected.length})
            </h3>
            <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
              {rejected.map((r, i) => (
                <div key={`${r.trackingNumber}-${i}`} className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm">
                  <span className="font-mono">{r.trackingNumber}</span>
                  <span className="text-right text-muted-foreground">{r.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={handleExcelCreate} disabled={isLoading} variant="outline" className="gap-2">
            <Sheet className="h-4 w-4" />
            Excel
          </Button>
          <Button onClick={handlePdfCreate} disabled={isLoading} className="gap-2">
            <IconPdf className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
