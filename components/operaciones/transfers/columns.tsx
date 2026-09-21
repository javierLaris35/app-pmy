import type { ColumnDef } from "@tanstack/react-table"
import type { Transfer } from "@/lib/types"
import { TransferDetailDialog } from "./transfer-detail-dialog"
import { formatDateToShortDate, formatFloatingDayToShortDate } from "@/utils/date.utils"

// Etiquetas legibles para los valores reales del catálogo (minúscula).
const TYPE_LABEL: Record<string, string> = {
  tyco: "Tyco",
  aeropuerto: "Aeropuerto",
  sucursal: "Sucursal",
  otro: "Otro",
}

export const columns: ColumnDef<Transfer>[] = [
  {
    id: "transferDate",
    header: "Fecha",
    // Fecha en que se REALIZÓ el traslado (transferDate). Los registros viejos que no
    // la tengan caen a createdAt como respaldo para no mostrar vacío.
    accessorFn: (row) => row.transferDate ?? row.createdAt,
    cell: ({ row }) => {
      const t = row.original
      // transferDate es un "día flotante" (medianoche UTC): se muestra por su día calendario
      // tal cual. NO se convierte a Hermosillo porque un 00:00Z convertido a UTC-7 caería en
      // el día ANTERIOR (bug previo con toLocaleDateString, que además usaba la zona del navegador).
      if (t.transferDate) return formatFloatingDayToShortDate(t.transferDate)
      // Registros viejos sin transferDate: createdAt es un instante real → su día en Hermosillo.
      if (t.createdAt) return formatDateToShortDate(t.createdAt)
      return "—"
    },
  },
  {
    accessorKey: "originId", // Aunque el key sea originId, usaremos row.original
    header: "Origen",
    cell: ({ row }) => {
      const transfer = row.original;
      // Mostramos el nombre de la sucursal de origen
      return (
        <span className="font-medium text-slate-700">
          {transfer.origin?.name || "Sucursal desconocida"}
        </span>
      );
    },
  },
  {
    accessorKey: "destinationId",
    header: "Destino",
    cell: ({ row }) => {
        const transfer = row.original; // Accedemos a todo el objeto del traslado
        
        // 1. Si hay una sucursal destino vinculada, mostramos su nombre
        // 2. Si no hay sucursal, mostramos el destino externo (string)
        // 3. Si no hay ninguno, un guion como fallback
        const destinationName = transfer.destination?.name || transfer.otherDestination || "-";
        
        return (
        <span className="font-medium text-slate-700">
            {destinationName}
        </span>
        );
    },
    },
  {
    accessorKey: "transferType",
    header: "Tipo",
    cell: ({ row }) => {
      const transfer = row.original
      // Para "otro" mostramos la descripción capturada; el resto usa su etiqueta legible.
      const displayType =
        transfer.transferType === "otro"
          ? transfer.otherTransferType || "Otro"
          : TYPE_LABEL[transfer.transferType] || transfer.transferType

      return (
        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium border border-slate-200">
          {displayType}
        </span>
      )
    },
  },
  {
    id: "monto",
    header: "Monto",
    // El cobro real vive en totalAmount; `amount` es el base (0 en traslados viejos).
    accessorFn: (row) => Number(row.totalAmount ?? row.amount ?? 0),
    cell: ({ row }) => {
      const monto = Number(row.original.totalAmount ?? row.original.amount ?? 0)
      return (
        <span className="font-medium text-slate-700 tabular-nums">
          {`$${monto.toLocaleString("es-MX", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
        </span>
      )
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex justify-end">
        <TransferDetailDialog transfer={row.original} />
      </div>
    ),
  },
]