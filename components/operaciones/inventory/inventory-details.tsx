"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertCircle,
  DollarSignIcon,
  GemIcon,
  MapPin,
  Package,
  PackageCheckIcon,
  Phone,
  User,
} from "lucide-react";
import { Inventory, PackageInfo, PackageInfoForInventory } from "@/lib/types";
import { InventoryPDFReport } from "@/lib/services/inventory/inventory-pdf-generator";
import { pdf } from "@react-pdf/renderer";
import { IconPdf } from "@tabler/icons-react";
import { useToast } from "@/components/ui/use-toast";
import { mapToPackageInfo } from "@/lib/utils";

interface Props {
  inventory: Inventory;
  onClose: () => void;
}

export default function InventoryDetails({ inventory, onClose }: Props) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const packages: PackageInfo[] = mapToPackageInfo(inventory.shipments, inventory.chargeShipments)

  const formatMexicanPhoneNumber = (phone: string | null | undefined): string => {
    if (!phone) return "N/A";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `+52 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith("52")) {
      return `+52 (${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
    }
    if (cleaned.length === 13 && cleaned.startsWith("521")) {
      return `+52 (${cleaned.slice(3, 6)}) ${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  const handlePdfCreate = async () => {
    setIsLoading(true);
    try {
      const blob = await pdf(
        <InventoryPDFReport report={inventory} />
      ).toBlob();

      const currentDate = new Date()
        .toLocaleDateString("es-ES", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
        .replace(/\//g, "-");
      const fileName = `PMY_Inventario_${inventory.subsidiary?.name ?? "Unknown"}_${currentDate}.pdf`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error al generar PDF",
        description: "Hubo un problema al generar el PDF.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageCheckIcon className="h-5 w-5" />
            <span>Detalles de Inventario</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <MapPin className="h-5 w-5" />
            <span>Sucursal: {inventory.subsidiary?.name ?? "N/A"}</span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Info básica */}
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <strong>Fecha:</strong>{" "}
              {inventory.inventoryDate ? new Date(inventory.inventoryDate).toLocaleDateString("es-ES") : "N/A"}
            </div>
            <div>
              <strong>No. Seguimiento:</strong> {inventory.trackingNumber ?? "N/A"}
            </div>
          </div>
        </div>

        {/* Paquetes Validados */}
        {packages.length > 0 && (
          <div className="mt-6 space-y-2">
            <h3 className="text-lg font-semibold text-gray-800">Paquetes Validados</h3>

            <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md">
              <ul className="divide-y divide-gray-300">
                {packages.map((pkg, index) => (
                  <li
                    key={`${pkg.trackingNumber}-${index}`}
                    className="flex justify-between items-center px-4 py-2 hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium font-mono">{pkg.trackingNumber}</span>
                        <Badge
                          variant={pkg.isValid ? "success" : "destructive"}
                          className="text-xs"
                        >
                          {pkg.isValid ? "Válido" : "Inválido"}
                        </Badge>
                        {pkg.isCharge && (
                          <Badge className="bg-green-600 hover:bg-green-700 text-xs">
                            <span className="h-4 text-white">CARGA/F2/31.5</span>
                          </Badge>
                        )}
                        {pkg.isHighValue && (
                          <Badge className="bg-violet-600 hover:bg-violet-700 text-xs">
                            <GemIcon className="h-4 w-4 text-white" />
                          </Badge>
                        )}
                        {pkg.payment && (
                          <Badge className="bg-blue-600 hover:bg-blue-700 text-xs">
                            <DollarSignIcon className="h-4 w-4 text-white" />
                            &nbsp; A COBRAR: {pkg.payment.type} ${pkg.payment.amount}
                          </Badge>
                        )}
                      </div>
                      {pkg.isValid && (
                        <div className="text-sm text-gray-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                          {pkg.recipientName && (
                            <span className="flex items-center">
                              <User className="w-4 h-4 mr-1 text-black" />
                              Recibe: {pkg.recipientName}
                            </span>
                          )}
                          {pkg.recipientPhone && (
                            <span className="flex items-center">
                              <Phone className="w-4 h-4 mr-1 text-black" />
                              Teléfono: {formatMexicanPhoneNumber(pkg.recipientPhone)}
                            </span>
                          )}
                        </div>
                      )}
                      {!pkg.isValid && pkg.reason && (
                        <span className="flex items-center text-sm">
                          <AlertCircle className="w-4 h-4 mr-1 text-red-600" />
                          {pkg.reason}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Guías no validadas */}
        {(inventory.missingTrackings?.length > 0 ||
          inventory.unScannedTrackings?.length > 0) && (
          <div className="mt-6 space-y-2">
            <h3 className="text-lg font-semibold text-gray-800">Guías No Validadas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inventory.missingTrackings?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Guías Faltantes</h4>
                  <ul className="border border-gray-300 rounded-md divide-y divide-gray-300">
                    {inventory.missingTrackings.map((tracking, i) => (
                      <li key={`missing-${i}`} className="px-4 py-2 text-sm">
                        {tracking}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {inventory.unScannedTrackings?.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Guías Sin Escaneo</h4>
                  <ul className="border border-gray-300 rounded-md divide-y divide-gray-300">
                    {inventory.unScannedTrackings.map((tracking, i) => (
                      <li key={`unscanned-${i}`} className="px-4 py-2 text-sm">
                        {tracking}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            onClick={handlePdfCreate}
            disabled={isLoading}
            variant="default"
            className="w-full sm:w-auto"
          >
            <IconPdf className="mr-2 h-4 w-4" />
            Generar PDF
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
