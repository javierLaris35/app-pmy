export const columns: ColumnDef<Transfer>[] = [
  {
    accessorKey: "createdAt",
    header: "Fecha",
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"))
      return date.toLocaleDateString()
    }
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
      const tipo = row.getValue("transferType") as string
      // Puedes mapear el tipo de inglés a español aquí visualmente si lo deseas
      const displayType = tipo === 'OTHER' ? 'Otro' : tipo === 'AIRPORT' ? 'Aeropuerto' : tipo;
      
      return (
        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-medium border border-slate-200">
          {displayType}
        </span>
      )
    },
  },
]