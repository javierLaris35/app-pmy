"use client";

import { useEffect, useState } from "react";
import {
  ArrowRightLeft,
  ArrowRight,
  AlertTriangle,
  BanknoteIcon,
  GemIcon,
  Loader2,
  MapPin,
  Package,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SucursalSelector } from "@/components/sucursal-selector";
import { useToast } from "@/components/ui/use-toast";
import { PackageInfo } from "@/lib/types";
import { createPackageTransfer, PackageTransferSource } from "@/lib/services/package-transfer";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Paquete mal enrutado a traspasar. */
  pkg: PackageInfo | null;
  /** Sucursal actual (destino por defecto: el paquete suele estar físicamente aquí). */
  currentSubsidiaryId?: string | null;
  currentSubsidiaryName?: string | null;
  source: PackageTransferSource;
  /** Se llama al completar el traspaso (para que el padre saque el paquete de la lista). */
  onSuccess: (pkg: PackageInfo, destinationId: string) => void;
}

/**
 * Traspaso inline de un paquete que "no pertenece a la sucursal" (mal enrutado
 * por FedEx/DHL). Muestra los datos del paquete, la sucursal de origen y una
 * advertencia. El usuario elige el destino y el backend mueve el paquete +
 * registra el traspaso. Visible solo para subadmin/admin/superadmin.
 */
export function TransferPackageDialog({
  open,
  onOpenChange,
  pkg,
  currentSubsidiaryId,
  currentSubsidiaryName,
  source,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const [destinationId, setDestinationId] = useState<string>("");
  const [destinationName, setDestinationName] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Por defecto, destino = sucursal actual (el paquete suele estar aquí).
  useEffect(() => {
    if (open) {
      setDestinationId(currentSubsidiaryId || "");
      setDestinationName(currentSubsidiaryName || "");
    }
  }, [open, currentSubsidiaryId, currentSubsidiaryName]);

  const handleConfirm = async () => {
    if (!pkg) return;
    if (!destinationId) {
      toast({ title: "Falta sucursal", description: "Selecciona la sucursal destino.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await createPackageTransfer({
        trackingNumber: pkg.trackingNumber,
        destinationId,
        shipmentId: pkg.isCharge ? null : (pkg.id as string),
        chargeShipmentId: pkg.isCharge ? (pkg.id as string) : null,
        source,
        reason: "Mal enrutamiento del paquetero",
      });
      toast({ title: "Traspaso realizado", description: `Guía ${pkg.trackingNumber} movida a ${destinationName || "la sucursal seleccionada"}.` });
      onSuccess(pkg, destinationId);
      onOpenChange(false);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "No se pudo realizar el traspaso. Intenta de nuevo.";
      toast({ title: "Error en el traspaso", description: String(msg), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const isDhl = pkg?.shipmentType === "dhl";
  const originName = pkg?.subsidiary?.name || "Sin sucursal";
  const recipientLine = [pkg?.recipientCity, pkg?.recipientZip ? `C.P. ${pkg.recipientZip}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isSaving}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            Traspasar paquete
          </DialogTitle>
          <DialogDescription>
            Corrige el enrutamiento del paquete moviéndolo a la sucursal a la que pertenece.
          </DialogDescription>
        </DialogHeader>

        {/* Datos del paquete */}
        {pkg && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {pkg.shipmentType && (
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                    isDhl ? "bg-[#ffcc00] text-[#d40511]" : "bg-[#4d148c] text-white"
                  )}
                >
                  {isDhl ? "DHL" : "FedEx"}
                </span>
              )}
              <span className="font-mono text-sm font-bold">{pkg.trackingNumber}</span>
              {pkg.isCharge && (
                <span className="rounded-md bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">Carga / F2</span>
              )}
              {pkg.isHighValue && (
                <span className="inline-flex items-center gap-1 rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
                  <GemIcon className="h-3 w-3" /> Alto valor
                </span>
              )}
              {pkg.payment && (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                  <BanknoteIcon className="h-3 w-3" /> {pkg.payment.type} ${pkg.payment.amount}
                </span>
              )}
            </div>
            {pkg.recipientName && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{pkg.recipientName}</span>
              </div>
            )}
            {recipientLine && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{recipientLine}</span>
              </div>
            )}
          </div>
        )}

        {/* Origen -> Destino */}
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0 rounded-lg border p-2.5">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Sale de</p>
            <p className="truncate text-sm font-medium">{originName}</p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Va hacia</p>
            <SucursalSelector
              value={destinationId}
              returnObject={true}
              onValueChange={(val) => {
                if (typeof val === "string") {
                  setDestinationId(val);
                  setDestinationName("");
                } else if (Array.isArray(val)) {
                  const first = val[0] as any;
                  setDestinationId(first?.id ?? "");
                  setDestinationName(first?.name ?? "");
                } else if (val && typeof val === "object") {
                  setDestinationId((val as any).id ?? "");
                  setDestinationName((val as any).name ?? "");
                }
              }}
            />
          </div>
        </div>

        {/* Advertencia */}
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed">
            El paquete se <strong>moverá de {originName} a {destinationName || "la sucursal destino"}</strong>. Esta acción
            cambia la sucursal del paquete y queda registrada en su historial. El estatus actual no cambia.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isSaving || !destinationId} className="gap-2">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
            Confirmar traspaso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
