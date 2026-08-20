"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Transfer } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = {
  TYCO: "Tyco",
  AEROPUERTO: "Aeropuerto",
  AIRPORT: "Aeropuerto",
  OTRO: "Otro",
  OTHER: "Otro",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En progreso",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b border-border/60 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="col-span-2 text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export function TransferDetailDialog({ transfer }: { transfer: Transfer }) {
  const [isOpen, setIsOpen] = useState(false);

  const typeLabel =
    transfer.transferType === "OTRO"
      ? transfer.otherTransferType || "Otro"
      : TYPE_LABEL[transfer.transferType] || transfer.transferType;

  const destination = transfer.destination?.name || transfer.otherDestination || "—";
  const statusKey = String(transfer.status || "");
  const drivers = (transfer.drivers ?? []).map((d) => d.name).filter(Boolean);
  // El cobro real vive en totalAmount; `amount` es el base (0 en traslados viejos).
  const montoValue = Number(transfer.totalAmount ?? transfer.amount ?? 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Ver detalles">
          <Eye className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Detalle del traslado</DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          <Row
            label="Fecha"
            value={
              transfer.createdAt
                ? format(new Date(transfer.createdAt), "dd/MM/yyyy HH:mm", { locale: es })
                : "—"
            }
          />
          <Row label="Origen" value={transfer.origin?.name || "—"} />
          <Row label="Destino" value={destination} />
          <Row label="Tipo" value={typeLabel} />
          <Row
            label="Monto"
            value={`$${montoValue.toLocaleString("es-MX", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
          />
          <Row
            label="Estado"
            value={
              <Badge variant="outline" className={STATUS_CLASS[statusKey] || ""}>
                {STATUS_LABEL[statusKey] || statusKey || "—"}
              </Badge>
            }
          />
          <Row
            label="Vehículo"
            value={
              transfer.vehicle
                ? `${transfer.vehicle.name}${
                    transfer.vehicle.plateNumber ? ` (${transfer.vehicle.plateNumber})` : ""
                  }`
                : "—"
            }
          />
          <Row label="Conductores" value={drivers.length > 0 ? drivers.join(", ") : "—"} />
          <Row
            label="Creado por"
            value={transfer.createdBy?.name || transfer.createdBy?.email || "—"}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
