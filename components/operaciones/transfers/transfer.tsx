"use client"

import React, { useState } from "react"
import { MapPin, Send, Plus, Loader2, DollarSign, Car, Users, ForkliftIcon, Calendar as CalendarIcon } from "lucide-react"
import { OperationHeader } from "@/components/shared/operation-header"

// Componentes Shadcn UI
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CatalogSelect } from "@/components/shared/catalog-select"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
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
import { toast } from "@/lib/toast"

export default function TransferScreen() {
  const user = useAuthStore((s) => s.user)
  const userSubsidiaryId = user?.subsidiary?.id ?? ""
  
  // === ESTADOS ===
  const [transferDate, setTransferDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [errors, setErrors] = useState<Record<string, boolean>>({})

  const [origin, setOrigin] = useState("")
  const [otherOrigin, setOtherOrigin] = useState("")
  const [isExternalOrigin, setIsExternalOrigin] = useState(false)
  const [destination, setDestination] = useState("")
  const [otherDestination, setOtherDestination] = useState("")
  const [isExternalDestination, setIsExternalDestination] = useState(false) 

  const [transferType, setTransferType] = useState("")
  const [otherTransferType, setOtherTransferType] = useState("")
  const [amount, setAmount] = useState<number | "">("")
  
  // ESTADOS PARA COSTOS EXTRA
  const [hasExtraCosts, setHasExtraCosts] = useState(false)
  const [extraCostAmount, setExtraCostAmount] = useState<number | "">("")
  
  // ESTADOS PARA AYUDANTES
  const [hasHelper, setHasHelper] = useState(false)
  const [selectedHelpers, setSelectedHelpers] = useState<Driver[]>([])

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicles | undefined>(undefined) 
  const [selectedDrivers, setSelectedDrivers] = useState<Driver[]>([])
  const [selectedSucursalId, setSelectedSucursalId] = useState<string>("");

  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const effectiveSubsidiaryId = selectedSucursalId || user?.subsidiary?.id;

  // Unidad y choferes salen de la sucursal que hace el traslado: el origen, o el destino
  // cuando el origen es externo (ahí también se registra el ingreso).
  const operatingSubsidiaryId = isExternalOrigin ? (isExternalDestination ? "" : destination) : origin

  const resetCrew = () => {
    setSelectedVehicle(undefined)
    setSelectedDrivers([])
    setSelectedHelpers([])
  }

  // === CONSUMO DE SWR ===
  const { transfers, isLoading, error, mutate } = useTransfer()

  // === LÓGICA AUTOMÁTICA DE TIPOS ===
  const handleTransferTypeChange = (value: string) => {
    setTransferType(value)

    if (value === "tyco") {
      setIsExternalDestination(true)
      setOtherDestination("Tyco")
    } else if (value === "aeropuerto") {
      setIsExternalDestination(true)
      setOtherDestination("Aeropuerto")
    } else if (value === "otro") {
      if (otherDestination === "Tyco" || otherDestination === "Aeropuerto") {
        setOtherDestination("")
        setIsExternalDestination(false)
      }
    }
  }

  // === MANEJO DEL SUBMIT ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: Record<string, boolean> = {}

    if (!transferDate) newErrors.transferDate = true
    if (isExternalOrigin) {
      if (!otherOrigin.trim()) newErrors.otherOrigin = true
    } else if (!origin) {
      newErrors.origin = true
    }

    if (isExternalOrigin && isExternalDestination) {
      newErrors.destination = true
      toast.error("Si el origen es externo, el destino debe ser una de nuestras sucursales.")
    }

    if (isExternalDestination) {
      if (!otherDestination.trim()) newErrors.otherDestination = true
    } else {
      if (!destination) newErrors.destination = true
      if (!isExternalOrigin && origin && destination && origin === destination) {
        newErrors.destination = true
        toast.error("La sucursal de destino no puede ser la misma que la sucursal de origen.")
      }
    }

    if (!transferType) newErrors.transferType = true

    if (transferType === "otro") {
      if (!otherTransferType.trim()) newErrors.otherTransferType = true
      if (Number(amount) <= 0 || isNaN(Number(amount))) newErrors.amount = true
    }

    if (!selectedVehicle && operatingSubsidiaryId) newErrors.vehicle = true

    if (selectedDrivers.length === 0) newErrors.drivers = true

    if (hasExtraCosts && (Number(extraCostAmount) <= 0 || isNaN(Number(extraCostAmount)))) {
      newErrors.extraCostAmount = true
    }

    if (transferType === "aeropuerto") {
      if (selectedDrivers.length === 0) newErrors.drivers = true
      if (selectedHelpers.length === 0) newErrors.helpers = true
    } else if (hasHelper && selectedHelpers.length === 0) {
      newErrors.helpers = true
    }

    const duplicateDriver = selectedDrivers.some(driver => 
      selectedHelpers.some(helper => helper.id === driver.id)
    )
    if (duplicateDriver) {
      newErrors.drivers = true
      newErrors.helpers = true
      toast.error("El mismo repartidor no puede ser chofer y ayudante a la vez.")
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      if (!duplicateDriver && origin !== destination && !(isExternalOrigin && isExternalDestination)) {
        toast.error("Por favor completa o corrige los campos obligatorios marcados en rojo.")
      }
      return 
    }

    setErrors({})
    setIsSubmitting(true)
    
    try {
      const mainDriverIds = selectedDrivers.map(driver => driver.id)
      const helperIds = selectedHelpers.map(helper => helper.id)
      const combinedDriverIds = [...mainDriverIds, ...helperIds]

      const baseAmount = transferType === "otro" ? Number(amount) : 0;
      const extra = hasExtraCosts ? Number(extraCostAmount) : 0;
      const calculatedTotalAmount = baseAmount + extra;

      const payload = {
        originId: isExternalOrigin ? undefined : origin,
        otherOrigin: isExternalOrigin ? otherOrigin.trim() : undefined,
        destinationId: isExternalDestination ? undefined : destination,
        otherDestination: isExternalDestination ? otherDestination : undefined,
        transferType: transferType, 
        otherTransferType: transferType === "otro" ? otherTransferType : undefined,
        transferDate: new Date(transferDate).toISOString(), 
        secondAbord: transferType === "aeropuerto" ? true : hasHelper,
        extraAmount: hasExtraCosts ? extra : undefined,
        amount: transferType === "otro" ? baseAmount : undefined,
        totalAmount: calculatedTotalAmount, 
        vehicleId: selectedVehicle?.id ? selectedVehicle.id : undefined,
        driverIds: combinedDriverIds.length > 0 ? combinedDriverIds : undefined,
      }

      console.log("Enviando a backend:", payload)

      await saveTransfer(payload)
      mutate()

      setTransferDate(new Date().toISOString().split("T")[0])
      setOrigin("")
      setOtherOrigin("")
      setIsExternalOrigin(false)
      setDestination("")
      setOtherDestination("")
      setIsExternalDestination(false)
      setTransferType("")
      setOtherTransferType("")
      setAmount("")
      setHasExtraCosts(false)
      setExtraCostAmount("")
      setHasHelper(false)
      setSelectedHelpers([])
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
      
      {/* HEADER único + botón */}
      <OperationHeader
        icon={ForkliftIcon}
        title="Traslados"
        description="Consulta el historial y registra nuevos movimientos entre sucursales."
      />
      <div className="flex flex-col sm:flex-row justify-end items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
          <div className="w-full sm:w-[250px]" id="sucursal-selector-container">
            <SucursalSelector
              value={effectiveSubsidiaryId || ""}
              onValueChange={ (val) => {
                const id = typeof val === "string" ? val : (val as Subsidiary).id ?? "";
                setSelectedSucursalId(id)
              }} 
            />
          </div>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className=" text-white gap-2 w-full sm:w-auto bg-red-600 hover:bg-red-700">
                <Plus className="w-5 h-5" />
                Nuevo Traslado
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <ForkliftIcon className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <DialogTitle>Registro de Traslado</DialogTitle>
                    <DialogDescription>
                      Configura los detalles del traslado para Hermosillo y rutas.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-8 py-4">
                
                {/* === SECCIÓN 1: RUTA === */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">1. Ruta del Traslado</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-1 h-5">
                        <Label htmlFor="origin" className={errors.origin || errors.otherOrigin ? "flex items-center gap-2 text-red-500" : "flex items-center gap-2 text-slate-500"}>
                          <MapPin className="w-4 h-4" />
                          Sucursal Origen
                        </Label>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="isExternalOrigin"
                            checked={isExternalOrigin}
                            onCheckedChange={(checked) => {
                              setIsExternalOrigin(checked as boolean)
                              resetCrew()
                              if (errors.origin || errors.otherOrigin) setErrors(prev => ({ ...prev, origin: false, otherOrigin: false }))
                            }}
                          />
                          <label
                            htmlFor="isExternalOrigin"
                            className="text-sm font-medium leading-none cursor-pointer text-slate-600"
                          >
                            Externa (Otra)
                          </label>
                        </div>
                      </div>

                      {isExternalOrigin ? (
                        <div className="animate-in fade-in zoom-in duration-200">
                          <Input
                            id="otherOrigin"
                            placeholder="Escribe el nombre del origen..."
                            value={otherOrigin}
                            onChange={(e) => {
                              setOtherOrigin(e.target.value)
                              if (errors.otherOrigin) setErrors(prev => ({ ...prev, otherOrigin: false }))
                            }}
                            className={errors.otherOrigin ? "border-red-500 focus-visible:ring-red-500" : "border-blue-200 focus-visible:ring-blue-500"}
                          />
                          {errors.otherOrigin
                            ? <p className="text-xs text-red-500 mt-1">Campo requerido</p>
                            : <p className="text-xs text-slate-500 mt-1">El ingreso se registra en la sucursal destino.</p>}
                        </div>
                      ) : (
                        <div className="animate-in fade-in zoom-in duration-200">
                          <div className={errors.origin ? "rounded-md ring-1 ring-red-500" : ""}>
                          <SucursalSelector
                            value={origin}
                            onValueChange={(val) => {
                                const id = typeof val === 'string' ? val : (val as Subsidiary).id ?? "";
                                if (id !== origin) {
                                  setOrigin(id);
                                  resetCrew();
                                }
                                if (errors.origin) setErrors(prev => ({ ...prev, origin: false }))
                            }}
                          />
                          </div>
                          {errors.origin && <p className="text-xs text-red-500 mt-1">Campo requerido</p>}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-1 h-5">
                        <Label htmlFor="destination" className={errors.destination ? "flex items-center gap-2 text-red-500" : "flex items-center gap-2 text-slate-500"}>
                          <Send className="w-4 h-4" />
                          Sucursal Destino
                        </Label>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="isExternal" 
                            checked={isExternalDestination} 
                            onCheckedChange={(checked) => {
                              setIsExternalDestination(checked as boolean)
                              if (isExternalOrigin) resetCrew()
                              if (errors.destination) setErrors(prev => ({ ...prev, destination: false }))
                              if (errors.otherDestination) setErrors(prev => ({ ...prev, otherDestination: false }))
                            }} 
                          />
                          <label
                            htmlFor="isExternal"
                            className="text-sm font-medium leading-none cursor-pointer text-slate-600"
                          >
                            Externa (Otra)
                          </label>
                        </div>
                      </div>

                      {isExternalDestination ? (
                        <div className="animate-in fade-in zoom-in duration-200">
                          <Input 
                            id="otherDestination" 
                            placeholder="Escribe el nombre del destino..." 
                            value={otherDestination}
                            onChange={(e) => {
                              setOtherDestination(e.target.value)
                              if (errors.otherDestination) setErrors(prev => ({ ...prev, otherDestination: false }))
                            }}
                            className={errors.otherDestination ? "border-red-500 focus-visible:ring-red-500" : "border-blue-200 focus-visible:ring-blue-500"}
                          />
                          {errors.otherDestination && <p className="text-xs text-red-500 mt-1">Campo requerido</p>}
                        </div>
                      ) : (
                        <div className="animate-in fade-in zoom-in duration-200">
                            <div className={errors.destination ? "rounded-md ring-1 ring-red-500" : ""}>
                            <SucursalSelector 
                                value={destination}
                                onValueChange={(val) => {
                                    const id = typeof val === 'string' ? val : (val as Subsidiary).id ?? "";
                                    if (isExternalOrigin && id !== destination) resetCrew();
                                    setDestination(id);
                                    if (errors.destination) setErrors(prev => ({ ...prev, destination: false }))
                                }}
                            />
                            </div>
                            {errors.destination && <p className="text-xs text-red-500 mt-1">Campo requerido</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <hr className="border-slate-200" />

                {/* === SECCIÓN 2: TIPO Y COSTOS === */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">2. Detalles y Costos</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="transferDate" className={errors.transferDate ? "flex items-center gap-2 h-5 text-red-500" : "flex items-center gap-2 h-5 text-slate-500"}>
                        <CalendarIcon className="w-4 h-4" />
                        Fecha del Traslado
                      </Label>
                      <Input 
                        id="transferDate"
                        type="date" 
                        value={transferDate}
                        onChange={(e) => {
                          setTransferDate(e.target.value)
                          if (errors.transferDate) setErrors(prev => ({ ...prev, transferDate: false }))
                        }}
                        className={errors.transferDate ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                      {errors.transferDate && <p className="text-xs text-red-500 mt-1">Campo requerido</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="transferType" className={errors.transferType ? "text-red-500" : ""}>Tipo de Traslado</Label>
                      <CatalogSelect
                        type="transfer_type"
                        id="transferType"
                        value={transferType}
                        onValueChange={(val) => {
                          handleTransferTypeChange(val)
                          if (errors.transferType) setErrors(prev => ({ ...prev, transferType: false }))
                        }}
                        placeholder="Selecciona el tipo de traslado"
                        className={errors.transferType ? "border-red-500 ring-red-500" : ""}
                      />
                      {errors.transferType && <p className="text-xs text-red-500 mt-1">Campo requerido</p>}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {transferType === "otro" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-2">
                          <Label htmlFor="otherTransferType" className={errors.otherTransferType ? "flex items-center h-5 text-red-500" : "flex items-center h-5"}>
                            Especificar otro tipo *
                          </Label>
                          <Input 
                            id="otherTransferType" 
                            placeholder="Describe el tipo de traslado" 
                            value={otherTransferType}
                            onChange={(e) => {
                              setOtherTransferType(e.target.value)
                              if (errors.otherTransferType) setErrors(prev => ({ ...prev, otherTransferType: false }))
                            }}
                            className={errors.otherTransferType ? "border-red-500 focus-visible:ring-red-500" : ""}
                          />
                          {errors.otherTransferType && <p className="text-xs text-red-500 mt-1">Campo requerido</p>}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="amount" className={errors.amount ? "flex items-center gap-1 h-5 text-red-500" : "flex items-center gap-1 h-5 text-slate-500"}>
                            <DollarSign className="w-4 h-4" />
                            Monto *
                          </Label>
                          <Input 
                            id="amount" 
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00" 
                            value={amount}
                            onChange={(e) => {
                              setAmount(Number(e.target.value))
                              if (errors.amount) setErrors(prev => ({ ...prev, amount: false }))
                            }}
                            className={errors.amount ? "border-red-500 focus-visible:ring-red-500" : ""}
                          />
                          {errors.amount && <p className="text-xs text-red-500 mt-1">Monto inválido</p>}
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <div className="flex items-center space-x-2 mb-3">
                        <Switch id="hasExtraCosts" checked={hasExtraCosts} onCheckedChange={(checked) => {
                          setHasExtraCosts(checked)
                          if (!checked && errors.extraCostAmount) setErrors(prev => ({ ...prev, extraCostAmount: false }))
                        }} />
                        <Label htmlFor="hasExtraCosts" className="cursor-pointer">Agregar costos adicionales</Label>
                      </div>

                      {hasExtraCosts && (
                        <div className="animate-in fade-in slide-in-from-top-2 w-full sm:w-[48%]">
                          <Label htmlFor="extraCostAmount" className={errors.extraCostAmount ? "flex items-center gap-1 mb-2 text-red-500" : "flex items-center gap-1 mb-2 text-slate-500"}>
                            <DollarSign className="w-4 h-4" />
                            Monto Extra *
                          </Label>
                          <Input 
                            id="extraCostAmount" 
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00" 
                            value={extraCostAmount}
                            onChange={(e) => {
                              setExtraCostAmount(Number(e.target.value))
                              if (errors.extraCostAmount) setErrors(prev => ({ ...prev, extraCostAmount: false }))
                            }}
                            className={errors.extraCostAmount ? "border-red-500 focus-visible:ring-red-500" : ""}
                          />
                          {errors.extraCostAmount && <p className="text-xs text-red-500 mt-1">Monto extra inválido</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <hr className="border-slate-200" />

                {/* === SECCIÓN 3: VEHÍCULO Y PERSONAL === */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">3. Vehículo y Personal</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                    
                    <div className="space-y-2">
                      <Label htmlFor="vehiculo" className={errors.vehicle ? "flex items-center gap-2 h-5 text-red-500" : "flex items-center gap-2 h-5 text-slate-500"}>
                        <Car className="w-4 h-4" />
                        Vehículo
                      </Label>
                      <div className={errors.vehicle ? "rounded-md ring-1 ring-red-500" : ""}>
                      <UnidadSelector 
                        selectedUnidad={selectedVehicle}
                        onSelectionChange={(val) => {
                          setSelectedVehicle(val)
                          if (errors.vehicle) setErrors(prev => ({ ...prev, vehicle: false }))
                        }}
                        disabled={isLoading || !operatingSubsidiaryId} 
                        subsidiaryId={operatingSubsidiaryId} 
                      />
                      </div>
                      {errors.vehicle && <p className="text-xs text-red-500 mt-1">Campo requerido</p>}
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="chofer" className={errors.drivers ? "flex items-center gap-2 h-5 text-red-500" : "flex items-center gap-2 h-5 text-slate-500"}>
                          <Users className="w-4 h-4" />
                          Chofer {transferType === "aeropuerto" && "*"}
                        </Label>
                        <div className={errors.drivers ? "rounded-md ring-1 ring-red-500" : ""}>
                        <RepartidorSelector 
                          selectedRepartidores={selectedDrivers} 
                          onSelectionChange={(val) => {
                            setSelectedDrivers(val)
                            if (errors.drivers) setErrors(prev => ({ ...prev, drivers: false }))
                          }}
                          disabled={isLoading || !operatingSubsidiaryId} 
                          subsidiaryId={operatingSubsidiaryId}
                        />
                        </div>
                        {errors.drivers && <p className="text-xs text-red-500 mt-1">Campo requerido</p>}
                      </div>

                      {transferType !== "aeropuerto" && (
                        <div className="flex items-center space-x-2 pt-2">
                          <Switch id="hasHelper" checked={hasHelper} onCheckedChange={(checked) => {
                            setHasHelper(checked)
                            if (!checked && errors.helpers) setErrors(prev => ({ ...prev, helpers: false }))
                          }} />
                          <Label htmlFor="hasHelper" className="cursor-pointer">
                            Agregar segundo a bordo (Ayudante)
                          </Label>
                        </div>
                      )}

                      {(transferType === "aeropuerto" || hasHelper) && (
                        <div className="space-y-2 animate-in fade-in zoom-in duration-200">
                          <Label htmlFor="ayudante" className={errors.helpers ? "flex items-center gap-2 h-5 text-red-500" : "flex items-center gap-2 h-5 text-slate-500"}>
                            <Users className="w-4 h-4" />
                            Ayudante (Segundo a bordo) {transferType === "aeropuerto" && "*"}
                          </Label>
                          <div className={errors.helpers ? "rounded-md ring-1 ring-red-500" : ""}>
                          <RepartidorSelector 
                            selectedRepartidores={selectedHelpers} 
                            onSelectionChange={(val) => {
                              setSelectedHelpers(val)
                              if (errors.helpers) setErrors(prev => ({ ...prev, helpers: false }))
                            }}
                            disabled={isLoading || !operatingSubsidiaryId} 
                            subsidiaryId={operatingSubsidiaryId}
                          />
                          </div>
                          {errors.helpers && <p className="text-xs text-red-500 mt-1">Campo requerido</p>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-6 border-t mt-4">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" className=" text-white" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {isSubmitting ? "Guardando..." : "Guardar Traslado"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
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