import {
  Package,
  Truck,
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
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

interface ShipmentItem {
  trackingNumber: string | null
  date: string
  type: string
  shipmentType: string
  status?: string
}

interface ShipmentDetailDialogProps {
  row: any
  exportToExcel?: () => void
}

export function ShipmentDetailDialog({ row, exportToExcel }: ShipmentDetailDialogProps) {
  const items = row.original.items ?? []

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
      
      // 1. Crear el libro de Excel con exceljs para más control
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Pacquetería & Mensajería Del Yaqui!';
      workbook.lastModifiedBy = 'Sistema de Reportes';
      
      // 2. Definir estilos consistentes con la marca
      const headerStyle = {
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

      const dataStyle = {
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
          
          resumenSheet.addImage(imageId, {
            tl: { col: 0, row: 0 },
            br: { col: 3, row: 4 },
          });
        }
      } catch (error) {
        console.warn('No se pudo cargar el logo:', error);
      }

      // Preparar datos para la hoja "Resumen"
      const resumenData = items.map((item: any) => {
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
          "Estado": item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1).replace("_", " ") : "Desconocido"
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
      if (items.some((item: any) => item.statusHistory?.length > 0)) {
        const historySheet = workbook.addWorksheet('Historial');
        
        const historyData: any[] = [];
        items.forEach((item: any) => {
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
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.getValue("trackingNumber") ?? "-"}
        </span>
      )
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
      cell: ({ row }) => renderTypeBadge(row.getValue("type"))
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
        const type = row.getValue("type")
        const status = row.getValue("status")
        return renderStatusBadge(status, type)
      }
    }
  ]

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Ver detalles">
          <Eye className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Detalle de Envíos ({items.length})</DialogTitle>
            <Button 
              onClick={handleExportExcel} 
              variant="outline" 
              size="sm"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>
          </div>
        </DialogHeader>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
        ) : (
          <div className="max-h-[80vh] overflow-y-auto p-1">
            <DataTable
              columns={shipmentColumns}
              data={items}
              searchKey="trackingNumber"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}