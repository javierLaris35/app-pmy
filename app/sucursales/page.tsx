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
  Building2,
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

const initialFormState = {
  name: "",
  address: "",
  phone: "",
  officeManager: "",
  managerPhone: "",
  fedexCostPackage: 0,
  dhlCostPackage: 0,
  chargeCost: 0,
  tycoAmount: 0,
  airportAmount: 0,
  secondAbordAmount: 0,
  active: true,
  isWarehouse: false,
  officeEmail: "",
  officeEmailToCopy: "",
}

function SucursalesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [editingSucursal, setEditingSucursal] = useState<Subsidiary | null>(null)
  const [sucursalToDelete, setSucursalToDelete] = useState<Subsidiary | null>(null)
  
  const [formData, setFormData] = useState(initialFormState)

  const { subsidiaries, isLoading, isError, mutate } = useSubsidiaries()
  const { save, isSaving } = useSaveSubsidiary()
  const { deleteSubsidiary, isDeleting } = useDeleteSubsidiary()

  const isMobile = useIsMobile()

  const handleFormChange = (field: keyof typeof formData, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setEditingSucursal(null)
    setFormData(initialFormState)
  }

  const openNewSucursalDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditSucursalDialog = (sucursal: Subsidiary) => {
    setEditingSucursal(sucursal)
    setFormData({
      name: sucursal.name,
      address: sucursal.address || "",
      phone: sucursal.phone || "",
      officeManager: sucursal.officeManager || "",
      managerPhone: sucursal.managerPhone || "",
      fedexCostPackage: sucursal.fedexCostPackage || 0,
      dhlCostPackage: sucursal.dhlCostPackage || 0,
      chargeCost: sucursal.chargeCost || 0,
      tycoAmount: sucursal.tycoAmount || 0,
      airportAmount: sucursal.airportAmount || 0,
      secondAbordAmount: sucursal.secondAbordAmount || 0,
      active: sucursal.active,
      isWarehouse: sucursal.isWarehouse || false,
      officeEmail: sucursal.officeEmail || "",
      officeEmailToCopy: sucursal.officeEmailToCopy || "",
    })
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
      ...formData,
      officeEmail: formData.officeEmail || undefined,
      officeEmailToCopy: formData.officeEmailToCopy || undefined
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

  const columns = getColumns({
    handleToggleActive,
    openEditSucursalDialog,
    handleDeleteSubsidiary: openDeleteDialog,
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
                  <div className="flex flex-col gap-1">
                    <CardTitle className="text-base">{sucursal.name}</CardTitle>
                    {sucursal.isWarehouse && (
                      <span className="text-xs flex items-center text-blue-600 bg-blue-50 w-fit px-2 py-0.5 rounded-full font-medium">
                        <Building2 className="w-3 h-3 mr-1" /> Bodega
                      </span>
                    )}
                  </div>
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
                    
                    {/* Costos de Paquetería y Extras */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-2 pt-2 border-t mt-2">
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
                      <div>
                        <span className="font-medium text-foreground">Tyco:</span>
                        <p>${sucursal.tycoAmount?.toFixed(2) || "0.00"}</p>
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Aeropuerto:</span>
                        <p>${sucursal.airportAmount?.toFixed(2) || "0.00"}</p>
                      </div>
                      <div>
                        <span className="font-medium text-foreground">2do Abordo:</span>
                        <p>${sucursal.secondAbordAmount?.toFixed(2) || "0.00"}</p>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSucursal ? "Editar Sucursal" : "Nueva Sucursal"}</DialogTitle>
            <DialogDescription>
              {editingSucursal ? "Modifica los datos de la sucursal o bodega." : "Ingresa los datos de la nueva sucursal o bodega."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleFormChange("name", e.target.value)}
                    required
                    placeholder="Nombre de la sucursal"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleFormChange("address", e.target.value)}
                    placeholder="Dirección completa"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleFormChange("phone", e.target.value)}
                    placeholder="Número de teléfono"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="officeManager">Encargado *</Label>
                  <Input
                    id="officeManager"
                    value={formData.officeManager}
                    onChange={(e) => handleFormChange("officeManager", e.target.value)}
                    required
                    placeholder="Nombre del encargado"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="managerPhone">Teléfono Encargado</Label>
                  <Input
                    id="managerPhone"
                    value={formData.managerPhone}
                    onChange={(e) => handleFormChange("managerPhone", e.target.value)}
                    placeholder="Teléfono del encargado"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="officeEmail">Email Oficina</Label>
                  <Input
                    id="officeEmail"
                    type="email"
                    value={formData.officeEmail}
                    onChange={(e) => handleFormChange("officeEmail", e.target.value)}
                    placeholder="ejemplo@sucursal.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="officeEmailToCopy">Email para Copia (CC)</Label>
                  <Input
                    id="officeEmailToCopy"
                    type="email"
                    value={formData.officeEmailToCopy}
                    onChange={(e) => handleFormChange("officeEmailToCopy", e.target.value)}
                    placeholder="copia@empresa.com"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-foreground">Costos y Tarifas</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="fedexCostPackage">Paquete FedEx</Label>
                    <Input
                      id="fedexCostPackage"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.fedexCostPackage}
                      onChange={(e) => handleFormChange("fedexCostPackage", +e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dhlCostPackage">Paquete DHL</Label>
                    <Input
                      id="dhlCostPackage"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.dhlCostPackage}
                      onChange={(e) => handleFormChange("dhlCostPackage", +e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="chargeCost">Costo por Carga</Label>
                    <Input
                      id="chargeCost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.chargeCost}
                      onChange={(e) => handleFormChange("chargeCost", +e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tycoAmount">Monto Tyco</Label>
                    <Input
                      id="tycoAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.tycoAmount}
                      onChange={(e) => handleFormChange("tycoAmount", +e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="airportAmount">Monto Aeropuerto</Label>
                    <Input
                      id="airportAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.airportAmount}
                      onChange={(e) => handleFormChange("airportAmount", +e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="secondAbordAmount">Monto 2do Abordo</Label>
                    <Input
                      id="secondAbordAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.secondAbordAmount}
                      onChange={(e) => handleFormChange("secondAbordAmount", +e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-6 pt-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="activo"
                    checked={formData.active}
                    onCheckedChange={(checked) => handleFormChange("active", checked)}
                  />
                  <Label htmlFor="activo">Activo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isWarehouse"
                    checked={formData.isWarehouse}
                    onCheckedChange={(checked) => handleFormChange("isWarehouse", checked)}
                  />
                  <Label htmlFor="isWarehouse">Es Bodega</Label>
                </div>
              </div>

            </div>
            <DialogFooter>
              <Button 
                type="submit" 
                disabled={isSaving}
              >
                {isSaving ? "Guardando..." : editingSucursal ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la sucursal/bodega{" "}
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