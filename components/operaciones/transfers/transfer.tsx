"use client"

import React, { useState } from "react"
import { MapPin, Send, Plus, Loader2, DollarSign, Car, Users, ForkliftIcon, Calendar as CalendarIcon } from "lucide-react"

// Componentes Shadcn UI
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

export default function TransferScreen() {
  const user = useAuthStore((s) => s.user)
  const userSubsidiaryId = user?.subsidiary?.id ?? ""
  
  // === ESTADOS ===
  const [transferDate, setTransferDate] = useState<string>(new Date().toISOString().split("T")[0])

  const [origin, setOrigin] = useState("")
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

    if (!transferDate) return alert("Por favor selecciona la fecha del traslado.")
    if (!origin) return alert("Por favor selecciona una sucursal de origen.") 

    if (isExternalDestination) {
      if (!otherDestination.trim()) return alert("Por favor escribe el nombre del destino externo.")
    } else {
      if (!destination) return alert("Por favor selecciona una sucursal de destino.")
      if (origin === destination) return alert("La sucursal de destino no puede ser la misma que la sucursal de origen.")
    }

    if (!transferType) return alert("Por favor selecciona el tipo de traslado.")

    if (transferType === "otro") {
      if (!otherTransferType.trim()) return alert("Por favor especifica el tipo de traslado en el campo de texto.")
      if (Number(amount) <= 0) return alert("Por favor ingresa un monto válido mayor a 0.")
    }

    if (hasExtraCosts && Number(extraCostAmount) <= 0) {
      return alert("Por favor ingresa un monto de costo extra mayor a 0.")
    }

    if (transferType === "aeropuerto") {
      if (selectedDrivers.length === 0) return alert("Para traslados de aeropuerto, debes seleccionar un chofer.")
      if (selectedHelpers.length === 0) return alert("Para traslados de aeropuerto, el segundo a bordo (ayudante) es obligatorio.")
    } else if (hasHelper && selectedHelpers.length === 0) {
      return alert("Has activado el segundo a bordo, por favor selecciona un ayudante.")
    }

    setIsSubmitting(true)
    
    try {
      // 1. Extraemos los IDs
      const mainDriverIds = selectedDrivers.map(driver => driver.id)
      const helperIds = selectedHelpers.map(helper => helper.id)
      
      // 2. Combinamos choferes y ayudantes en el mismo arreglo (Como lo pide el DTO)
      const combinedDriverIds = [...mainDriverIds, ...helperIds]

      // 3. Cálculos monetarios
      const baseAmount = transferType === "otro" ? Number(amount) : 0;
      const extra = hasExtraCosts ? Number(extraCostAmount) : 0;
      const calculatedTotalAmount = baseAmount + extra;

      // 4. PAYLOAD ESTRICTO AL DTO
      const payload = {
        originId: origin, 
        destinationId: isExternalDestination ? undefined : destination,
        otherDestination: isExternalDestination ? otherDestination : undefined,
        transferType: transferType, 
        otherTransferType: transferType === "otro" ? otherTransferType : undefined,
        
        // NestJS con @IsDate() o TypeORM suele esperar el Date en string ISO
        transferDate: new Date(transferDate).toISOString(), 
        
        secondAbord: transferType === "aeropuerto" ? true : hasHelper,
        // secondAboardAmount: No lo tenemos en la UI, se envía undefined/se omite
        
        extraAmount: hasExtraCosts ? extra : undefined,
        amount: transferType === "otro" ? baseAmount : undefined,
        totalAmount: calculatedTotalAmount, // Campo requerido por el DTO
        
        vehicleId: selectedVehicle?.id ? selectedVehicle.id : undefined,
        driverIds: combinedDriverIds.length > 0 ? combinedDriverIds : undefined,
      }

      console.log("Enviando a backend:", payload)

      await saveTransfer(payload)
      mutate()

      // LIMPIAR ESTADOS
      setTransferDate(new Date().toISOString().split("T")[0])
      setOrigin("")
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
      
      {/* HEADER Y BOTÓN */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <ForkliftIcon className="w-8 h-8 text-blue-600" />
            Gestión de Traslados
          </h1>
          <p className="text-slate-500 mt-1">
            Consulta el historial y registra nuevos movimientos entre sucursales.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
          <div className="w-full sm:w-[250px]" id="sucursal-selector-container">
            <SucursalSelector
              value={effectiveSubsidiaryId || ""}
              onValueChange={ (val) => {
                const id = typeof val === "string" ? val : (val as Subsidiary).id;
                setSelectedSucursalId(id)
              }} 
            />
          </div>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className=" text-white gap-2 w-full sm:w-auto">
                <Plus className="w-5 h-5" />
                Nuevo Traslado
              </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <ForkliftIcon className="w-5 h-5 text-blue-600" />
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
                      <Label htmlFor="origin" className="flex items-center gap-2 h-5">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        Sucursal Origen
                      </Label>
                      <SucursalSelector 
                        value={origin}
                        onValueChange={(val) => {
                            const id = typeof val === 'string' ? val : (val as Subsidiary).id;
                            
                            // Si el origen cambia, limpiamos los vehículos y choferes seleccionados
                            if (id !== origin) {
                              setOrigin(id);
                              setSelectedVehicle(undefined);
                              setSelectedDrivers([]);
                              setSelectedHelpers([]);
                            }
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-1 h-5">
                        <Label htmlFor="destination" className="flex items-center gap-2">
                          <Send className="w-4 h-4 text-slate-500" />
                          Sucursal Destino
                        </Label>
                        
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
                </div>

                <hr className="border-slate-200" />

                {/* === SECCIÓN 2: TIPO Y COSTOS === */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">2. Detalles y Costos</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-end mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="transferDate" className="flex items-center gap-2 h-5">
                        <CalendarIcon className="w-4 h-4 text-slate-500" />
                        Fecha del Traslado
                      </Label>
                      <Input 
                        id="transferDate"
                        type="date" 
                        value={transferDate}
                        onChange={(e) => setTransferDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="transferType">Tipo de Traslado</Label>
                      <Select onValueChange={handleTransferTypeChange} value={transferType}>
                        <SelectTrigger id="transferType">
                          <SelectValue placeholder="Selecciona el tipo de traslado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tyco">Tyco</SelectItem>
                          <SelectItem value="aeropuerto">Aeropuerto</SelectItem>
                          <SelectItem value="otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {transferType === "otro" && (
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

                    <div className="pt-2">
                      <div className="flex items-center space-x-2 mb-3">
                        <Switch id="hasExtraCosts" checked={hasExtraCosts} onCheckedChange={setHasExtraCosts} />
                        <Label htmlFor="hasExtraCosts" className="cursor-pointer">Agregar costos adicionales</Label>
                      </div>

                      {hasExtraCosts && (
                        <div className="animate-in fade-in slide-in-from-top-2 w-full sm:w-[48%]">
                          <Label htmlFor="extraCostAmount" className="flex items-center gap-1 mb-2">
                            <DollarSign className="w-4 h-4 text-slate-500" />
                            Monto Extra *
                          </Label>
                          <Input 
                            id="extraCostAmount" 
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00" 
                            value={extraCostAmount}
                            onChange={(e) => setExtraCostAmount(Number(e.target.value))}
                          />
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
                      <Label htmlFor="vehiculo" className="flex items-center gap-2 h-5">
                        <Car className="w-4 h-4 text-slate-500" />
                        Vehículo
                      </Label>
                      {/* Se actualiza el subsidiaryId a origin y se deshabilita si origin está vacío */}
                      <UnidadSelector 
                        selectedUnidad={selectedVehicle}
                        onSelectionChange={setSelectedVehicle}
                        disabled={isLoading || !origin} 
                        subsidiaryId={origin} 
                      />                  
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="chofer" className="flex items-center gap-2 h-5">
                          <Users className="w-4 h-4 text-slate-500" />
                          Chofer {transferType === "aeropuerto" && "*"}
                        </Label>
                        {/* Se actualiza el subsidiaryId a origin y se deshabilita si origin está vacío */}
                        <RepartidorSelector 
                          selectedRepartidores={selectedDrivers} 
                          onSelectionChange={setSelectedDrivers}
                          disabled={isLoading || !origin} 
                          subsidiaryId={origin}
                        />
                      </div>

                      {transferType !== "aeropuerto" && (
                        <div className="flex items-center space-x-2 pt-2">
                          <Switch id="hasHelper" checked={hasHelper} onCheckedChange={setHasHelper} />
                          <Label htmlFor="hasHelper" className="cursor-pointer">
                            Agregar segundo a bordo (Ayudante)
                          </Label>
                        </div>
                      )}

                      {(transferType === "aeropuerto" || hasHelper) && (
                        <div className="space-y-2 animate-in fade-in zoom-in duration-200">
                          <Label htmlFor="ayudante" className="flex items-center gap-2 h-5">
                            <Users className="w-4 h-4 text-slate-500" />
                            Ayudante (Segundo a bordo) {transferType === "aeropuerto" && "*"}
                          </Label>
                          {/* Se actualiza el subsidiaryId a origin y se deshabilita si origin está vacío */}
                          <RepartidorSelector 
                            selectedRepartidores={selectedHelpers} 
                            onSelectionChange={setSelectedHelpers}
                            disabled={isLoading || !origin} 
                            subsidiaryId={origin}
                          />
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