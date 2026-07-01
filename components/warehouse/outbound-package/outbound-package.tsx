"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { PDFDownloadLink } from "@react-pdf/renderer"
import { useBrowserVoice } from "@/hooks/use-browser-voice"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { OperationHeader } from "@/components/shared/operation-header"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { PackageEntryPDF } from "@/components/package-entry-pdf"
import {
  Download,
  AlertTriangle,
  X,
  CheckCircle2,
  Keyboard,
  Package,
  ShieldAlert,
  Clock,
  DollarSign,
  Box,
  Truck,
  PackageMinus,
  ScanBarcode,
  HelpCircle,
  Send,
  Building2,
  Route,
  ArrowRightLeft,
  GaugeIcon,
  History
} from "lucide-react"

// Selectores especializados
import { UnidadSelector } from "@/components/selectors/unidad-selector"
import { RepartidorSelector } from "@/components/selectors/repartidor-selector"

// Servicios y tipos
import { saveWarehouseOutbound, validateShipment } from "@/lib/services/warehouse/warehouse"
import { Driver, ScannedShipment, Vehicles, Route as Routes, OutboundTypeEnum} from "@/lib/types"
import { useAuthStore } from "@/store/auth.store"
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries"
import { PackagesList } from "@/components/shared/packages-list"
import { toPackageInfo, RemittancePiecesPanel, hasRemittancePieces, groupRemittances } from "@/components/warehouse/shared/warehouse-package-list.helpers"
import { RemittanceGroupToggle } from "@/components/warehouse/shared/remittance-group-toggle"
import { SucursalSelector } from "@/components/sucursal-selector"
import { RutaSelector } from "@/components/selectors/ruta-selector"
import { WarehouseHistoryDialog } from "@/components/warehouse/warehouse-history-dialog"

export type OutboundShipment = ScannedShipment & {
  pieces?: string[]; 
  existingPieces?: string[]; 
  recipientName?: string;
  recipientAddress?: string;
}

export type OutboundSessionState = {
  id: string
  vehicle: Vehicles | null
  startTime: Date
  endTime?: Date
  drivers: Driver[]
  deliveredByName: string
  receivedByName: string
  packages: OutboundShipment[]
  status: "En Proceso" | "Completado"
  outputType: OutboundTypeEnum
  routes: Routes[]
  initialKms: number | null
  destinationSubsidiary?: string
  destinationSubsidiaryName?: string
}

type RemittanceDialogState = {
  isOpen: boolean;
  step: "confirm" | "scan";
  masterTracking: string;
  pieceInput: string;
  error: string | null;
}

// Normaliza el flag isWarehouse (puede venir como bit/Buffer del backend).
const checkIsWarehouse = (val: any): boolean => {
  if (val && typeof val === "object" && "data" in val) return val.data[0] === 1
  return Boolean(val)
}

const isToday = (date: Date) => new Date().toDateString() === new Date(date).toDateString()
const isTomorrow = (date: Date) => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toDateString() === new Date(date).toDateString()
}

export default function OutboundPackage() {
  const user = useAuthStore((state) => state.user);
  const defaultWarehouseId = user?.subsidiary?.id || user?.subsidiaryId || "";

  const inputRef = useRef<HTMLInputElement>(null)
  const pieceInputRef = useRef<HTMLInputElement>(null) 

  const { speak: speakMessage } = useBrowserVoice({ pitch: 0.8, rate: 1.3 })

  const safeSpeak = useCallback((text: string) => {
    try {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      if (typeof speakMessage === 'function') {
        speakMessage(text)
      }
    } catch (err) {
      console.warn("Aviso: Fallo silencioso en la sintesis de voz.", err)
    }
  }, [speakMessage])
  
  const [isClient, setIsClient] = useState(false)
  const [session, setSession] = useState<OutboundSessionState>({
    id: crypto.randomUUID(),
    vehicle: null,
    startTime: new Date(),
    deliveredByName: "",
    receivedByName: "",
    packages: [],
    status: "En Proceso",
    drivers: [],
    routes: [],
    initialKms: 0,
    outputType: OutboundTypeEnum.DISPATCH,
    destinationSubsidiary: ""
  })
  
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("")
  const [effectiveWarehouseName, setEffectiveWarehouseName] = useState<string>("")
  const effectiveWarehouseId = selectedWarehouse || defaultWarehouseId;
  const [showHistory, setShowHistory] = useState(false)

  // Choferes/unidades/rutas cuelgan de la sucursal de CIUDAD, no de la bodega.
  // Resolvemos la sucursal operativa por ZONA. Fallback: la bodega misma.
  const { subsidiaries: allSubsidiaries } = useSubsidiaries()
  const operationalSubsidiaryId = useMemo(() => {
    const wh = allSubsidiaries.find((s) => s.id === effectiveWarehouseId)
    if (!wh?.zoneId) return effectiveWarehouseId
    const city = allSubsidiaries.find(
      (s) => s.zoneId === wh.zoneId && s.id !== effectiveWarehouseId && !checkIsWarehouse(s.isWarehouse),
    )
    return city?.id || effectiveWarehouseId
  }, [allSubsidiaries, effectiveWarehouseId])

  const [scanInput, setScanInput] = useState("")
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>("")
  const [selectedRutas, setSelectedRutas] = useState<Routes[]>([]);
  const [selectedKms, setSelectedKms] = useState<number | null>(0);
  // Vista de remesas: agrupadas (default) o cada pieza por separado.
  const [groupRemesas, setGroupRemesas] = useState(true)

  const [remittanceDialog, setRemittanceDialog] = useState<RemittanceDialogState>({
    isOpen: false,
    step: "confirm",
    masterTracking: "",
    pieceInput: "",
    error: null
  })

  const [modals, setModals] = useState({
    shortcuts: false,
    expiringToday: false,
    highValue: false,
    charges: false,
    signatures: false
  })

  useEffect(() => { setIsClient(true) }, [])

  useEffect(() => {
    if (remittanceDialog.isOpen && remittanceDialog.step === "scan") {
      setTimeout(() => pieceInputRef.current?.focus(), 100);
    }
  }, [remittanceDialog.isOpen, remittanceDialog.step]);

  const toggleModal = (key: keyof typeof modals, value: boolean) => {
    setModals(prev => ({ ...prev, [key]: value }))
    if (!value && !remittanceDialog.isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }

  const expiringTodayPackages = useMemo(() => session.packages.filter(p => isToday(p.commitDateTime)), [session.packages])
  const highValuePackages = useMemo(() => session.packages.filter(p => p.isHighValue), [session.packages])
  const cargoPackages = useMemo(() => session.packages.filter(p => p.isCharge), [session.packages])
  const packagesWithCharges = useMemo(() => session.packages.filter(p => p.hasPayment), [session.packages])
  const totalChargesAmount = useMemo(() => 
    packagesWithCharges.reduce((acc, p) => acc + (Number(p.paymentAmount) || 0), 0), 
  [packagesWithCharges])
  
  const totalCount = useMemo(() => session.packages.reduce((acc, p) => acc + 1 + (p.pieces?.length || 0) + (p.existingPieces?.length || 0), 0), [session.packages])
  const fedexCount = useMemo(() => session.packages.reduce((acc, p) => p.shipmentType.toLowerCase() === "fedex" ? acc + 1 + (p.pieces?.length || 0) + (p.existingPieces?.length || 0) : acc, 0), [session.packages])
  const dhlCount = useMemo(() => session.packages.reduce((acc, p) => p.shipmentType.toLowerCase() === "dhl" ? acc + 1 + (p.pieces?.length || 0) + (p.existingPieces?.length || 0) : acc, 0), [session.packages])

  const sortedPackages = useMemo(() => {
    return [...session.packages].sort((a, b) => {
      const getSubName = (pkg: any) => {
        if (pkg?.subsidiary?.name) return String(pkg.subsidiary.name).trim();
        if (typeof pkg?.subsidiaryId === 'string') return pkg.subsidiaryId.trim();
        if (typeof pkg?.subsidiaryId === 'object' && pkg?.subsidiaryId !== null) return String(pkg.subsidiaryId.name || "S/N").trim();
        return "S/N";
      };

      const branchA = getSubName(a);
      const branchB = getSubName(b);
      const cmpBranch = branchA.localeCompare(branchB);
      if (cmpBranch !== 0) return cmpBranch;

      const zipA = String(a.recipientZip || "").trim();
      const zipB = String(b.recipientZip || "").trim();
      const cmpZip = zipA.localeCompare(zipB, undefined, { numeric: true }); 
      if (cmpZip !== 0) return cmpZip;

      const carrierA = String(a.shipmentType || "").trim().toUpperCase();
      const carrierB = String(b.shipmentType || "").trim().toUpperCase();
      return carrierA.localeCompare(carrierB);
    });
  }, [session.packages]);
  
  // Validacion para habilitar el cierre
  const isReadyToFinish = useMemo(() => {
    const hasPackages = session.packages.length > 0;
    const hasVehicle = !!session.vehicle?.id;
    const hasDrivers = session.drivers.length > 0;
    const hasWarehouse = !!effectiveWarehouseId;
    const hasRoutes = selectedRutas.length > 0;
    console.log("🚀 ~ OutboundPackage ~ hasRoutes:", hasRoutes)
    const hasKms = selectedKms !== null && selectedKms > 0;
    console.log("🚀 ~ OutboundPackage ~ session:", session)
    console.log("🚀 ~ OutboundPackage ~ hasKms:", hasKms)
    
    // Para traspaso, tambien necesita sucursal destino
    if (session.outputType === OutboundTypeEnum.TRANSFER) {
      return hasPackages && hasVehicle && hasDrivers && hasWarehouse && !!session.destinationSubsidiary;
    }

    return hasPackages && hasVehicle && hasDrivers && hasWarehouse && hasRoutes && hasKms;
  }, [session.packages.length, session.vehicle?.id, session.drivers.length, effectiveWarehouseId, session.outputType, session.destinationSubsidiary]);
  
  const derivedDriverName = session.drivers.map(d => {
    if (typeof d.id === 'object' && d.id !== null) {
      return (d.id as any).name || (d.id as any).nombre || "Operador Seleccionado";
    }
    return (d as any).name || (d as any).nombre || d.id || "Operador Seleccionado";
  }).join(", ")
  
  const canSaveAndGeneratePDF = session.receivedByName.trim() !== "";

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInputFocused = document.activeElement instanceof HTMLInputElement;

      if (e.key === "F1") {
        e.preventDefault();
        inputRef.current?.focus();
      } 
      else if (e.key === "F2") {
        e.preventDefault();
        if (isReadyToFinish) {
          toggleModal("signatures", true);
        } else {
          safeSpeak("Faltan datos para finalizar"); 
        }
      } 
      else if (e.key === "F3") {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement;
        if (searchInput) searchInput.focus();
      } 
      else if (e.key === "Escape") {
        setModals({ signatures: false, shortcuts: false, expiringToday: false, highValue: false, charges: false });
        if (remittanceDialog.isOpen) {
          setRemittanceDialog(prev => ({...prev, isOpen: false}));
        }
        setTimeout(() => inputRef.current?.focus(), 100);
      } 
      else if (!isInputFocused && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        if (remittanceDialog.isOpen && remittanceDialog.step === "scan") {
          pieceInputRef.current?.focus();
        } else if (!remittanceDialog.isOpen) {
          inputRef.current?.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isReadyToFinish, safeSpeak, remittanceDialog.isOpen, remittanceDialog.step]);

  const handlePieceScan = useCallback(() => {
    const pieceTracking = remittanceDialog.pieceInput.trim().toUpperCase();
    if (!pieceTracking) return;

    setSession(prev => {
      const pkgIndex = prev.packages.findIndex(p => p.trackingNumber === remittanceDialog.masterTracking);
      if (pkgIndex === -1) return prev;

      const pkg = prev.packages[pkgIndex];
      
      if (pkg.pieces?.includes(pieceTracking) || pkg.existingPieces?.includes(pieceTracking)) {
        setRemittanceDialog(d => ({ ...d, error: `Pieza duplicada o ya registrada: ${pieceTracking}` }));
        safeSpeak("Pieza duplicada");
        setTimeout(() => pieceInputRef.current?.select(), 50);
        return prev;
      }

      safeSpeak("Pieza agregada");
      
      setRemittanceDialog(d => ({ ...d, error: null, pieceInput: "" })); 
      
      const updatedPackages = [...prev.packages];
      updatedPackages[pkgIndex] = {
        ...pkg,
        pieces: [...(pkg.pieces || []), pieceTracking]
      };
      return { ...prev, packages: updatedPackages };
    });

    setTimeout(() => pieceInputRef.current?.focus(), 50);
  }, [remittanceDialog.pieceInput, remittanceDialog.masterTracking, safeSpeak]);

  const handleScan = useCallback(async () => {
    if (!scanInput.trim()) return
    setIsScanning(true)
    setError(null)

    let scannedCode = scanInput.trim().toUpperCase()

    // FedEx: recortar códigos numéricos largos (>=20) a los últimos 12 dígitos.
    // (DHL con letras JJD/JD pasa intacto.)
    if (scannedCode.length >= 20 && /^\d+$/.test(scannedCode)) {
      scannedCode = scannedCode.slice(-12)
    }

    // Defensa local: ¿ya está en la lista?
    const localMatch = session.packages.find(
      (p) => p.trackingNumber === scannedCode || p.dhlUniqueId === scannedCode
    );
    if (localMatch) {
      if (localMatch.dhlUniqueId === scannedCode) {
        setError(`La pieza ${scannedCode} ya está en la lista.`)
        safeSpeak("Pieza repetida."); setScanInput(""); setIsScanning(false); return;
      }
      if (localMatch.trackingNumber === scannedCode) {
        if (localMatch.shipmentType.toLowerCase() === "dhl") {
          setRemittanceDialog({ isOpen: true, step: "confirm", masterTracking: localMatch.trackingNumber, pieceInput: "", error: null });
          safeSpeak("Guía principal detectada. Confirme remesa.");
        } else {
          setError(`Guía ya en lista: ${scannedCode}`); safeSpeak("Guía repetida.");
        }
        setScanInput(""); setIsScanning(false); return;
      }
    }

    try {
      const result = await validateShipment(scannedCode, effectiveWarehouseId, "outbound")
      if (result.isValid === false) {
        setError(result.reason || "No encontrado en sistema")
        safeSpeak("No encontrado.")
      } else {
        // Dedup post-backend (DHL: solo si coincide el dhlUniqueId).
        const isDuplicate = session.packages.find((p) => {
          if (p.trackingNumber !== result.trackingNumber) return false;
          if (p.dhlUniqueId && result.dhlUniqueId) return p.dhlUniqueId === result.dhlUniqueId;
          return true;
        });
        if (isDuplicate) {
          if (result.shipmentType.toLowerCase() === "dhl") {
            setRemittanceDialog({ isOpen: true, step: "confirm", masterTracking: result.trackingNumber, pieceInput: "", error: null });
            safeSpeak("Guía repetida. Confirme remesa.");
          } else {
            setError(`El paquete con guía ${result.trackingNumber} ya está en la lista.`); safeSpeak("Paquete duplicado.");
          }
          setScanInput(""); setIsScanning(false); return;
        }

        const newShipment: OutboundShipment = {
          ...result,
          recipientZip: result.recipientZip ? String(result.recipientZip).trim() : "",
          commitDateTime: new Date(result.commitDateTime),
          isCharge: result.isCharge || false,
          hasPayment: result.hasPayment || false,
          paymentAmount: result.paymentAmount || 0,
          pieces: [],
          existingPieces: result.existingPieces || [],
          recipientName: result.recipientName || "",
          recipientAddress: result.recipientAddress || ""
        }

        // Aviso de estado (no bloquea: el operador decide).
        if (result.statusWarning) {
          setError(result.statusWarning)
          safeSpeak("Atención, revise el estado del paquete.")
        } else if (newShipment.existingPieces && newShipment.existingPieces.length > 0) {
          safeSpeak("Guía existente. Escanee piezas restantes.");
        } else {
          safeSpeak(isToday(newShipment.commitDateTime) ? "Vence hoy" : isTomorrow(newShipment.commitDateTime) ? "Vence mañana" : "Registrado")
        }

        setSession(prev => ({ ...prev, packages: [newShipment, ...prev.packages] }))
        setScanInput("")
      }
    } catch (err) {
      setError("Error de servidor")
      safeSpeak("Error de sistema")
    } finally {
      setIsScanning(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [scanInput, session.packages, safeSpeak, effectiveWarehouseId])

  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); handleScan() } }

  // PackageListItem llama onRemove con (dhlUniqueId || trackingNumber).
  const handleRemovePackage = useCallback((identifier: string) => {
    setSession(prev => {
      if (groupRemesas) {
        // En vista agrupada el identificador es la guía principal: quitamos toda la remesa (mismo trackingNumber).
        const target = prev.packages.find((p) => (p.dhlUniqueId || p.trackingNumber) === identifier)
        if (target?.trackingNumber) {
          return { ...prev, packages: prev.packages.filter((p) => p.trackingNumber !== target.trackingNumber) }
        }
      }
      return { ...prev, packages: prev.packages.filter((p) => (p.dhlUniqueId || p.trackingNumber) !== identifier) }
    })
  }, [groupRemesas])

  // Adaptamos los paquetes locales al formato estandarizado (mismo estilo que inventario/entradas).
  // En DHL, varias guías con el mismo trackingNumber y distinto dhlUniqueId se agrupan como una remesa.
  const listPackages = useMemo(() => {
    const mapped = sortedPackages.map(toPackageInfo)
    return groupRemesas ? groupRemittances(mapped) : mapped
  }, [sortedPackages, groupRemesas])

  const handleCompleteSession = async () => {
    setIsScanning(true);
    
    try {
      const payload = {
        warehouse: effectiveWarehouseId,
        shipments: session.packages.map(pkg => ({
          id: pkg.id,
          trackingNumber: pkg.trackingNumber,
          shipmentType: pkg.shipmentType,
          isCharge: pkg.isCharge || false,
          remittances: (pkg.pieces || []).map(pieceTracking => ({
            pieceTrackingNumber: pieceTracking,
            shipmentId: pkg.id 
          }))
        })),
        vehicle: typeof session.vehicle?.id === 'object' && session.vehicle?.id !== null
          ? (session.vehicle.id as any).id 
          : (session.vehicle?.id || ""), 
        drivers: session.drivers.map(driver => {
          if (typeof driver.id === 'object' && driver.id !== null) {
            return String((driver.id as any).id);
          }
          return String(driver.id);
        }),
        type: session.outputType,

        // === PROPIEDADES CONDICIONALES ===

        // Solo se agrega kms y routes si el tipo es 'dispatch'
        ...(session.outputType === OutboundTypeEnum.DISPATCH && {
          kms: selectedKms ? Number(selectedKms) : undefined,
          routes: selectedRutas.map(r => 
            typeof r.id === 'object' && r.id !== null ? String((r.id as any).id) : String(r.id)
          )
        }),

        // Solo se agrega destinationId si el tipo es 'transfer'
        ...(session.outputType === OutboundTypeEnum.TRANSFER && {
          destinationId: session.destinationSubsidiary
        })
      };

      await saveWarehouseOutbound(payload);
      
      console.log("Payload de salida:", payload);
      safeSpeak("Salida guardada con exito");
      
      setSession({
        id: crypto.randomUUID(),
        vehicle: null,
        startTime: new Date(),
        deliveredByName: "",
        receivedByName: "",
        packages: [],
        status: "En Proceso",
        drivers: [],
        routes: [],
        initialKms: null,
        outputType: OutboundTypeEnum.DISPATCH,
        destinationSubsidiary: ""
      });
      
      setSelectedRutas([]);
      setSelectedKms(0);

      toggleModal("signatures", false);

    } catch (error) {
      console.error("Error al guardar la salida de bodega:", error);
      safeSpeak("Error al guardar en el servidor");
    } finally {
      setIsScanning(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  return (
    <div className="text-slate-900 min-h-screen pt-4"> 
        <OperationHeader
          icon={PackageMinus}
          title="Salida de Bodega"
          description="Registro y seguimiento de paquetes salientes de la bodega."
          subsidiaryName={effectiveWarehouseName}
          actions={
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full hover:bg-muted"
                      onClick={() => setShowHistory(true)}
                    >
                      <History className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Historial de salidas</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full hover:bg-muted"
                      onClick={() => toggleModal("shortcuts", true)}
                    >
                      <Keyboard className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ver Atajos de Teclado</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="w-full sm:w-[230px]">
                <SucursalSelector
                  value={effectiveWarehouseId}
                  returnObject={true}
                  onlyWarehouses={true}
                  onValueChange={(val) => {
                    const sucursalId = typeof val === 'object' && val !== null ? (val as any).id : val;
                    const sucursalName = typeof val === 'object' && val !== null ? (val as any).name : "";
                    setEffectiveWarehouseName(sucursalName);
                    setSelectedWarehouse(sucursalId);
                  }}
                />
              </div>
            </div>
          }
        />
        
        <Separator className="bg-slate-200" />

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 pt-4">
          <StatCard title="Total" value={totalCount} icon={Package} />
          <div className="rounded-lg border border-slate-200 bg-white p-3 flex flex-col justify-center shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-bold uppercase text-slate-500 tracking-wider">Carrier</span>
              <Truck className="h-4 w-4 text-slate-300" />
            </div>
            <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-[12px] font-bold text-[#4d148c]">FEDEX</p>
                  <p className="text-xl font-bold text-slate-800">{fedexCount}</p>
                </div>
                <Separator orientation="vertical" className="h-8 bg-slate-200" />
                <div className="flex-1 text-right">
                  <p className="text-[12px] font-bold text-[#d40511]">DHL</p>
                  <p className="text-xl font-bold text-slate-800">{dhlCount}</p>
                </div>
            </div>
          </div>
          <StatCard title="Vencen Hoy" value={expiringTodayPackages.length} icon={Clock} alert={expiringTodayPackages.length > 0} onClick={() => expiringTodayPackages.length > 0 && toggleModal("expiringToday", true)} />
          <StatCard title="Alto Valor" value={highValuePackages.length} icon={ShieldAlert} alert={highValuePackages.length > 0} onClick={() => highValuePackages.length > 0 && toggleModal("highValue", true)} />
          <StatCard title="Carga" value={cargoPackages.length} icon={Box} />
          <StatCard 
            title="Cobros" 
            value={packagesWithCharges.length} 
            subValue={`$${totalChargesAmount.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`} 
            icon={DollarSign} 
            alert={packagesWithCharges.length > 0} 
            onClick={() => packagesWithCharges.length > 0 && toggleModal("charges", true)} 
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pt-6">
          
          <div className="xl:col-span-8 space-y-6">
            <Card className="border-none shadow-none bg-transparent">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-800">Inventario de Salida</h2>
                </div>
                <RemittanceGroupToggle grouped={groupRemesas} onToggle={() => setGroupRemesas((v) => !v)} />
              </div>
              
              <CardContent className="p-0 overflow-hidden">
                <PackagesList
                  packages={listPackages}
                  onRemove={handleRemovePackage}
                  renderExpanded={(pkg) => (hasRemittancePieces(pkg) ? <RemittancePiecesPanel pkg={pkg} /> : null)}
                  maxHeightClass="max-h-[640px]"
                  emptyTitle="Sin paquetes escaneados"
                  emptyDescription="Escanee un código de barras para comenzar la salida."
                />
              </CardContent>
            </Card>
          </div>

          <div className="xl:col-span-4 space-y-4">
            {/** Tipo de Salida */}
            <Card className="border-orange-200">
              <CardContent className="space-y-4">
                <Label className="font-bold text-slate-800 uppercase text-xs tracking-wider flex items-center gap-2">
                  <Send className="w-4 h-4 text-orange-600" />
                  Tipo de Salida
                </Label>
                
                <RadioGroup 
                  value={session.outputType} 
                  onValueChange={(value: OutboundTypeEnum) => setSession(s => ({...s, outputType: value, destinationSubsidiary: value === OutboundTypeEnum.DISPATCH ? "" : s.destinationSubsidiary}))}
                  className="grid grid-cols-2 gap-3"
                >
                  <div className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${session.outputType === OutboundTypeEnum.DISPATCH ? "border-orange-500 bg-orange-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <RadioGroupItem value={OutboundTypeEnum.DISPATCH} id="ruta" />
                    <Label htmlFor="ruta" className="flex items-center gap-2 cursor-pointer font-medium">
                      <Route className="w-4 h-4 text-orange-600" />
                      Salida a Ruta
                    </Label>
                  </div>
                  <div className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${session.outputType === OutboundTypeEnum.TRANSFER ? "border-orange-500 bg-orange-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <RadioGroupItem value={OutboundTypeEnum.TRANSFER} id="traspaso" />
                    <Label htmlFor="traspaso" className="flex items-center gap-2 cursor-pointer font-medium">
                      <ArrowRightLeft className="w-4 h-4 text-orange-600" />
                      Traspaso
                    </Label>
                  </div>
                </RadioGroup>

                {session.outputType === OutboundTypeEnum.DISPATCH && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <Label className="text-[12px] font-semibold text-slate-600 flex items-center gap-1.5">
                        <GaugeIcon className="w-3.5 h-3.5" />
                        Kilometraje Inicial
                      </Label>

                      <Input
                        type="text"
                        value={selectedKms ?? ""}
                        onChange={(e) => setSelectedKms(e.target.value ? Number(e.target.value) : null)}
                        placeholder="Ingresa el kilometraje"
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100">
                      <Label className="text-[12px] font-semibold text-slate-600 flex items-center gap-1.5">
                        <Route className="w-3.5 h-3.5" />
                        Rutas
                      </Label>

                      <RutaSelector
                        selectedRutas={selectedRutas}
                        onSelectionChange={setSelectedRutas}
                        subsidiaryId={operationalSubsidiaryId}
                      />
                    </div>

                  </div>
                )}

                {session.outputType === OutboundTypeEnum.TRANSFER && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <Label className="text-[12px] font-semibold text-slate-600 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      Sucursal Destino
                    </Label>
                    <SucursalSelector
                      value={session.destinationSubsidiary || ""}
                      returnObject={true}
                      onValueChange={(val) => {
                        const sucursalId = typeof val === 'object' && val !== null ? (val as any).id : val;
                        const sucursalName = typeof val === 'object' && val !== null ? (val as any).name : "";
                        setSession(s => ({...s, destinationSubsidiary: sucursalId, destinationSubsidiaryName: sucursalName}));
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/** Escaner */}
            <Card className="border-orange-200">
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-orange-600 mb-2">
                  <span className="text-sm font-bold uppercase tracking-wide">Escaner de Salida</span>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                    <Input
                      ref={inputRef}
                      type="text"
                      placeholder="Codigo de barras..."
                      value={scanInput}
                      onChange={(e) => setScanInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                      className="h-12 text-base pl-10 pr-10 font-mono border-slate-300 focus-visible:ring-orange-500 shadow-sm"
                      disabled={isScanning}
                    />
                    {scanInput && (
                      <button
                        onClick={() => {
                          setScanInput('')
                          inputRef.current?.focus()
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <Button 
                    onClick={handleScan}
                    disabled={!scanInput.trim() || isScanning}
                    className="h-12 px-5 bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    {isScanning ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ...
                      </span>
                    ) : (
                      'Agregar'
                    )}
                  </Button>
                </div>  

                {error && (
                  <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded-md flex items-start gap-2 border border-red-100 shadow-sm animate-in fade-in slide-in-from-top-1">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> 
                    <span className="font-medium">{error}</span>
                  </div>
                )}

              </CardContent>
            </Card>

            {/** Asignacion de Salida */}
            <Card className="border-orange-200">
              <CardContent className="space-y-4">
                <Label className="font-bold text-slate-800 uppercase text-xs tracking-wider">Asignacion de Transporte</Label>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-semibold text-slate-600">Unidad de Traslado</Label>
                    <UnidadSelector
                      selectedUnidad={session.vehicle?.id || ""}
                      onSelectionChange={(id) => setSession(s => ({...s, vehicle: { id } as Vehicles }))}
                      subsidiaryId={operationalSubsidiaryId}
                    />
                  </div>
                  <Separator className="bg-slate-100" />
                  <div className="space-y-1.5">
                    <Label className="text-[12px] font-semibold text-slate-600">Chofer Asignado</Label>
                    <RepartidorSelector
                      selectedRepartidores={session.drivers.map(d => d.id)}
                      onSelectionChange={(ids) => setSession(s => ({...s, drivers: ids.map(id => ({ id } as Driver))}))}
                      subsidiaryId={operationalSubsidiaryId}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/** Finalizar Salida */}
            <Card className="border-orange-200">
              <CardContent className="space-y-3">
                {!isReadyToFinish && (
                  <p className="text-[11px] text-amber-700 font-medium bg-amber-100/50 p-2.5 rounded-md flex items-start gap-2 leading-tight border border-amber-200">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> 
                    {session.outputType === OutboundTypeEnum.TRANSFER 
                      ? "Seleccione Bodega origen, Sucursal destino, Unidad, Chofer y escanee paquetes para habilitar el cierre."
                      : "Seleccione Bodega, Unidad, Rutas, Kilometraje Inicial y Chofer además escanee paquetes para habilitar el cierre."
                    }
                  </p>
                )}
                
                <Button 
                  onClick={() => toggleModal("signatures", true)} 
                  disabled={!isReadyToFinish} 
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white shadow-sm h-12 text-sm font-bold tracking-wide"
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" /> FINALIZAR SALIDA
                </Button>
              </CardContent>
            </Card>
          </div>
      </div>

      {/* Dialog para remesas DHL */}
      <Dialog 
        open={remittanceDialog.isOpen} 
        onOpenChange={(v) => {
          setRemittanceDialog(prev => ({...prev, isOpen: v}))
          if (!v) setTimeout(() => inputRef.current?.focus(), 100)
        }}
      >
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800">
              <HelpCircle className="w-5 h-5 text-orange-600" />
              Guia Duplicada Detectada
            </DialogTitle>
          </DialogHeader>

          {remittanceDialog.step === "confirm" ? (
            <div className="space-y-4 py-3">
              <p className="text-sm text-slate-600">
                El numero de guia <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">{remittanceDialog.masterTracking}</span> ya fue ingresado a la lista. 
              </p>
              <p className="text-sm font-semibold text-slate-700">
                Desea abrir esta guia para agregar piezas de remesa?
              </p>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setRemittanceDialog(prev => ({...prev, isOpen: false}))}>No, Cancelar</Button>
                <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => setRemittanceDialog(prev => ({...prev, step: "scan"}))}>
                  Si, es una Remesa
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <DialogDescription>
                Escanee los codigos de barras de las piezas correspondientes a la guia <strong className="font-mono text-slate-800">{remittanceDialog.masterTracking}</strong>.
              </DialogDescription>
              
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Codigo de Pieza</Label>
                <div className="relative">
                  <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    ref={pieceInputRef}
                    placeholder="Ej. JJD014600012624033086"
                    value={remittanceDialog.pieceInput}
                    onChange={(e) => setRemittanceDialog(prev => ({...prev, pieceInput: e.target.value}))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handlePieceScan(); } }}
                    className="pl-9 font-mono text-sm border-orange-200 focus-visible:ring-orange-500 h-11"
                  />
                </div>
                <p className="text-[11px] text-slate-500">Presione ENTER despues de escanear cada pieza para agregarla a la lista.</p>
              </div>

              {remittanceDialog.error && (
                <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded-md flex items-center gap-2 border border-red-100 shadow-sm">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" /> 
                  <span className="font-medium">{remittanceDialog.error}</span>
                </div>
              )}

              <DialogFooter className="mt-6 border-t border-slate-100 pt-4">
                <Button variant="outline" onClick={() => setRemittanceDialog(prev => ({...prev, isOpen: false}))}>Terminar y Cerrar</Button>
                <Button className="bg-orange-600 hover:bg-orange-700" onClick={handlePieceScan}>Agregar Manualmente</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={modals.shortcuts} onOpenChange={(v) => toggleModal("shortcuts", v)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-slate-800"><Keyboard className="w-5 h-5"/> Atajos de Teclado</DialogTitle></DialogHeader>
          <div className="grid gap-2 py-3">
            {[
              { key: "F1", action: "Enfocar campo de Escaner" },
              { key: "F2", action: "Abrir ventana de Finalizar Salida" },
              { key: "F3", action: "Buscar en listado (Guia o CP)" },
              { key: "ESC", action: "Cerrar modales o ventanas" },
            ].map(({ key, action }) => (
              <div key={key} className="flex justify-between items-center text-sm border-b pb-2.5 pt-1 last:border-0 border-slate-100">
                <kbd className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-slate-700 font-mono text-xs shadow-sm font-bold">{key}</kbd>
                <span className="text-slate-600 text-xs font-medium">{action}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <DetailModal 
        open={modals.expiringToday} 
        onOpenChange={(val: boolean) => toggleModal("expiringToday", val)}
        title="Paquetes que Vencen Hoy"
        description="Lista de paquetes con urgencia critica para hoy."
        packages={expiringTodayPackages}
      />

      <DetailModal 
        open={modals.highValue} 
        onOpenChange={(val: boolean) => toggleModal("highValue", val)}
        title="Paquetes de Alto Valor"
        description="Requieren manejo de seguridad especial."
        packages={highValuePackages}
      />

      <DetailModal 
        open={modals.charges} 
        onOpenChange={(val: boolean) => toggleModal("charges", val)}
        title="Cobros Pendientes"
        description={`Monto Total a Cobrar: $${totalChargesAmount.toLocaleString()} MXN`}
        packages={packagesWithCharges}
      />

      <Dialog open={modals.signatures} onOpenChange={(v) => toggleModal("signatures", v)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              {session.outputType === OutboundTypeEnum.DISPATCH ? <Route className="w-5 h-5 text-orange-600" /> : <ArrowRightLeft className="w-5 h-5 text-blue-600" />}
              {session.outputType === OutboundTypeEnum.DISPATCH ? "Cerrar Salida a Ruta" : "Cerrar Traspaso a Sucursal"}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Confirme quien entrega y quien recibe la mercancia para habilitar la descarga del PDF y guardar el registro de la sesion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            {session.outputType === OutboundTypeEnum.TRANSFER && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Destino: {session.destinationSubsidiaryName || session.destinationSubsidiary || "Sin seleccionar"}
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Entregado por (Bodega)</Label>
              <Input 
                value={derivedDriverName} 
                readOnly
                className="bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed font-medium h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {session.outputType === OutboundTypeEnum.DISPATCH ? "Recibido por (Chofer)" : "Recibido por (Sucursal Destino)"}
              </Label>
              <Input 
                value={session.receivedByName} 
                onChange={(e) => setSession({...session, receivedByName: e.target.value})} 
                placeholder="Nombre completo..."
                autoFocus
                className="h-11 border-slate-300 focus-visible:ring-orange-500"
              />
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-2 border-t border-slate-100 pt-4">
            <Button variant="ghost" className="w-full sm:w-auto text-slate-500 hover:text-slate-700 hover:bg-slate-100" onClick={() => toggleModal("signatures", false)}>
              Cancelar
            </Button>
            
            {isClient && canSaveAndGeneratePDF ? (
              <PDFDownloadLink 
                document={
                  <PackageEntryPDF 
                    session={{...session, enteredByName: derivedDriverName}} 
                    vehiculo={session.vehicle} 
                  />
                } 
                fileName={`salida-${session.outputType}-${new Date().toISOString().split('T')[0]}.pdf`}
                className="w-full sm:w-auto"
              >
                {({ loading }) => (
                  <Button variant="outline" className="w-full h-10 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold" disabled={loading}>
                    <Download className="mr-2 h-4 w-4" /> PDF
                  </Button>
                )}
              </PDFDownloadLink>
            ) : (
              <Button variant="outline" className="w-full sm:w-auto h-10 border-slate-200 text-slate-400" disabled>
                <Download className="mr-2 h-4 w-4" /> PDF
              </Button>
            )}

            <Button 
              onClick={handleCompleteSession} 
              disabled={!canSaveAndGeneratePDF}
              className="w-full sm:w-auto h-10 bg-orange-600 hover:bg-orange-700 text-white font-bold tracking-wide shadow-sm"
            >
              Confirmar y Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WarehouseHistoryDialog
        open={showHistory}
        onOpenChange={setShowHistory}
        kind="outbound"
        subsidiaryId={effectiveWarehouseId}
        subsidiaryName={effectiveWarehouseName}
      />
    </div>
  )
}

function StatCard({ title, value, subValue, icon: Icon, alert = false, onClick }: any) {
  return (
    <div onClick={onClick} className={`rounded-xl border p-3.5 shadow-sm transition-all duration-200 ${alert ? "border-red-200 bg-red-50/80 cursor-pointer hover:bg-red-100 hover:border-red-300" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${alert ? "text-red-700" : "text-slate-500"}`}>{title}</span>
        <div className={`p-1.5 rounded-md ${alert ? "bg-red-100" : "bg-slate-50"}`}>
          <Icon className={`h-4 w-4 ${alert ? "text-red-600" : "text-slate-400"}`} />
        </div>
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <p className={`text-2xl font-black ${alert ? "text-red-700" : "text-slate-800"}`}>{value}</p>
        {subValue && <p className="text-[11px] text-slate-500 font-semibold">{subValue}</p>}
      </div>
    </div>
  )
}

function DetailModal({ open, onOpenChange, title, description, packages }: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl text-slate-800">{title}</DialogTitle>
          <DialogDescription className="text-slate-500">{description}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[450px] overflow-auto border border-slate-200 rounded-lg shadow-inner mt-2">
          <Table>
            <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="font-bold text-slate-600">Guia / Piezas</TableHead>
                <TableHead className="font-bold text-slate-600">Destinatario</TableHead>
                <TableHead className="font-bold text-slate-600">Carrier</TableHead>
                <TableHead className="text-right font-bold text-slate-600">Info</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg: any) => (
                <TableRow key={pkg.id} className="hover:bg-slate-50/50">
                  <TableCell>
                    <span className="font-mono text-sm font-bold text-slate-700">{pkg.trackingNumber}</span>
                    {pkg.pieces && pkg.pieces.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {pkg.pieces.map((p: string) => (
                          <Badge key={p} variant="outline" className="text-[10px] font-mono bg-slate-100 text-slate-500">{p}</Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-800">{pkg.recipientName || 'S/N'}</span>
                      <span className="text-[10px] text-slate-500 truncate max-w-[200px]" title={pkg.recipientAddress}>{pkg.recipientAddress}</span>
                    </div>
                  </TableCell>
                  <TableCell className="uppercase text-[10px] font-bold text-slate-600">{pkg.shipmentType}</TableCell>
                  <TableCell className="text-right text-[11px] font-semibold text-slate-700">
                    {pkg.hasPayment ? <span className="text-amber-600">${Number(pkg.paymentAmount).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span> : <span className="text-green-600">OK</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
