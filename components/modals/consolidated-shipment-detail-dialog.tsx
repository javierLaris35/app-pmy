import { useState } from "react";
import { Eye, History } from "lucide-react";
import { DataTable } from "../data-table/data-table";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { es } from "date-fns/locale";
import { Shipment } from "@/lib/types";
import { Badge } from "../ui/badge";
import { StatusHistoryTimeline } from "./status-history-timeline";

interface Props {
  consolidated: {
    shipments: Shipment[];
  };
}

export function ConsolidatedDetailDialog({ consolidated }: Props) {
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [openStatusDialog, setOpenStatusDialog] = useState(false);

  const shipmentColumns: ColumnDef<Shipment>[] = [
    {
      accessorKey: "trackingNumber",
      header: "Tracking",
    },
    {
      accessorKey: "recipientName",
      header: "Destinatario",
    },
    {
      accessorKey: "commitDate",
      header: "Fecha Compromiso",
      cell: ({ row }) =>
        format(new Date(row.getValue("commitDate")), "dd MMM yyyy", { locale: es }),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const color =
          status === "entregado"
            ? "bg-green-600"
            : status === "no entregado"
            ? "bg-red-500"
            : "bg-yellow-400 text-black";
        return (
          <Badge variant="default" className={color}>
            {status.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      id: "historial",
      header: "Historial",
      cell: ({ row }) => {
        const shipment = row.original;
        return (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelectedShipment(shipment);
              setOpenStatusDialog(true);
            }}
          >
            <History className="h-4 w-4 mr-1" />
            Ver
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Ver detalles">
            <Eye className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Envíos de la Carga ({consolidated.shipments.length})
            </DialogTitle>
          </DialogHeader>
          {consolidated.shipments && consolidated.shipments.length > 0 ? (
            <div className="max-h-[80vh] overflow-y-auto p-1">
              <DataTable
                columns={shipmentColumns}
                data={consolidated.shipments}
                searchKey="trackingNumber"
              />
            </div>
          ) : (
            <p className="p-4 text-center">No hay envíos para esta carga.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Historial de Status */}
      {selectedShipment && (
        <Dialog open={openStatusDialog} onOpenChange={setOpenStatusDialog}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>
                Historial de Estatus - {selectedShipment.trackingNumber}
              </DialogTitle>
            </DialogHeader>

            <StatusHistoryTimeline history={selectedShipment.statusHistory ?? []} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
