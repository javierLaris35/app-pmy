import { ShortShipment } from "@/lib/types";
import { ColumnDef, useReactTable } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import * as XLSX from "xlsx";

interface NotFoundShipmentDetailsProps {
  shipments: ShortShipment[];
  trigger?: React.ReactNode; // 👈 opcional, para que un botón externo pueda abrir el dialog
}

export function NotFoundShipmentDetails({ shipments, trigger }: NotFoundShipmentDetailsProps) {
  const [table, setTable] = useState<ReturnType<typeof useReactTable> | null>(null);

  const notFoundShipmentColumns: ColumnDef<ShortShipment>[] = [
    {
      accessorKey: "trackingNumber",
      header: "Tracking",
    },
    {
      accessorKey: "recipientName",
      header: "Destinatario",
    },
    {
      accessorKey: "recipientAddress",
      header: "Dirección",
    },
    {
      accessorKey: "recipientZip",
      header: "CP",
    },
    {
      accessorKey: "recipientPhone",
      header: "Teléfono",
    },
  ];

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(shipments);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "NotFoundShipments");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    const fileName = `report_paquetes_no_encontrados.xlsx`
    
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" aria-label="Ver detalles">
            <Eye className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Paquetes faltantes ({shipments.length})</DialogTitle>
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
              columns={notFoundShipmentColumns}
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
  );
}
