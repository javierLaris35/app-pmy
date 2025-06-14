"use client"

import { useEffect, useState } from "react"
import { AppLayout } from "@/components/app-layout"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2, Mail, Pencil, Phone, Shield, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useUsers } from "@/hooks/services/users/use-users"
import { DataTable } from "@/components/data-table/data-table"
import type { User } from "@/lib/types"
import { useIsMobile } from "@/hooks/use-mobile"
import { columns } from "./columns"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Switch } from "@radix-ui/react-switch"

export default function UsuariosPage() {
  const { users, isLoading, isError, mutate } = useUsers()
  const { toast } = useToast()
  const isMobile = useIsMobile()

  console.log("users", users, "loading", isLoading, "error", isError)


  const [form, setForm] = useState({ name: "", lastName: "", email: "" })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      // await api.post("/api/users", form)
      console.log("Nuevo usuario:", form)
      toast({ title: "Usuario creado correctamente" })
      setForm({ name: "", lastName: "", email: "" })
      mutate()
    } catch (error) {
      toast({ title: "Error", description: "No se pudo crear el usuario", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const onToggleActive = (id: string, value: any) => {

  }

  const onDelete = (user: User) => {

  }

  const onEdit = (user: User) => {

  }

    return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Gestión de Usuarios</h2>
            <p className="text-muted-foreground">Administra los usuarios del sistema</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Nuevo Usuario</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar nuevo usuario</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nombre</Label>
                  <Input id="name" name="name" value={form.name} onChange={handleInputChange} required />
                </div>
                <div>
                  <Label htmlFor="lastName">Apellido</Label>
                  <Input id="lastName" name="lastName" value={form.lastName} onChange={handleInputChange} required />
                </div>
                <div>
                  <Label htmlFor="email">Correo</Label>
                  <Input id="email" type="email" name="email" value={form.email} onChange={handleInputChange} required />
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear Usuario
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Vista según tamaño de pantalla */}
        { isLoading ? (
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
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={user.active}
                          onCheckedChange={(value) => onToggleActive(user?.id, value)}
                          id={`switch-${user.id}`}
                        />
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-start gap-2">
                          <Mail className="w-4 h-4 mt-0.5 text-foreground" />
                          <p>
                            <span className="font-medium text-foreground">Correo:</span>{" "}
                            {user.email}
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <Shield className="w-4 h-4 mt-0.5 text-foreground" />
                          <p>
                            <span className="font-medium text-foreground">Rol:</span>{" "}
                            {user.role || "Sin rol"}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button size="sm" variant="outline" onClick={() => onEdit(user)}>
                          <Pencil className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => onDelete(user)}>
                          <Trash2 className="w-4 h-4 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              // Tabla
              <DataTable columns={columns} data={users} />
            )
          ) : (
            <p className="text-muted-foreground">No hay usuarios registrados</p>
          )}

      </div>
    </AppLayout>
  )
}
