import {
  Package,
  Truck,
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
  PencilLine,
  Filter
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Eye, Download } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { JSX } from "react"
import { DataTable } from "../data-table/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { IconTruckLoading } from "@tabler/icons-react"
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { axiosConfig } from "@/lib/axios-config";
import { useMemo, useState } from "react";
import { IncomeCorrection } from "@/lib/types";

interface ShipmentItem {
  trackingNumber: string | null
  date: string
  type: string
  shipmentType: string
  status?: string
  cost?: number
  secondAbord?: number
  countable?: boolean
  correction?: IncomeCorrection | null
}

interface ShipmentDetailDialogProps {
  row: any
  exportToExcel?: () => void
}

export function ShipmentDetailDialog({ row, exportToExcel }: ShipmentDetailDialogProps) {
  const allItems: ShipmentItem[] = row.original.items ?? []
  const [onlyCorrections, setOnlyCorrections] = useState(false)
  const correctionsCount = useMemo(() => allItems.filter((i) => i.correction).length, [allItems])
  const items = useMemo(
    () => (onlyCorrections ? allItems.filter((i) => i.correction) : allItems),
    [allItems, onlyCorrections],
  )

  const renderTypeBadge = (type: string) => (
    <Badge variant="outline" className="gap-1">
      <Package className="h-3 w-3" />
      {type}
    </Badge>
  )

  const renderShipmentTypeBadge = (shipmentType: string) => (
    <Badge variant="outline" className="gap-1">
      <Truck className="h-3 w-3" />
      {shipmentType}
    </Badge>
  )

  const renderStatusBadge = (status: string | undefined, type: string) => {
    if (type === "carga") {
      return (
        <Badge variant="outline" className="gap-1">
          <IconTruckLoading className="h-3 w-3 text-blue-600" />
          CARGA
        </Badge>
      )
    }

    const normalized = status?.toLowerCase() ?? ""
    const statusMap: Record<string, { label: string; icon: JSX.Element }> = {
      entregado: {
        label: "Entregado",
        icon: <CheckCircle className="h-3 w-3 text-green-600" />
      },
      // Traslados: el status llega como el tipo de traslado (tyco/aeropuerto/traslado_especial).
      tyco: {
        label: "Tyco",
        icon: <Truck className="h-3 w-3 text-indigo-600" />
      },
      aeropuerto: {
        label: "Aeropuerto",
        icon: <Truck className="h-3 w-3 text-purple-600" />
      },
      traslado_especial: {
        label: "Traslado especial",
        icon: <Truck className="h-3 w-3 text-slate-600" />
      },
      pendiente: {
        label: "Pendiente",
        icon: <Clock className="h-3 w-3 text-yellow-600" />
      },
      error: {
        label: "Error",
        icon: <AlertTriangle className="h-3 w-3 text-red-600" />
      },
      cancelado: {
        label: "Cancelado",
        icon: <XCircle className="h-3 w-3 text-gray-500" />
      }
    }

    const fallback = {
      label: status ?? "Desconocido",
      icon: <AlertTriangle className="h-3 w-3 text-muted-foreground" />
    }

    const badge = statusMap[normalized] ?? fallback

    return (
      <Badge variant="outline" className="gap-1">
        {badge.icon}
        {badge.label}
      </Badge>
    )
  }

  const handleExportExcel = async (row: any) => {
    if (!row) return;

    try {
      // 0. Cargar el HISTORIAL bajo demanda (getIncome no lo trae por performance),
      //    para que el Excel incluya fechas de entrega, días de retraso e historial.
      let enriched = items;
      try {
        const tns = items.map((i: any) => i.trackingNumber).filter(Boolean);
        if (tns.length > 0) {
          const { data } = await axiosConfig.post('/shipments/status-history', { trackingNumbers: tns });
          enriched = items.map((i: any) => ({
            ...i,
            statusHistory: (data?.[i.trackingNumber]?.length ? data[i.trackingNumber] : i.statusHistory) || [],
          }));
        }
      } catch (e) {
        console.warn('No se pudo cargar el historial para el Excel:', e);
      }

      // 1. Crear el libro de Excel con exceljs para más control
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Pacquetería & Mensajería Del Yaqui!';
      workbook.lastModifiedBy = 'Sistema de Reportes';
      
      // 2. Definir estilos consistentes con la marca
      const headerStyle: Partial<ExcelJS.Style> = {
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2A5CAA' } // Azul corporativo
        },
        font: {
          color: { argb: 'FFFFFFFF' }, // Blanco
          bold: true,
          size: 12
        },
        border: {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        },
        alignment: { vertical: 'middle', horizontal: 'center' }
      };

      const dataStyle: Partial<ExcelJS.Style> = {
        font: {
          size: 11,
          color: { argb: 'FF333333' } // Gris oscuro
        },
        border: {
          top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
        }
      };

      // 3. Hoja "Resumen"
      const resumenSheet = workbook.addWorksheet('Resumen');
      
      // Añadir logo (carga desde la ruta pública)
      try {
        const response = await fetch('/logo-no-fondo.png');
        if (response.ok) {
          const logoBuffer = await response.arrayBuffer();
          const imageId = workbook.addImage({
            buffer: logoBuffer,
            extension: 'png',
          });
          
          resumenSheet.addImage(imageId, "A1:C4");
        }
      } catch (error) {
        console.warn('No se pudo cargar el logo:', error);
      }

      // Preparar datos para la hoja "Resumen"
      const resumenData = enriched.map((item: any) => {
        const entregaEntry = item.statusHistory?.find(
          (entry: any) => entry.status === "entregado"
        );
        const fechaEntrega = entregaEntry?.timestamp;

        let diasRetraso = "";
        if (fechaEntrega && item.commitDateTime) {
          const diffTime = new Date(fechaEntrega).getTime() - new Date(item.commitDateTime).getTime();
          diasRetraso = Math.ceil(diffTime / (1000 * 60 * 60 * 24)).toString();
        }

        return {
          "No. Rastreo": item.trackingNumber || "-",
          "Destinatario": item.recipientName || "-",
          "Fecha Compromiso": item.commitDateTime
            ? format(new Date(item.commitDateTime), "dd/MM/yyyy hh:mm a", { locale: es })
            : "-",
          "Fecha de Entrega": fechaEntrega
            ? format(new Date(fechaEntrega), "dd/MM/yyyy hh:mm a", { locale: es })
            : "-",
          "Días de Retraso": diasRetraso,
          "Estado": item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1).replace("_", " ") : "Desconocido",
          "Costo": formatCurrency(Number(item.cost ?? 0)),
          "2º a bordo": Number(item.secondAbord ?? 0) > 0 ? formatCurrency(Number(item.secondAbord)) : "-",
          "Cuenta": item.countable === false ? "No" : "Sí",
          "Corrección": item.correction
            ? `${item.correction.kind === "editado" ? "Editado" : "Agregado"} en Consolidador${item.correction.by ? ` por ${item.correction.by}` : ""}${item.correction.reason ? `: ${item.correction.reason}` : ""}`
            : "-",
        };
      });

      // Añadir encabezados y datos a la hoja Resumen
      if (resumenData.length > 0) {
        const headers = Object.keys(resumenData[0]);
        const headerRow = resumenSheet.addRow(headers);
        headerRow.eachCell(cell => { cell.style = headerStyle; });

        resumenData.forEach(item => {
          const row = resumenSheet.addRow(Object.values(item));
          row.eachCell(cell => { cell.style = dataStyle; });
        });

        // Ajustar anchos de columna
        headers.forEach((header, idx) => {
          const maxLength = Math.max(
            header.length,
            ...resumenData.map(r => String(r[header as keyof typeof r]).length)
          );
          resumenSheet.getColumn(idx + 1).width = Math.min(Math.max(maxLength + 2, 10), 50);
        });
      }

      // 4. Hoja "Historial"
      if (enriched.some((item: any) => item.statusHistory?.length > 0)) {
        const historySheet = workbook.addWorksheet('Historial');

        const historyData: any[] = [];
        enriched.forEach((item: any) => {
          item.statusHistory?.forEach((entry: any) => {
            historyData.push({
              "No. Rastreo": item.trackingNumber || "-",
              "Estatus": entry.status.charAt(0).toUpperCase() + 
                        entry.status.slice(1).replace("_", " "),
              "Fecha": entry.timestamp
                ? format(new Date(entry.timestamp), "dd/MM/yyyy hh:mm a", { locale: es })
                : "-",
              "Notas": entry.notes || "-"
            });
          });
        });

        if (historyData.length > 0) {
          const headers = Object.keys(historyData[0]);
          const headerRow = historySheet.addRow(headers);
          headerRow.eachCell(cell => { cell.style = headerStyle; });

          historyData.forEach(item => {
            const row = historySheet.addRow(Object.values(item));
            row.eachCell(cell => { cell.style = dataStyle; });
          });

          // Ajustar anchos de columna
          headers.forEach((header, idx) => {
            const maxLength = Math.max(
              header.length,
              ...historyData.map(r => String(r[header as keyof typeof r]).length)
            );
            historySheet.getColumn(idx + 1).width = Math.min(Math.max(maxLength + 2, 10), 50);
          });
        }
      }

      // 5. Generar y descargar el archivo
      const fileName = `reporte_envios_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), fileName);

    } catch (error) {
      console.error('Error al generar el reporte Excel:', error);
      // Podrías agregar aquí una notificación al usuario
    }
  };

  const shipmentColumns: ColumnDef<ShipmentItem>[] = [
    {
      accessorKey: "trackingNumber",
      header: "Tracking",
      cell: ({ row }) => {
        const c = row.original.correction
        return (
          <div className="flex flex-col">
            <span className="text-muted-foreground">{row.getValue("trackingNumber") ?? "-"}</span>
            {c && (
              <span className="max-w-[260px] truncate text-[11px] text-muted-foreground" title={c.reason ?? undefined}>
                {[c.by, c.at ? format(new Date(c.at), "dd MMM HH:mm", { locale: es }) : null, c.reason ? `“${c.reason}”` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
          </div>
        )
      }
    },
    {
      accessorKey: "date",
      header: "Fecha",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {format(new Date(row.getValue("date")), "dd MMM yyyy", { locale: es })}
        </span>
      )
    },
    {
      accessorKey: "type",
      header: "Tipo",
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-1">
          {renderTypeBadge(row.getValue("type"))}
          {row.original.correction && (
            <Badge variant="outline" className="gap-1 border-violet-300 text-violet-700">
              <PencilLine className="h-3 w-3" />
              {row.original.correction.kind === "editado" ? "Corrección (editado)" : "Corrección"}
            </Badge>
          )}
        </div>
      )
    },
    {
      accessorKey: "shipmentType",
      header: "Paquetería",
      cell: ({ row }) => renderShipmentTypeBadge(row.getValue("shipmentType"))
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => {
        const type = row.getValue("type") as string
        const status = row.getValue("status") as string | undefined
        return (
          <div className="flex flex-wrap items-center gap-1">
            {renderStatusBadge(status, type)}
            {row.original.countable === false && (
              <Badge variant="outline" className="border-amber-300 text-amber-700" title="Se registró, pero la regla de cobro de la sucursal no lo cobra">
                No cuenta
              </Badge>
            )}
          </div>
        )
      }
    },
    {
      accessorKey: "cost",
      header: "Costo",
      cell: ({ row }) => {
        const cost = Number(row.original.cost ?? 0)
        const secondAbord = Number(row.original.secondAbord ?? 0)
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900 tabular-nums">{formatCurrency(cost)}</span>
            {secondAbord > 0 && (
              <span className="text-[11px] text-violet-600">incl. 2º a bordo {formatCurrency(secondAbord)}</span>
            )}
          </div>
        )
      }
    }
  ]

  return (
    <Dialog onOpenChange={(open) => !open && setOnlyCorrections(false)}>
      <div className="flex items-center gap-1">
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Ver detalles">
            <Eye className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DialogTrigger>
        {correctionsCount > 0 && (
          <DialogTrigger asChild>
            <button type="button" onClick={() => setOnlyCorrections(true)} aria-label="Ver correcciones del día">
              <Badge variant="outline" className="cursor-pointer gap-1 whitespace-nowrap border-violet-300 text-violet-700">
                <PencilLine className="h-3 w-3" />
                {correctionsCount} corr.
              </Badge>
            </button>
          </DialogTrigger>
        )}
      </div>
      {/* Encabezado fijo (con aire a la derecha para la X) y un solo scroll en el cuerpo:
          así los botones no quedan bajo la X y la tabla no se encoge por un scroll interno. */}
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-14">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>Detalle de Envíos ({items.length})</DialogTitle>
            <div className="flex items-center gap-2">
              {correctionsCount > 0 && (
                <Button
                  variant={onlyCorrections ? "secondary" : "outline"}
                  size="sm"
                  className="gap-2"
                  aria-pressed={onlyCorrections}
                  onClick={() => setOnlyCorrections((v) => !v)}
                >
                  <Filter className="h-4 w-4" />
                  Solo correcciones ({correctionsCount})
                </Button>
              )}
              <Button
                onClick={() => handleExportExcel(row)}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar Excel
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
          ) : (
            <DataTable
              columns={shipmentColumns}
              data={items}
              searchKey="trackingNumber"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}