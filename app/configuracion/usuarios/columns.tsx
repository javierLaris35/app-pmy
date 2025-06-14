import { ColumnDef } from "@tanstack/react-table"
import { User } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Nombre",
  },
  {
    accessorKey: "lastName",
    header: "Apellido",
  },
  {
    accessorKey: "email",
    header: "Correo",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original
      return (
        <Button variant="ghost" size="sm" onClick={() => console.log("Editar", user)}>
          <Pencil className="w-4 h-4 mr-2" />
          Editar
        </Button>
      )
    },
  },
]
