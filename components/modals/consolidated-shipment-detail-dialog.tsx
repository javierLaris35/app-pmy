"use client"

import { useState, useEffect } from "react";
import { Eye, History, Download } from "lucide-react";
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
import { ColumnDef, useReactTable } from "@tanstack/react-table";
import { es } from "date-fns/locale";
import { Shipment, Consolidated } from "@/lib/types";
import { Badge } from "../ui/badge";
import { StatusHistoryTimeline } from "./status-history-timeline";
import * as XLSX from "xlsx"
import { getShipmentsByConsolidatedId } from "@/lib/services/consolidated";
import { Loader, LoaderWithOverlay } from "../loader";
import { ShipmentHistoryModal } from "../operaciones/envios/shipment-history-modal";

interface Props {
  consolidated: Consolidated;
  date: string
}

export function ConsolidatedDetailDialog({ consolidated, date }: Props) {
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [openStatusDialog, setOpenStatusDialog] = useState(false);
  const [table, setTable] = useState<ReturnType<typeof useReactTable> | null>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Cargar shipments cuando se abre el diálogo
  const loadShipments = async () => {
    if (!isOpen) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const shipmentsData = await getShipmentsByConsolidatedId(consolidated.id);
      setShipments(shipmentsData);
    } catch (err) {
      console.error("Error loading shipments:", err);
      setError("Error al cargar los shipments");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadShipments();
    } else {
      // Limpiar datos cuando se cierra el diálogo
      setShipments([]);
      setError(null);
    }
  }, [isOpen, consolidated.id]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
  };

  const exportToExcel = () => {
    if (!table) return;

    const rows = table.getFilteredRowModel().rows;

    // Hoja 1: Resumen con columnas nuevas
    const resumenData = rows.map((row) => {
      const s = row.original as Shipment;

      // Buscar la fecha de entrega en el historial (si existe)
      const entregaEntry = s.statusHistory?.find(
        (entry) => entry.status === "entregado"
      );
      const fechaEntrega = entregaEntry?.timestamp;

      // Calcular días de retraso (si hay fecha de entrega y fecha compromiso)
      let diasRetraso = "";
      if (fechaEntrega && s.commitDateTime) {
        const fechaCompromiso = new Date(s.commitDateTime);
        const fechaEntregaDate = new Date(fechaEntrega);
        const diffTime = fechaEntregaDate.getTime() - fechaCompromiso.getTime();
        diasRetraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24)).toString();
      }

      return {
        "No. Rastreo": s.trackingNumber,
        "Destinatario": s.recipientName,
        "Fecha Compromiso": s.commitDateTime
          ? format(new Date(s.commitDateTime), "dd/MM/yyyy hh:mm a", { locale: es })
          : "",
        "Fecha de Entrega": fechaEntrega
          ? format(new Date(fechaEntrega), "dd/MM/yyyy hh:mm a", { locale: es })
          : "",
        "Días de Retraso": diasRetraso,
        "Estado": s.status,
        "Días en Ruta": s.status === "en_ruta" ? s.daysInRoute ?? 0 : "",
      };
    });

    const workbook = XLSX.utils.book_new();
    const resumenSheet = XLSX.utils.json_to_sheet(resumenData);
    XLSX.utils.book_append_sheet(workbook, resumenSheet, "Resumen");

    // Hoja 2: Historial
    const historyData: {
      "No. Rastreo": string;
      "Estatus": string;
      "Fecha": string;
      "Notas": string;
      _rawDate: string;
    }[] = [];

    for (const row of rows) {
      const shipment = row.original as Shipment;

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

    const cleanedHistoryData = historyData.map(({ _rawDate, ...rest }) => rest);
    const historySheet = XLSX.utils.json_to_sheet(cleanedHistoryData);
    XLSX.utils.book_append_sheet(workbook, historySheet, "Historial");

    // Generar nombre del archivo
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

    const consolidatedDateStr = date
      ? format(new Date(date), "yyyy-MM-dd")
      : "sin_fecha";

    const fileName = `reporte_envios_en_consolidado_${consolidatedDateStr}${filtersStr}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  };

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
      accessorKey: "commitDateTime",
      header: "Fecha Compromiso",
      cell: ({ row }) => {
        const dateValue = row.getValue("commitDateTime") as string;
        return dateValue 
          ? format(new Date(dateValue), "dd/MM/yyyy hh:mm a", { locale: es })
          : "-";
      },
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const capitalizeFirstLetter = (text: string) => text.charAt(0).toUpperCase() + text.slice(1).replace("_", " ");
        const color =
          status === "entregado"
            ? "bg-green-50 text-green-700 ring-green-600/20"
          : status === "no_entregado"
            ? "bg-red-500"
          : status === "en_ruta" ? "bg-purple-50 text-purple-700 ring-purple-700/10" 
            : "bg-yellow-400 text-black";
        return (
          <Badge variant="default" className={color}>
            {capitalizeFirstLetter(status)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "daysInRoute",
      header: "Días en Ruta",
      cell: ({ row }) => {
        const status = row.original.status;
        const days: number = row.getValue("daysInRoute");

        if (status !== "en_ruta") return "-";

        let colorClass = "bg-gray-100 text-gray-800";
        if (days >= 7) colorClass = "bg-red-100 text-red-700";        // Crítico
        else if (days >= 4) colorClass = "bg-yellow-100 text-yellow-700"; // Advertencia
        else colorClass = "bg-green-100 text-green-700";              // Bien

        return (
          <Badge variant="default" className={colorClass}>
            {days} día{days === 1 ? "" : "s"}
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
          <ShipmentHistoryModal
            shipmentId={shipment.id} // Asegúrate de que el shipment tenga id
            trackingNumber={shipment.trackingNumber}
            trigger={
              <Button size="sm" variant="ghost">
                <History className="h-4 w-4 mr-1" />
                Ver
              </Button>
            }
          />
        );
      },
    },
  ];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Ver detalles">
            <Eye className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="flex-shrink-0 px-6 py-4 border-b bg-background">
            <DialogTitle className="text-lg font-semibold">
              Envíos del Consolidado - {consolidated.consNumber}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Fecha: {date ? format(new Date(date), "dd/MM/yyyy", { locale: es }) : "Sin fecha"}
            </p>
          </DialogHeader>

          {/* Estado de carga y error */}
          {isLoading && (
            <div className="flex-1 flex items-center justify-center p-8">
              <LoaderWithOverlay overlay text="Cargando shipments..." />
            </div>
          )}

          {error && (
            <div className="flex-1 flex items-center justify-center p-8 text-red-500">
              <div className="text-center">
                <p className="font-medium">{error}</p>
                <Button 
                  variant="outline" 
                  className="mt-2"
                  onClick={loadShipments}
                >
                  Reintentar
                </Button>
              </div>
            </div>
          )}

          {!isLoading && !error && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Botón de exportación */}
              <div className="flex justify-between items-center px-6 py-3 border-b bg-muted/30 flex-shrink-0">
                <div className="text-sm text-muted-foreground">
                  Total: {shipments.length} paquetes
                </div>
                <Button 
                  onClick={exportToExcel} 
                  variant="default" 
                  size="sm"
                  disabled={shipments.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar a Excel
                </Button>
              </div>

              {shipments.length > 0 ? (
                <div className="flex-1 min-h-0 overflow-auto">
                  <div className="p-6 pt-4">
                    <DataTable
                      columns={shipmentColumns}
                      data={shipments}
                      onTableReady={setTable}
                      searchKey="trackingNumber"
                      filters={[
                        {
                          columnId: "status",
                          title: "Estado",
                          options: [
                            { label: "Entregado", value: "entregado" },
                            { label: "No Entregado", value: "no_entregado" },
                            { label: "En Ruta", value: "en_ruta" },
                          ],
                        },
                      ]}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      No hay shipments para este consolidado.
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={loadShipments}
                    >
                      Reintentar carga
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Historial de Status */}
      {selectedShipment && (
        <Dialog open={openStatusDialog} onOpenChange={setOpenStatusDialog}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historial de Estatus - {selectedShipment.trackingNumber}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-auto">
              <StatusHistoryTimeline history={selectedShipment.statusHistory ?? []} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}