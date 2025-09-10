"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, DollarSignIcon, GemIcon, MapPin, Package, PackageCheckIcon, Phone, User } from "lucide-react";
import { PackageDispatch, PackageInfo } from "@/lib/types";
import { FedExPackageDispatchPDF } from "@/lib/services/package-dispatch/package-dispatch-pdf-generator";
import { pdf } from "@react-pdf/renderer";
import { IconPdf } from "@tabler/icons-react";
import { useToast } from "@/components/ui/use-toast";
import { mapToPackageInfo } from "@/lib/utils";

interface Props {
  dispatch: PackageDispatch;
  onClose: () => void;
}

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

export default function PackageDispatchDetails({ dispatch, onClose }: Props) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const packageDispatchShipments: PackageInfo[] = mapToPackageInfo(dispatch.shipments, dispatch.chargeShipments)

  const handlePdfCreate = async () => {
    setIsLoading(true);
    try {
      const blob = await pdf(
        <FedExPackageDispatchPDF
          key={Date.now()}
          drivers={dispatch.drivers ?? []}
          routes={dispatch.routes ?? []}
          vehicle={dispatch.vehicle ?? { id: "", name: "N/A" }}
          packages={packageDispatchShipments ?? []}
          subsidiaryName={dispatch.subsidiary?.name ?? "N/A"}
          trackingNumber={dispatch.trackingNumber ?? "N/A"}
        />
      ).toBlob();

      const currentDate = new Date().toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).replace(/\//g, "-");
      const fileName = `Salida_${dispatch.subsidiary?.name ?? "Unknown"}_${currentDate}.pdf`;
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
            <span>Detalles de Salida</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <MapPin className="h-5 w-5" />
            <span>Sucursal: {dispatch.subsidiary?.name ?? "N/A"}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dispatch Information */}
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <strong>Unidad de Transporte:</strong> {dispatch.vehicle?.name ?? "N/A"}
            </div>
            <div>
              <strong>Fecha:</strong> {dispatch.createdAt ? new Date(dispatch.createdAt).toLocaleDateString("es-ES") : "N/A"}
            </div>
            <div>
              <strong>No. Seguimiento:</strong> {dispatch.trackingNumber ?? "N/A"}
            </div>
            <div>
              <strong>Repartidores:</strong>{" "}
              {dispatch.drivers?.map((d) => d.name).join(", ") || "N/A"}
            </div>
            <div>
              <strong>Rutas:</strong>{" "}
              {dispatch.routes?.map((r) => r.name).join(", ") || "N/A"}
            </div>
            <div>
              <strong>Kilometraje:</strong> {dispatch.kms ?? "N/A"}
            </div>
          </div>
        </div>

        {/* Paquetes valido */}
        {packageDispatchShipments?.length > 0 && (
          <div className="mt-6 space-y-2">
            <h3 className="text-lg font-semibold text-gray-800">Paquetes Validados</h3>
            <div className="flex flex-row items-end justify-end">
              <div className="flex items-center gap-x-3 text-xs text-gray-600 flex-wrap">
                <span>Simbología:</span>
                <div className="flex items-center gap-x-1">
                  <span>Carga/F2/31.5:</span>
                  <Badge className="h-4 text-white bg-green-600 whitespace-nowrap">Carga/F2/31.5</Badge>
                </div>
                <span className="text-gray-400">•</span>
                <div className="flex items-center gap-x-1">
                  <span>Alto Valor:</span>
                  <Badge className="h-4 bg-violet-600 hover:bg-violet-700 flex items-center justify-center p-1">
                    <GemIcon className="h-4 w-4 text-white" />
                  </Badge>
                </div>
                <span className="text-gray-400">•</span>
                <div className="flex items-center gap-x-1">
                  <span>Cobros (FTC/ROD/COD):</span>
                  <Badge className="h-4 bg-blue-600 hover:bg-blue-700 text-xs flex items-center gap-x-1 p-1">
                    <DollarSignIcon className="h-4 w-4 text-white" />
                    <span className="text-white whitespace-nowrap">A COBRAR: FTC $1000.00</span>
                  </Badge>
                </div>
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto border border-gray-300 rounded-md">
              <ul className="divide-y divide-gray-300">
                {packageDispatchShipments.map((pkg, index) => (
                  <li key={`${pkg.trackingNumber}-${index}`} className="flex justify-between items-center px-4 py-2 hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium font-mono">{pkg.trackingNumber}</span>
                        {/*<Badge variant={pkg.isValid ? "success" : "destructive"} className="text-xs">
                          {pkg.isValid ? "Válido" : "Inválido"}
                        </Badge>*/}
                        {pkg.priority && (
                          <Badge
                            variant={
                              pkg.priority === "alta"
                                ? "destructive"
                                : pkg.priority === "media"
                                ? "secondary"
                                : "outline"
                            }
                            className="text-xs"
                          >
                            {pkg.priority.toUpperCase()}
                          </Badge>
                        )}
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
                          {pkg.recipientAddress && (
                            <span className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1 text-black" />
                              Dirección: {pkg.recipientAddress}
                            </span>
                          )}
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

        {/* Invalid Tracking Numbers */}
        {/*dispatch.invalidNumbers?.length > 0 && (
          <div className="mt-6 space-y-2">
            <h3 className="text-lg font-semibold text-gray-800">Guías No Validadas</h3>
            <div className="border border-gray-300 rounded-md">
              <ul className="divide-y divide-gray-300">
                {dispatch.invalidNumbers.map((tracking, i) => (
                  <li key={`invalid-${i}`} className="px-4 py-2 text-sm">
                    {tracking}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )*/}

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