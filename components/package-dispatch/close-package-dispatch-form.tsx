import { MapPinIcon, StampIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useState } from "react";
import { PackageDispatch } from "@/lib/types";
import InfoField  from "./info-field";
import { BarcodeScannerInput } from "../barcode-scanner-input";
import { Label } from "../ui/label";

interface ClosePackageDisptachProps  {
    dispatch: PackageDispatch;
    onClose: () => void;
}

export default function ClosePackageDisptach({dispatch}: ClosePackageDisptachProps){
    const [selectedSubsidiaryName, setSelectedSubsidirayName] = useState<string | null>(null)
    const [trackingNumbersRaw, setTrackingNumbersRaw] = useState("")

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between w-full">
                {/* Lado izquierdo */}
                <div className="flex items-center gap-2">
                    <StampIcon className="h-5 w-5" />
                        <span>Salida de Paquetes</span>
                </div>

                {/* Lado derecho */}
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPinIcon className="h-5 w-5" />
                    <span>Sucursal: {dispatch.subsidiary.name}</span>
                </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* Dispatch Information */}
                <div className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InfoField label="Unidad de Transporte" value={dispatch.vehicle?.name} />
                        <InfoField 
                            label="Fecha" 
                            value={dispatch.createdAt ? new Date(dispatch.createdAt).toLocaleDateString("es-ES") : null} 
                        />
                        <InfoField label="No. Seguimiento" value={dispatch.trackingNumber} />
                        <InfoField label="Repartidores" value={dispatch.drivers?.map(d => d.name).join(", ")} />
                        <InfoField label="Rutas" value={dispatch.routes?.map(r => r.name).join(", ")} />
                        <InfoField label="Kilometraje" value={dispatch.kms} />
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <BarcodeScannerInput 
                            label="Guías Regresadas"
                            onTrackingNumbersChange={(rawString) => setTrackingNumbersRaw(rawString)} 
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}