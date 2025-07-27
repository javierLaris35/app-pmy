"use client"

import { useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Loader2, Mail, Pencil, Shield, Trash2, Plus, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useUsers } from "@/hooks/services/users/use-users"
import { DataTable } from "@/components/data-table/data-table"
import type { User } from "@/lib/types"
import { useIsMobile } from "@/hooks/use-mobile"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Switch } from "@radix-ui/react-switch"
import { UserDialog, UserFormData } from "@/components/modals/user-dialog-modal"
import { deleteUser, register, updateUser } from "@/lib/services/users"
import { ColumnDef } from "@tanstack/react-table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"

export default function UsuariosPage() {
  const { users, isLoading, isError, mutate } = useUsers()
  const { toast } = useToast()
  const isMobile = useIsMobile()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  const handleUserSubmit = async (data: UserFormData) => {
    try {
      if (data.id) {
        await updateUser(data)
        toast({ title: "Usuario actualizado correctamente" })
      } else {
        console.log("🚀 ~ handleUserSubmit ~ data:", data)
        await register(data)
        toast({ title: "Usuario creado correctamente" })
      }
      mutate()
    } catch (err) {
      toast({ title: "Error", description: "No se pudo guardar el usuario", variant: "destructive" })
    }
    setDialogOpen(false)
  }

  const onToggleActive = async (id: string, value: boolean) => {
    try {
      const user = users.find(user => user.id === id) as UserFormData
      if (!user) return

      user.active = value
      await updateUser(user)
      mutate()
    } catch (err) {
      toast({ title: "Error al cambiar estado del usuario", variant: "destructive" })
    }
  }

  const onDelete = (user: User) => {
    setUserToDelete(user)
  }

  const confirmDelete = async () => {
    if (!userToDelete) return
    try {
      await deleteUser(userToDelete.id)
      mutate()
      toast({ title: "Usuario eliminado correctamente" })
    } catch (err) {
      toast({ title: "Error", description: "No se pudo eliminar el usuario", variant: "destructive" })
    }
    setUserToDelete(null)
  }

  const onEdit = (user: User) => {
    setEditingUser(user)
    setDialogOpen(true)
  }

  const tableColumns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: "Nombre",
      cell: ({ row }) => `${row.original.name} ${row.original.lastName || ""}`,
    },
    {
      accessorKey: "email",
      header: "Correo",
    },
    {
      accessorKey: "role",
      header: "Rol",
    },
    {
      accessorKey: "active",
      header: "Activo",
      cell: ({ row }) => (
        <Switch
          checked={row.original.active}
          onCheckedChange={(value) => onToggleActive(row.original.id, value)}
        />
      ),
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => onEdit(row.original)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="destructive" onClick={() => onDelete(row.original)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Gestión de Usuarios</h2>
            <p className="text-muted-foreground">Administra los usuarios del sistema</p>
          </div>
          <Button onClick={() => {
            setEditingUser(null)
            setDialogOpen(true)
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Usuario
          </Button>
        </div>

        <UserDialog
          open={dialogOpen}
          user={editingUser}
          onSubmit={handleUserSubmit}
          onClose={() => setDialogOpen(false)}
        />

        {/* 🧨 Modal de confirmación de eliminación */}
        {userToDelete && (
          <Dialog open={true} onOpenChange={() => setUserToDelete(null)}>
            <DialogContent>
              <DialogHeader className="flex items-center gap-2">
                <AlertTriangle className="text-red-500 w-5 h-5" />
                <DialogTitle>Confirmar eliminación</DialogTitle>
              </DialogHeader>
              <DialogDescription>
                ¿Estás seguro que deseas eliminar a <strong>{userToDelete.name} {userToDelete.lastName}</strong>?
                Esta acción no se puede deshacer.
              </DialogDescription>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setUserToDelete(null)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={confirmDelete}>
                  Eliminar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {isLoading ? (
          <Loader2 className="mx-auto animate-spin" />
        ) : isError ? (
          <p className="text-red-500">Error al cargar usuarios</p>
        ) : users && users.length > 0 ? (
          isMobile ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {users.map((user) => (
                <Card key={user.id} className="border shadow-sm rounded-xl">
                  <CardHeader className="pb-2 flex flex-row items-start justify-between">
                    <CardTitle className="text-base">{user.name + " " + user.lastName}</CardTitle>
                    <Switch
                      checked={user.active}
                      onCheckedChange={(value) => onToggleActive(user.id, value)}
                      id={`switch-${user.id}`}
                    />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <Mail className="w-4 h-4 mt-0.5 text-foreground" />
                        <p><span className="font-medium text-foreground">Correo:</span> {user.email}</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Shield className="w-4 h-4 mt-0.5 text-foreground" />
                        <p><span className="font-medium text-foreground">Rol:</span> {user.role}</p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button size="icon" variant="outline" onClick={() => onEdit(user)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="destructive" onClick={() => onDelete(user)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <DataTable columns={tableColumns} data={users} />
          )
        ) : (
          <p className="text-muted-foreground">No hay usuarios registrados</p>
        )}
      </div>
    </AppLayout>
  )
}
