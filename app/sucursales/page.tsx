"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
import { Plus } from "lucide-react"
import { getSucursales, addSucursal, updateSucursal } from "@/lib/data"
import type { Subsidiary } from "@/lib/types"
import { AppLayout } from "@/components/app-layout"
import { DataTable } from "@/components/data-table/data-table"
import {
  createSelectColumn,
  createSortableColumn,
  createActionsColumn,
  createStatusColumn,
} from "@/components/data-table/columns"
import { Card, CardContent } from "@/components/ui/card"

export default function SucursalesPage() {
  const [sucursales, setSucursales] = useState<Subsidiary[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSucursal, setEditingSucursal] = useState<Subsidiary | null>(null)

  // Formulario
  const [nombre, setNombre] = useState("")
  const [direccion, setDireccion] = useState("")
  const [telefono, setTelefono] = useState("")
  const [activo, setActivo] = useState(true)

  useEffect(() => {
    loadSucursales()
  }, [])

  const loadSucursales = () => {
    const sucursalesData = getSucursales()
    setSucursales(sucursalesData)
  }

  const resetForm = () => {
    setEditingSucursal(null)
    setNombre("")
    setDireccion("")
    setTelefono("")
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
    setActivo(sucursal.active)
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingSucursal) {
      // Actualizar sucursal existente
      updateSucursal(editingSucursal.id, {
        nombre,
        direccion,
        telefono,
        activo,
      })
    } else {
      // Crear nueva sucursal
      addSucursal({
        nombre,
        direccion,
        telefono,
        activo,
      })
    }

    setIsDialogOpen(false)
    loadSucursales()
  }

  const columns = [
    createSelectColumn<Subsidiary>(),
    createSortableColumn<Subsidiary>("id", "ID", (row) => row.id),
    createSortableColumn<Subsidiary>(
      "nombre",
      "Nombre",
      (row) => row.name,
      (value) => <span className="font-medium">{value}</span>,
    ),
    createSortableColumn<Subsidiary>("direccion", "Dirección", (row) => row.address || "-"),
    createSortableColumn<Subsidiary>("telefono", "Teléfono", (row) => row.phone || "-"),
    createStatusColumn<Subsidiary>("activo", "Estado", (row) => (row.active ? "activo" : "inactivo"), {
      activo: { label: "Activo", variant: "success" },
      inactivo: { label: "Inactivo", variant: "destructive" },
    }),
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

        <Card>
          <CardContent className="p-6">
            <DataTable columns={columns} data={sucursales} filterPlaceholder="Filtrar sucursales..." />
          </CardContent>
        </Card>
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
                <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input id="direccion" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="activo" checked={activo} onCheckedChange={setActivo} />
                <Label htmlFor="activo">Activo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">{editingSucursal ? "Actualizar" : "Guardar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
