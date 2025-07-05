import { Eye } from "lucide-react";
import { DataTable } from "../data-table/data-table";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { format } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import { es } from "date-fns/locale";
import { ChargeShipment } from "@/lib/types";
import { Badge } from "../ui/badge";

// Columnas para shipments dentro del modal
const shipmentColumns: ColumnDef<ChargeShipment>[] = [
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
        cell: ({ row }) => format(new Date(row.getValue("commitDate")), "dd MMM yyyy", { locale: es }),
    },
    {
        accessorKey: "status",
        header: "Estado",
        cell: ({ row }) => {
            const status = row.getValue("status") as string;
            const color =
            status === "entregado"
                ? "bg-green-600"
                : status === "no_entregado"
                ? "bg-red-500"
                : "bg-yellow-400 text-black";
            return <Badge variant="default" className={color}>{status.toUpperCase()}</Badge>;
        },
    },
];

interface Props {
    shipments: ChargeShipment[]
}

export function ChargeShipmentDetailDialog ({ shipments }: Props) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Ver detalles">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Envíos de la Carga ({shipments.length})</DialogTitle>
                </DialogHeader>
                {shipments && shipments.length > 0 ? (
                    <div className="max-h-[80vh] overflow-y-auto p-1">
                        <DataTable columns={shipmentColumns} data={shipments} searchKey="trackingNumber" />
                    </div>
                    ) : (
                        <p className="p-4 text-center">No hay envíos para esta carga.</p>
                    )}
            </DialogContent>
        </Dialog>
    )
}