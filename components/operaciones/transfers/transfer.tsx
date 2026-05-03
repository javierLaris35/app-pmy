"use client"

import React, { useState } from "react"
import { Truck, MapPin, Send, Plus, History, Loader2, DollarSign, Car, Users } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"

// Componentes Shadcn UI
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"

// Importaciones de tus Custom Hooks, Componentes y Servicios
import { DataTable } from "@/components/data-table/data-table"
import { useTransfer } from "@/hooks/services/transfer/use-transfer"
import { Transfer, Driver, Vehicles, Subsidiary } from "@/lib/types" 
import { saveTransfer } from "@/lib/services/transfer/transfer"

// Selectores
import { RepartidorSelector } from "@/components/selectors/repartidor-selector"
import { UnidadSelector } from "@/components/selectors/unidad-selector"
import { useAuthStore } from "@/store/auth.store"
import { SucursalSelector } from "@/components/sucursal-selector"
import { columns } from "./columns"

export default function TransferScreen() {
  const user = useAuthStore((s) => s.user)
  const userSubsidiaryId = user?.subsidiary?.id ?? ""
  
  // === ESTADOS ESTANDARIZADOS EN INGLÉS ===
  const [origin, setOrigin] = useState("")
  const [destination, setDestination] = useState("")
  const [otherDestination, setOtherDestination] = useState("")
  const [isExternalDestination, setIsExternalDestination] = useState(false) 

  const [transferType, setTransferType] = useState("")
  const [otherTransferType, setOtherTransferType] = useState("")
  const [amount, setAmount] = useState<number | "">("")
  
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicles | undefined>(undefined) 
  const [selectedDrivers, setSelectedDrivers] = useState<Driver[]>([])

  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // === CONSUMO DE SWR ===
  const { transfers, isLoading, error, mutate } = useTransfer()

  // === MANEJO DEL SUBMIT ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 1. VALIDACIONES FRONTALES
    console.log("🚀 ~ handleSubmit ~ origin:", origin)
    
    if (!origin) {
      alert("Por favor selecciona una sucursal de origen.") 
      return
    }

    if (isExternalDestination) {
      if (!otherDestination.trim()) {
        alert("Por favor escribe el nombre del destino externo.")
        return
      }
    } else {
      if (!destination) {
        alert("Por favor selecciona una sucursal de destino.")
        return
      }
      if (origin === destination) {
        alert("La sucursal de destino no puede ser la misma que la sucursal de origen.")
        return
      }
    }

    if (!transferType) {
      alert("Por favor selecciona el tipo de traslado.")
      return
    }

    if (transferType === "OTHER") {
      if (!otherTransferType.trim()) {
        alert("Por favor especifica el tipo de traslado en el campo de texto.")
        return
      }
      if (Number(amount) <= 0) {
        alert("Por favor ingresa un monto válido mayor a 0.")
        return
      }
    }

    setIsSubmitting(true)
    
    try {
      const driverIds = selectedDrivers.map(driver => driver.id)

      // 2. PAYLOAD LIMPIO Y ESTANDARIZADO
      const payload = {
        originId: origin, 
        destinationId: isExternalDestination ? undefined : destination,
        otherDestination: isExternalDestination ? otherDestination : undefined,
        transferType: transferType, 
        otherTransferType: transferType === "OTHER" ? otherTransferType : undefined,
        amount: transferType === "OTHER" ? Number(amount) : 0, 
        vehicleId: selectedVehicle?.id ? selectedVehicle.id : undefined,
        driverIds: driverIds.length > 0 ? driverIds : undefined,
      }

      console.log("Enviando a backend:", payload)

      await saveTransfer(payload)
      mutate()

      // 3. LIMPIAR ESTADOS
      setOrigin("")
      setDestination("")
      setOtherDestination("")
      setIsExternalDestination(false)
      setTransferType("")
      setOtherTransferType("")
      setAmount("")
      setSelectedVehicle(undefined)
      setSelectedDrivers([])
      setIsOpen(false)
    } catch (err) {
      console.error("Error al guardar el traslado:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (error) return <div className="p-4 text-red-500">Error al cargar los traslados.</div>

  return (
    <div className="space-y-6">
      
      {/* HEADER Y BOTÓN */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-8 h-8 text-blue-600" />
            Gestión de Traslados
          </h1>
          <p className="text-slate-500 mt-1">
            Consulta el historial y registra nuevos movimientos entre sucursales.
          </p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Plus className="w-5 h-5" />
              Nuevo Traslado
            </Button>
          </DialogTrigger>
          
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Truck className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <DialogTitle>Registro de Traslado</DialogTitle>
                  <DialogDescription>
                    Configura los detalles del traslado para Hermosillo y rutas.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6 py-4">
              
              {/* ORÍGEN Y DESTINO EN DOS COLUMNAS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
                
                {/* SUCURSAL ORIGEN */}
                <div className="space-y-2">
                  <Label htmlFor="origin" className="flex items-center gap-2 h-5">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    Sucursal Origen
                  </Label>
                  <SucursalSelector 
                    value={origin}
                    onValueChange={(val) => {
                        // Si val es un objeto (Subsidiary), sacamos el ID. Si es string, lo usamos directo.
                        const id = typeof val === 'string' ? val : (val as Subsidiary).id;
                        setOrigin(id);
                    }}
                    />
                </div>

                {/* SUCURSAL DESTINO */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-1 h-5">
                    <Label htmlFor="destination" className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-slate-500" />
                      Sucursal Destino
                    </Label>
                    
                    {/* CHECKBOX PARA EXTERNA */}
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="isExternal" 
                        checked={isExternalDestination} 
                        onCheckedChange={(checked) => setIsExternalDestination(checked as boolean)} 
                      />
                      <label
                        htmlFor="isExternal"
                        className="text-sm font-medium leading-none cursor-pointer text-slate-600"
                      >
                        Externa (Otra)
                      </label>
                    </div>
                  </div>

                  {/* LÓGICA DE RENDERIZADO CONDICIONAL */}
                  {isExternalDestination ? (
                    <div className="animate-in fade-in zoom-in duration-200">
                      <Input 
                        id="otherDestination" 
                        placeholder="Escribe el nombre del destino..." 
                        value={otherDestination}
                        onChange={(e) => setOtherDestination(e.target.value)}
                        className="border-blue-200 focus-visible:ring-blue-500"
                      />
                    </div>
                  ) : (
                    <div className="animate-in fade-in zoom-in duration-200">
                        <SucursalSelector 
                            value={destination}
                            onValueChange={(val) => {
                                const id = typeof val === 'string' ? val : (val as Subsidiary).id;
                                setDestination(id);
                            }}
                        />
                    </div>
                  )}
                </div>

              </div>

              <hr className="border-slate-200" />

              {/* TIPO DE TRASLADO */}
              <div className="space-y-2">
                <Label htmlFor="transferType">Tipo de Traslado</Label>
                <Select onValueChange={setTransferType} value={transferType}>
                  <SelectTrigger id="transferType">
                    <SelectValue placeholder="Selecciona el tipo de traslado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TYCO">Tyco</SelectItem>
                    <SelectItem value="AIRPORT">Aeropuerto</SelectItem>
                    <SelectItem value="OTHER">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {transferType === "OTHER" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <Label htmlFor="otherTransferType" className="flex items-center h-5">
                      Especificar otro tipo *
                    </Label>
                    <Input 
                      id="otherTransferType" 
                      placeholder="Describe el tipo de traslado" 
                      value={otherTransferType}
                      onChange={(e) => setOtherTransferType(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount" className="flex items-center gap-1 h-5">
                      <DollarSign className="w-4 h-4 text-slate-500" />
                      Monto *
                    </Label>
                    <Input 
                      id="amount" 
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00" 
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                    />
                  </div>
                </div>
              )}

              <hr className="border-slate-200" />

              {/* SECCIÓN DE VEHÍCULO Y CHOFER */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                
                <div className="space-y-2">
                  <Label htmlFor="vehiculo" className="flex items-center gap-2 h-5">
                    <Car className="w-4 h-4 text-slate-500" />
                    Vehículo
                  </Label>
                  <UnidadSelector 
                    selectedUnidad={selectedVehicle}
                    onSelectionChange={setSelectedVehicle}
                    disabled={isLoading} 
                    subsidiaryId={userSubsidiaryId} 
                   />                  
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chofer" className="flex items-center gap-2 h-5">
                    <Users className="w-4 h-4 text-slate-500" />
                    Chofer(es)
                  </Label>
                  <RepartidorSelector 
                    selectedRepartidores={selectedDrivers} 
                    onSelectionChange={setSelectedDrivers}
                    disabled={isLoading} 
                    subsidiaryId={userSubsidiaryId}
                  />
                </div>

              </div>

              <DialogFooter className="pt-6 border-t mt-4">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {isSubmitting ? "Guardando..." : "Guardar Traslado"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* DATA TABLE */}
      <div className="">
        {isLoading ? (
          <div className="flex justify-center items-center p-8 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Cargando traslados...
          </div>
        ) : (
          <DataTable columns={columns} data={transfers || []} />
        )}
      </div>
      
    </div>
  )
}