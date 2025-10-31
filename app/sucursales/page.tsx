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
  DialogClose,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import {
  MapPin,
  Pencil,
  Phone,
  Plus,
  Smartphone,
  Trash2,
  User,
  Mail,
  Copy,
  AlertTriangle,
} from "lucide-react"
import type { Subsidiary } from "@/lib/types"
import { AppLayout } from "@/components/app-layout"
import { DataTable } from "@/components/data-table/data-table"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useIsMobile } from "@/hooks/use-mobile"
import { useSaveSubsidiary, useSubsidiaries, useDeleteSubsidiary } from "@/hooks/services/subsidiaries/use-subsidiaries"
import { withAuth } from "@/hoc/withAuth"
import { toast } from "sonner"
import { getColumns } from "./columns"

function SucursalesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingSucursal, setEditingSucursal] = useState<Subsidiary | null>(null)
  const [sucursalToDelete, setSucursalToDelete] = useState<Subsidiary | null>(null)
  
  const { subsidiaries, isLoading, isError, mutate } = useSubsidiaries()
  const { save, isSaving } = useSaveSubsidiary()
  const { deleteSubsidiary, isDeleting } = useDeleteSubsidiary()

  const [nombre, setNombre] = useState("")
  const [direccion, setDireccion] = useState("")
  const [telefono, setTelefono] = useState("")
  const [encargado, setEncargado] = useState("")
  const [encargadoTelefono, setEncargadoTelefono] = useState("")
  const [activo, setActivo] = useState(true)
  const [fedexCostPackage, setFedexCostPackage] = useState(0.00)
  const [dhlCostPackage, setDhlCostPackage] = useState(0.00)
  const [chargeCost, setChargeCost] = useState(0.00)
  const [officeEmail, setOfficeEmail] = useState("")
  const [officeEmailToCopy, setOfficeEmailToCopy] = useState("")

  const isMobile = useIsMobile()

  const resetForm = () => {
    setEditingSucursal(null)
    setNombre("")
    setDireccion("")
    setTelefono("")
    setEncargado("")
    setEncargadoTelefono("")
    setActivo(true)
    setFedexCostPackage(0.00)
    setDhlCostPackage(0.00)
    setChargeCost(0.00)
    setOfficeEmail("")
    setOfficeEmailToCopy("")
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
    setFedexCostPackage(sucursal.fedexCostPackage || 0)
    setDhlCostPackage(sucursal.dhlCostPackage || 0)
    setChargeCost(sucursal.chargeCost || 0)
    setActivo(sucursal.active)
    setOfficeEmail(sucursal.officeEmail || "")
    setOfficeEmailToCopy(sucursal.officeEmailToCopy || "")
    setIsDialogOpen(true)
  }

  const openDeleteDialog = (sucursal: Subsidiary) => {
    setSucursalToDelete(sucursal)
    setIsDeleteDialogOpen(true)
  }

  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false)
    setSucursalToDelete(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const subsidiaryData = {
      name: nombre,
      address: direccion,
      phone: telefono,
      officeManager: encargado,
      managerPhone: encargadoTelefono,
      fedexCostPackage,
      dhlCostPackage,
      chargeCost,
      active: activo,
      officeEmail: officeEmail || undefined,
      officeEmailToCopy: officeEmailToCopy || undefined
    }

    try {
      if (editingSucursal) {
        await save({
          ...subsidiaryData,
          id: editingSucursal.id
        })
        toast.success("Sucursal actualizada correctamente")
      } else {
        await save(subsidiaryData)
        toast.success("Sucursal creada correctamente")
      }
      
      mutate()
      setIsDialogOpen(false)
      resetForm()
      
    } catch (error) {
      console.error("Error al guardar:", error)
      toast.error("Error al guardar la sucursal")
    }
  }

  const handleToggleActive = async (subsidiary: Subsidiary, checked: boolean) => {
    try {
      await save({ 
        ...subsidiary, 
        active: checked 
      })
      mutate()
      toast.success(`Sucursal ${checked ? "activada" : "desactivada"} correctamente`)
    } catch (error) {
      console.error("Error al cambiar estado:", error)
      toast.error("Error al cambiar el estado de la sucursal")
    }
  }

  const handleConfirmDelete = async () => {
    if (!sucursalToDelete) return

    try {
      await deleteSubsidiary(sucursalToDelete.id!)
      mutate()
      toast.success("Sucursal eliminada correctamente")
      closeDeleteDialog()
    } catch (error) {
      console.error("Error al eliminar:", error)
      toast.error("Error al eliminar la sucursal")
    }
  }

  // Obtener las columnas con las funciones inyectadas
  const columns = getColumns({
    handleToggleActive,
    openEditSucursalDialog,
    handleDeleteSubsidiary: openDeleteDialog, // Cambiamos para usar el diálogo
    isSaving,
    isDeleting
  })

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
                      onCheckedChange={(value) => handleToggleActive(sucursal, value)}
                      id={`switch-${sucursal.id}`}
                      disabled={isSaving}
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
                    <div className="flex items-start gap-2">
                      <Mail className="w-4 h-4 mt-0.5 text-foreground" />
                      <p>
                        <span className="font-medium text-foreground">Email oficina:</span>{" "}
                        {sucursal.officeEmail || "-"}
                      </p>
                    </div>
                    {sucursal.officeEmailToCopy && (
                      <div className="flex items-start gap-2">
                        <Copy className="w-4 h-4 mt-0.5 text-foreground" />
                        <p>
                          <span className="font-medium text-foreground">Email copia:</span>{" "}
                          {sucursal.officeEmailToCopy}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <div>
                        <span className="font-medium text-foreground">FedEx:</span>
                        <p>${sucursal.fedexCostPackage?.toFixed(2) || "0.00"}</p>
                      </div>
                      <div>
                        <span className="font-medium text-foreground">DHL:</span>
                        <p>${sucursal.dhlCostPackage?.toFixed(2) || "0.00"}</p>
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Carga:</span>
                        <p>${sucursal.chargeCost?.toFixed(2) || "0.00"}</p>
                      </div>
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
                      onClick={() => openDeleteDialog(sucursal)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {isDeleting ? "Eliminando..." : "Eliminar"}
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
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Diálogo para crear/editar sucursal */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSucursal ? "Editar Sucursal" : "Nueva Sucursal"}</DialogTitle>
            <DialogDescription>
              {editingSucursal ? "Modifica los datos de la sucursal" : "Ingresa los datos de la nueva sucursal"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  placeholder="Nombre de la sucursal"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Dirección completa"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Número de teléfono"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="encargado">Encargado *</Label>
                <Input
                  id="encargado"
                  value={encargado}
                  onChange={(e) => setEncargado(e.target.value)}
                  required
                  placeholder="Nombre del encargado"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="encargadoTelefono">Teléfono Encargado</Label>
                <Input
                  id="encargadoTelefono"
                  value={encargadoTelefono}
                  onChange={(e) => setEncargadoTelefono(e.target.value)}
                  placeholder="Teléfono del encargado"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="officeEmail">Email Oficina</Label>
                <Input
                  id="officeEmail"
                  type="email"
                  value={officeEmail}
                  onChange={(e) => setOfficeEmail(e.target.value)}
                  placeholder="ejemplo@sucursal.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="officeEmailToCopy">Email para Copia (CC)</Label>
                <Input
                  id="officeEmailToCopy"
                  type="email"
                  value={officeEmailToCopy}
                  onChange={(e) => setOfficeEmailToCopy(e.target.value)}
                  placeholder="copia@empresa.com"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="fedexCostPackage">Costo Paquete FedEx</Label>
                  <Input
                    id="fedexCostPackage"
                    type="number"
                    step="0.01"
                    min="0"
                    value={fedexCostPackage}
                    onChange={(e) => setFedexCostPackage(+e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dhlCostPackage">Costo Paquete DHL</Label>
                  <Input
                    id="dhlCostPackage"
                    type="number"
                    step="0.01"
                    min="0"
                    value={dhlCostPackage}
                    onChange={(e) => setDhlCostPackage(+e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="chargeCost">Costo por Carga</Label>
                  <Input
                    id="chargeCost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={chargeCost}
                    onChange={(e) => setChargeCost(+e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="activo"
                  checked={activo}
                  onCheckedChange={setActivo}
                />
                <Label htmlFor="activo">Activo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={isSaving}
              >
                {isSaving ? "Guardando..." : editingSucursal ? "Actualizar" : "Crear"} Sucursal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <AlertDialogTitle>¿Eliminar sucursal?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la sucursal{" "}
              <span className="font-semibold text-foreground">
                "{sucursalToDelete?.name}"
              </span>
              {sucursalToDelete?.officeManager && (
                <span> a cargo de {sucursalToDelete.officeManager}</span>
              )}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteDialog}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}

export default withAuth(SucursalesPage, "administracion.sucursales")