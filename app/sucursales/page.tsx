"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import {
  MapPin,
  Pencil,
  Phone,
  Plus,
  Smartphone,
  Trash2,
  User,
} from "lucide-react"
import { updateSucursal } from "@/lib/data"
import type { Subsidiary } from "@/lib/types"
import { AppLayout } from "@/components/app-layout"
import { DataTable } from "@/components/data-table/data-table"
import {
  createSelectColumn,
  createSortableColumn,
  createActionsColumn,
  createSwitchColumn
} from "@/components/data-table/columns"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useIsMobile } from "@/hooks/use-mobile"
import { useSaveSubsidiary, useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries"

export default function SucursalesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSucursal, setEditingSucursal] = useState<Subsidiary | null>(null)
  const { subsidiaries, isLoading, isError, mutate } = useSubsidiaries()
  const { save, isSaving, isError: isSaveError } = useSaveSubsidiary();

  const [nombre, setNombre] = useState("")
  const [direccion, setDireccion] = useState("")
  const [telefono, setTelefono] = useState("")
  const [encargado, setEncargado] = useState("")
  const [encargadoTelefono, setEncargadoTelefono] = useState("")
  const [activo, setActivo] = useState(true)


  const isMobile = useIsMobile()

  const resetForm = () => {
    setEditingSucursal(null)
    setNombre("")
    setDireccion("")
    setTelefono("")
    setEncargado("")
    setEncargadoTelefono("")
    setActivo(true)
  }

  const openNewSucursalDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditSucursalDialog = (sucursal: Subsidiary) => {
    setEditingSucursal(sucursal)
    setNombre(sucursal.name)
    setDireccion(sucursal.address || "")
    setTelefono(sucursal.phone || "")
    setEncargado(sucursal.officeManager || "")
    setEncargadoTelefono(sucursal.managerPhone || "")
    setActivo(sucursal.active)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingSucursal) {
      save({
        id: editingSucursal.id,
        name: nombre,
        address: direccion,
        phone: telefono,
        officeManager: encargado,
        managerPhone: encargadoTelefono,
        active: activo
      });
    } else {
      save({
        name: nombre,
        address: direccion,
        phone: telefono,
        officeManager: encargado,
        managerPhone: encargadoTelefono,
        active: activo
      });
    }

    setIsDialogOpen(false)
    mutate
  }

  const handleToggleActive = async (subsidiary: Subsidiary, checked: boolean) => {
    try {
      await save({ ...subsidiary, active: checked });
      mutate();
    } catch (error) {
      console.error("Error al cambiar estado:", error);
    }
  };

  const columns = [
    createSelectColumn<Subsidiary>(),
    createSortableColumn<Subsidiary>(
      "nombre",
      "Nombre",
      (row) => row.name,
      (value) => <span className="font-medium">{value}</span>,
    ),
    createSortableColumn<Subsidiary>("direccion", "Dirección", (row) => row.address || "-"),
    createSortableColumn<Subsidiary>("telefono", "Teléfono", (row) => row.phone || "-"),
    createSortableColumn<Subsidiary>("encargado", "Encargado", (row) => row.officeManager || "-"),
    createSwitchColumn<Subsidiary>(
      "active",
      "Estado",
      (row) => row.active,
      (value, row) => (
        <Switch
          id={`switch-${row.id}`}
          checked={value}
          onCheckedChange={(checked) => handleToggleActive(row, checked)}
        />
      )
    ),
    createActionsColumn<Subsidiary>([
      {
        label: "Editar",
        onClick: (data) => openEditSucursalDialog(data),
      },
      {
        label: "Eliminar",
        onClick: (data) => console.log("Eliminar", data),
      },
    ]),
  ]

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Catálogo de Sucursales</h2>
            <p className="text-muted-foreground">Administra las sucursales de la empresa</p>
          </div>
          <Button onClick={openNewSucursalDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Sucursal
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Cargando sucursales...</p>
        ) : isError ? (
          <p className="text-red-500">Error al cargar las sucursales.</p>
        ) : isMobile ? (
          <div className="grid gap-4">
            {subsidiaries.map((sucursal: Subsidiary) => (
              <Card key={sucursal.id} className="border shadow-sm rounded-xl">
                <CardHeader className="pb-2 flex flex-row items-start justify-between">
                  <CardTitle className="text-base">{sucursal.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={sucursal.active}
                      onCheckedChange={(value) =>
                        updateSucursal(sucursal.id, {
                          nombre: sucursal.name,
                          direccion: sucursal.address || "",
                          telefono: sucursal.phone || "",
                          activo: value,
                        }).then(() => mutate())
                      }
                      id={`switch-${sucursal.id}`}
                    />
                    <label htmlFor={`switch-${sucursal.id}`} className="text-sm text-muted-foreground">
                      {sucursal.active ? "Activo" : "Inactivo"}
                    </label>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-foreground" />
                      <p>
                        <span className="font-medium text-foreground">Dirección:</span>{" "}
                        {sucursal.address || "-"}
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Phone className="w-4 h-4 mt-0.5 text-foreground" />
                      <p>
                        <span className="font-medium text-foreground">Teléfono:</span>{" "}
                        {sucursal.phone || "-"}
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 mt-0.5 text-foreground" />
                      <p>
                        <span className="font-medium text-foreground">Encargado:</span>{" "}
                        {sucursal.officeManager || "-"}
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Smartphone className="w-4 h-4 mt-0.5 text-foreground" />
                      <p>
                        <span className="font-medium text-foreground">Tel. encargado:</span>{" "}
                        {sucursal.managerPhone || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditSucursalDialog(sucursal)}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => console.log("Eliminar", sucursal)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-6">
              <DataTable
                columns={columns}
                data={subsidiaries}
                filterPlaceholder="Filtrar sucursales..."
              />
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSucursal ? "Editar Sucursal" : "Nueva Sucursal"}</DialogTitle>
            <DialogDescription>Ingresa los datos de la sucursal</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="encargado">Encargado</Label>
                <Input
                  id="encargado"
                  value={encargado}
                  onChange={(e) => setEncargado(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="encargado_telefono">Teléfono Encargado</Label>
                <Input
                  id="encargado_telefono"
                  value={encargadoTelefono}
                  onChange={(e) => setEncargadoTelefono(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="activo" checked={activo} onCheckedChange={setActivo} />
                <Label htmlFor="activo">Activo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">
                {editingSucursal ? "Actualizar" : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
