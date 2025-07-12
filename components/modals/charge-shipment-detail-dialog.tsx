import { useState } from "react";
import { Eye, History } from "lucide-react";
import { DataTable } from "../data-table/data-table";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { format } from "date-fns";
import { ColumnDef, useReactTable } from "@tanstack/react-table";
import { es } from "date-fns/locale";
import { ChargeShipment } from "@/lib/types";
import { Badge } from "../ui/badge";
import * as XLSX from "xlsx";
import { StatusHistoryTimeline } from "./status-history-timeline";

interface Props {
  shipments: ChargeShipment[];
}

export function ChargeShipmentDetailDialog({ shipments }: Props) {
  const [table, setTable] = useState<ReturnType<typeof useReactTable> | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<ChargeShipment | null>(null);
  const [openStatusDialog, setOpenStatusDialog] = useState(false);

  const exportToExcel = () => {
    if (!table) return;

    const rows = table.getFilteredRowModel().rows;

    // Hoja 1: resumen
    const resumenData = rows.map((row) => {
      const s = row.original as ChargeShipment;
      return {
        "No. Rastreo": s.trackingNumber,
        "Destinatario": s.recipientName,
        "Fecha Compromiso": s.commitDateTime
          ? format(new Date(s.commitDateTime), "dd/MM/yyyy hh:mm a", { locale: es })
          : "",
        "Estado": s.status,
      };
    });

    const workbook = XLSX.utils.book_new();
    const resumenSheet = XLSX.utils.json_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(workbook, resumenSheet, "Resumen");

    // Hoja 2: historial (si existe en ChargeShipment)
    if (shipments.some(s => s.statusHistory?.length > 0)) {
      const historyData: {
        "No. Rastreo": string;
        "Estatus": string;
        "Fecha": string;
        "Notas": string;
        _rawDate: string;
      }[] = [];

      for (const row of rows) {
        const shipment = row.original as ChargeShipment;

        if (!shipment.statusHistory || shipment.statusHistory.length === 0) continue;

        shipment.statusHistory.forEach((entry) => {
          if (!entry.timestamp) return;

          historyData.push({
            "No. Rastreo": shipment.trackingNumber,
            "Estatus": entry.status.charAt(0).toUpperCase() + entry.status.slice(1).replace("_", " "),
            "Fecha": format(new Date(entry.timestamp), "dd/MM/yyyy hh:mm a", { locale: es }),
            "Notas": entry.notes ?? "",
            _rawDate: entry.timestamp,
          });
        });
      }

      if (historyData.length > 0) {
        const cleanedHistoryData = historyData.map(({ _rawDate, ...rest }) => rest);
        const historySheet = XLSX.utils.json_to_sheet(cleanedHistoryData);
        XLSX.utils.book_append_sheet(workbook, historySheet, "Historial");
      }
    }

    // Nombre del archivo
    const { columnFilters, globalFilter } = table.getState();
    const filterLabels: string[] = [];

    if (globalFilter) {
      filterLabels.push(`busqueda-${globalFilter}`);
    }

    for (const filter of columnFilters) {
      if (filter.value) {
        filterLabels.push(`${filter.id}-${filter.value}`);
      }
    }

    const sanitize = (text: string) =>
      text.replace(/[^a-z0-9-_]/gi, "_").toLowerCase();

    const filtersStr = filterLabels.length > 0
      ? `_${sanitize(filterLabels.join("_"))}`
      : "";

    const fileName = `reporte_envios_carga${filtersStr}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

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
      accessorKey: "commitDateTime",
      header: "Fecha Compromiso",
      cell: ({ row }) =>
        format(new Date(row.getValue("commitDateTime")), "dd/MM/yyyy hh:mm a", { locale: es }),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const capitalizeFirstLetter = (text: string) => 
          text.charAt(0).toUpperCase() + text.slice(1).replace("_", " ");
        
        const color =
          status === "entregado"
            ? "bg-green-50 text-green-700 ring-green-600/20"
            : status === "no_entregado"
            ? "bg-red-500"
            : status === "en_ruta" 
            ? "bg-purple-50 text-purple-700 ring-purple-700/10" 
            : "bg-yellow-400 text-black";
        
        return (
          <Badge variant="default" className={color}>
            {capitalizeFirstLetter(status)}
          </Badge>
        );
      },
    },
    // Ver si también mostrará el historial
    /*{
      id: "historial",
      header: "Historial",
      cell: ({ row }) => {
        const shipment = row.original;
        return shipment.statusHistory?.length > 0 ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelectedShipment(shipment);
              setOpenStatusDialog(true);// Implementar lógica de visualización de historial si es necesario
            }}
          >
            <History className="h-4 w-4 mr-1" />
            Ver
          </Button>
        ) : null;
      },
    },*/
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
            <DialogTitle>Envíos de la Carga ({shipments.length})</DialogTitle>
            </DialogHeader>

            {/* Botón de exportación */}
            <div className="flex justify-end pb-2">
            <Button onClick={exportToExcel} variant="default" size="sm">
                Exportar a Excel
            </Button>
            </div>

            {shipments && shipments.length > 0 ? (
            <div className="max-h-[80vh] overflow-y-auto p-1">
                <DataTable
                columns={shipmentColumns}
                data={shipments}
                onTableReady={setTable}
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