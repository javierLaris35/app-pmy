'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  Package,
  ScanBarcode,
  X,
  AlertCircle,
  Keyboard,
  History,
  Search,
  Home,
  PackageCheck,
  GemIcon,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  getTrackingNumberInfo,
  savePackageReception,
  PickUpType,
} from '@/lib/services/package-reception/package-reception'
import { SucursalSelector } from '@/components/sucursal-selector'
import { useAuthStore } from '@/store/auth.store'
import { OperationHeader } from '@/components/shared/operation-header'
import { StatBar, StatItem } from '@/components/shared/stat-bar'
import { PackagesPanelHeader } from '@/components/shared/packages-panel-header'
import { PackageListItem } from '@/components/shared/package-list-item'
import { WeekRangePicker } from '@/components/shared/week-range-picker'
import { getWeekRange, WeekRange } from '@/lib/week'
import { usePickUpHistory } from '@/hooks/services/pick-up/use-pick-up-history'
import { useToast } from '@/components/ui/use-toast'
import { PackageInfo } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ScannedPackage {
  shipmentId?: string | null
  chargeShipmentId?: string | null
  trackingNumber: string
  shipmentType: string
  isCharge: boolean
  isHighValue: boolean
  priority: string
  recipientName: string
  recipientAddress: string
  recipientPhone: string
  recipientZip: string
  commitDateTime: string | Date
}

/** Los dos tipos de registro que maneja este módulo. */
const TYPE_OPTIONS: { value: PickUpType; label: string; icon: React.ElementType }[] = [
  { value: 'ocurre', label: 'Ocurre', icon: Home },
  { value: 'entrega_bodega', label: 'Entrega en bodega', icon: PackageCheck },
]

const typeLabel = (t: PickUpType | null) => TYPE_OPTIONS.find((o) => o.value === t)?.label ?? '—'

export default function PackageReception() {
  const { toast } = useToast()
  const user = useAuthStore((s) => s.user)
  const hasHydrated = useAuthStore((s) => s.hasHydrated)

  // Sucursal (selector obligatorio, igual que los demás módulos)
  const [selectedSucursalId, setSelectedSucursalId] = useState<string | null>(null)
  const [selectedSucursalName, setSelectedSucursalName] = useState<string>('')
  const effectiveSucursalId = hasHydrated
    ? selectedSucursalId || user?.subsidiary?.id || user?.subsidiaryId || null
    : null
  const effectiveSucursalName = hasHydrated
    ? selectedSucursalName || user?.subsidiary?.name || user?.subsidiaryName || ''
    : ''

  useEffect(() => {
    if (hasHydrated && user?.subsidiary?.id && !selectedSucursalId) {
      setSelectedSucursalId(user.subsidiary.id)
      setSelectedSucursalName(user.subsidiary.name || '')
    } else if (hasHydrated && user?.subsidiaryId && !selectedSucursalId && !user?.subsidiary?.id) {
      setSelectedSucursalId(user.subsidiaryId)
      setSelectedSucursalName(user.subsidiaryName || '')
    }
  }, [hasHydrated, user, selectedSucursalId])

  const handleSucursalChange = (id: string, name?: string) => {
    setSelectedSucursalId(id || null)
    setSelectedSucursalName(name || '')
  }

  // Tipo activo (define a qué lista van los escaneos y cuál se muestra).
  const [pickUpType, setPickUpType] = useState<PickUpType>('entrega_bodega')

  // Dos listas persistentes: cambiar de tipo NO pierde la otra.
  const [lists, setLists] = useState<Record<PickUpType, ScannedPackage[]>>({
    ocurre: [],
    entrega_bodega: [],
  })

  const [scanInput, setScanInput] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const activeList = lists[pickUpType]
  const counts = { ocurre: lists.ocurre.length, entrega_bodega: lists.entrega_bodega.length }
  const total = counts.ocurre + counts.entrega_bodega

  useEffect(() => {
    if (!showConfirmDialog && !showShortcuts && !showHistory) inputRef.current?.focus()
  }, [showConfirmDialog, showShortcuts, showHistory])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'F1') {
        e.preventDefault()
        inputRef.current?.focus()
      } else if (e.key === 'F2' && total > 0) {
        e.preventDefault()
        setShowConfirmDialog(true)
      } else if (e.key === 'Escape') {
        setShowConfirmDialog(false)
        setShowShortcuts(false)
      } else if (e.key === '?') {
        setShowShortcuts(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [total])

  const handleScan = useCallback(async () => {
    if (!scanInput.trim()) return
    if (!effectiveSucursalId) {
      setError('Selecciona una sucursal antes de escanear.')
      return
    }

    const trackingNumber = scanInput.trim().toUpperCase()

    // Dedup CRUZADO: una guía solo puede estar en UNA de las dos listas.
    const existsIn = lists.ocurre.some((p) => p.trackingNumber === trackingNumber)
      ? 'ocurre'
      : lists.entrega_bodega.some((p) => p.trackingNumber === trackingNumber)
      ? 'entrega_bodega'
      : null
    if (existsIn) {
      setError(`Este paquete ya está en la lista de ${typeLabel(existsIn as PickUpType)}.`)
      setScanInput('')
      inputRef.current?.focus()
      return
    }

    setIsScanning(true)
    setError(null)

    try {
      const info: any = await getTrackingNumberInfo(trackingNumber)
      const newPackage: ScannedPackage = {
        shipmentId: info.isCharge ? null : info.id,
        chargeShipmentId: info.isCharge ? info.id : null,
        trackingNumber,
        shipmentType: info?.shipmentType || 'fedex',
        isCharge: info?.isCharge || false,
        isHighValue: info?.isHighValue || false,
        priority: info?.priority || 'baja',
        recipientName: info?.recipientName || '—',
        recipientAddress: info?.recipientAddress || '—',
        recipientPhone: info?.recipientPhone || '',
        recipientZip: info?.recipientZip || '',
        commitDateTime: info?.commitDateTime || new Date(),
      }
      setLists((prev) => ({ ...prev, [pickUpType]: [newPackage, ...prev[pickUpType]] }))
    } catch (err: any) {
      const status = err?.response?.status
      setError(
        status === 404
          ? `No se encontró la guía ${trackingNumber} en el sistema.`
          : 'Error al consultar la guía. Intenta de nuevo.'
      )
    }

    setScanInput('')
    setIsScanning(false)
    inputRef.current?.focus()
  }, [scanInput, lists, pickUpType, effectiveSucursalId])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleScan()
  }

  const handleRemovePackage = useCallback(
    (trackingNumber: string) => {
      setLists((prev) => ({
        ...prev,
        [pickUpType]: prev[pickUpType].filter((p) => p.trackingNumber !== trackingNumber),
      }))
      setTimeout(() => inputRef.current?.focus(), 0)
    },
    [pickUpType]
  )

  const handleConfirm = async () => {
    if (!effectiveSucursalId) {
      toast({ title: 'Error', description: 'Selecciona una sucursal antes de registrar.', variant: 'destructive' })
      return
    }
    setShowConfirmDialog(false)
    setIsSaving(true)
    try {
      // Guarda AMBAS listas en un solo envío, con el tipo por paquete.
      const items = (['ocurre', 'entrega_bodega'] as PickUpType[]).flatMap((t) =>
        lists[t].map((p) => ({
          trackingNumber: p.trackingNumber,
          type: t,
          shipmentId: p.shipmentId ?? null,
          chargeShipmentId: p.chargeShipmentId ?? null,
        }))
      )
      await savePackageReception({ subsidiaryId: effectiveSucursalId, items })
      setShowSuccess(true)
      toast({
        title: 'Registro exitoso',
        description: `${total} paquete(s): ${counts.ocurre} ocurre, ${counts.entrega_bodega} entrega.`,
      })
      setTimeout(() => {
        setShowSuccess(false)
        setLists({ ocurre: [], entrega_bodega: [] })
        inputRef.current?.focus()
      }, 1500)
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'No se pudo completar el registro. Intenta de nuevo.'
      toast({ title: 'Error al registrar', description: String(msg), variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  // Mapeo a PackageInfo para reusar el item estandarizado (lista activa).
  const listPackages = useMemo<PackageInfo[]>(
    () =>
      activeList.map(
        (p) =>
          ({
            id: p.trackingNumber,
            trackingNumber: p.trackingNumber,
            shipmentType: p.shipmentType,
            recipientName: p.recipientName,
            recipientAddress: p.recipientAddress,
            recipientPhone: p.recipientPhone,
            recipientZip: p.recipientZip,
            commitDateTime:
              typeof p.commitDateTime === 'string' ? p.commitDateTime : new Date(p.commitDateTime).toISOString(),
            isCharge: p.isCharge,
            isHighValue: p.isHighValue,
            priority: p.priority,
            isValid: true,
            isPendingValidation: false,
          } as unknown as PackageInfo)
      ),
    [activeList]
  )

  const stats = useMemo<StatItem[]>(() => {
    const all = [...lists.ocurre, ...lists.entrega_bodega]
    const charge = all.filter((p) => p.isCharge).length
    const highValue = all.filter((p) => p.isHighValue).length
    return [
      { label: 'Ocurre', value: counts.ocurre, valueClassName: 'text-amber-600', icon: Home },
      { label: 'Entrega', value: counts.entrega_bodega, valueClassName: 'text-green-600', icon: PackageCheck },
      { label: 'Total', value: total, icon: Package },
      { label: 'Carga / F2', value: charge, valueClassName: 'text-green-600' },
      { label: 'Alto valor', value: highValue, valueClassName: 'text-violet-600', icon: GemIcon },
    ]
  }, [lists, counts.ocurre, counts.entrega_bodega, total])

  const canConfirm = total > 0 && !!effectiveSucursalId && !isScanning && !isSaving && !showSuccess

  if (!hasHydrated) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-3">
        <OperationHeader
          icon={PackageCheck}
          title="Registro Ocurre / Entrega en Bodega"
          description="Escanea y registra paquetes que quedan en sucursal"
          subsidiaryName={effectiveSucursalName}
          actions={
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="w-[220px]">
                <SucursalSelector
                  value={selectedSucursalId || user?.subsidiary?.id || user?.subsidiaryId || ''}
                  returnObject={true}
                  onValueChange={(val) => {
                    if (typeof val === 'string') handleSucursalChange(val)
                    else if (Array.isArray(val)) {
                      const first = val[0] as any
                      handleSucursalChange(first?.id ?? '', first?.name ?? '')
                    } else if (val && typeof val === 'object') {
                      handleSucursalChange((val as any).id, (val as any).name)
                    }
                  }}
                />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setShowHistory(true)}>
                    <History className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Historial</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setShowShortcuts(true)}>
                    <Keyboard className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Atajos de teclado (?)</TooltipContent>
              </Tooltip>
            </div>
          }
        />

        {total > 0 && <StatBar items={stats} />}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Columna izquierda: tipo + escaneo + confirmar */}
          <div className="xl:col-span-1 space-y-4">
            <Card>
              <CardContent className="space-y-4 pt-6">
                {/* Tipo de registro (a qué lista van los escaneos) + contador por tipo */}
                <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
                  {TYPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon
                    const active = pickUpType === opt.value
                    const count = counts[opt.value]
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPickUpType(opt.value)}
                        className={cn(
                          'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs sm:text-sm font-medium transition-colors',
                          active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {opt.label}
                        {count > 0 && (
                          <span
                            className={cn(
                              'ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold',
                              active ? 'bg-primary text-primary-foreground' : 'bg-foreground/10 text-foreground'
                            )}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <ScanBarcode className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Escanear paquete</span>
                  <Badge variant="secondary" className="ml-auto text-[10px] hidden sm:inline-flex">F1</Badge>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder={effectiveSucursalId ? 'Escanea o ingresa el tracking...' : 'Selecciona una sucursal'}
                    value={scanInput}
                    onChange={(e) => setScanInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="h-11 pl-9 pr-9 font-mono"
                    disabled={isScanning || !effectiveSucursalId}
                  />
                  {scanInput && (
                    <button
                      onClick={() => {
                        setScanInput('')
                        inputRef.current?.focus()
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <Button onClick={handleScan} disabled={!scanInput.trim() || isScanning || !effectiveSucursalId} variant="outline" className="w-full gap-2">
                  {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanBarcode className="h-4 w-4" />}
                  {isScanning ? 'Consultando...' : 'Agregar'}
                </Button>

                {error && (
                  <div className="flex items-center gap-2 p-2.5 rounded-md bg-destructive/10 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  disabled={!canConfirm}
                  className={cn('w-full gap-2', showSuccess && 'bg-green-600 hover:bg-green-600 text-white')}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {showSuccess ? 'Registro confirmado' : `Confirmar registro (${total})`}
                  {!showSuccess && <Badge variant="secondary" className="ml-1 text-[10px] hidden sm:inline-flex">F2</Badge>}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Columna derecha: lista estandarizada */}
          <div className="xl:col-span-2 space-y-3">
            <PackagesPanelHeader
              title="Paquetes escaneados"
              subtitle={
                <>
                  Tipo: <span className="font-medium">{typeLabel(pickUpType)}</span>
                </>
              }
            />

            {listPackages.length > 0 ? (
              <div className="max-h-[480px] overflow-y-auto rounded-md border">
                <div className="grid grid-cols-1 divide-y">
                  {listPackages.map((pkg) => (
                    <PackageListItem key={pkg.trackingNumber} pkg={pkg} onRemove={handleRemovePackage} isLoading={isSaving} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 border-2 border-dashed border-muted rounded-lg">
                <Package className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-1">Sin paquetes escaneados</h3>
                <p className="text-muted-foreground text-sm">Escanea un código de barras para comenzar</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Confirmar registro
            </DialogTitle>
            <DialogDescription>
              Vas a registrar {total} paquete{total !== 1 ? 's' : ''} en {effectiveSucursalName || 'la sucursal'}.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground"><Home className="h-3.5 w-3.5" /> Ocurre:</span>
              <span className="font-medium">{counts.ocurre}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground"><PackageCheck className="h-3.5 w-3.5" /> Entrega en bodega:</span>
              <span className="font-medium">{counts.entrega_bodega}</span>
            </div>
            <div className="flex justify-between text-sm border-t pt-3">
              <span className="text-muted-foreground">Sucursal:</span>
              <span className="font-medium">{effectiveSucursalName || '-'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium">{total}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancelar</Button>
            <Button onClick={handleConfirm} className="gap-2">
              <CheckCircle2 className="w-4 h-4" /> Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <PickUpHistoryDialog
        open={showHistory}
        onOpenChange={setShowHistory}
        subsidiaryId={effectiveSucursalId}
        subsidiaryName={effectiveSucursalName}
      />

      {/* Shortcuts Dialog */}
      <Dialog open={showShortcuts} onOpenChange={setShowShortcuts}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-primary" />
              Atajos de teclado
            </DialogTitle>
            <DialogDescription>Usa estos atajos para trabajar más rápido.</DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            {[
              ['Enfocar campo de escaneo', 'F1'],
              ['Confirmar registro', 'F2'],
              ['Escanear paquete', 'Enter'],
              ['Cerrar diálogo', 'Esc'],
              ['Mostrar atajos', '?'],
            ].map(([label, key]) => (
              <div key={key} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <span className="text-sm">{label}</span>
                <Badge variant="outline">{key}</Badge>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowShortcuts(false)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}

/** Diálogo de historial de lo registrado en bodega (semana + paginado). */
function PickUpHistoryDialog({
  open,
  onOpenChange,
  subsidiaryId,
  subsidiaryName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  subsidiaryId: string | null
  subsidiaryName?: string
}) {
  const [week, setWeek] = useState<WeekRange>(() => getWeekRange())
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<'all' | PickUpType>('all')
  const limit = 50

  useEffect(() => {
    if (open) setPage(1)
  }, [open, week.from, week.to, typeFilter])

  const { history, total, totalPages, isLoading, isError } = usePickUpHistory(
    subsidiaryId,
    { page, limit, from: week.from, to: week.to, type: typeFilter !== 'all' ? typeFilter : undefined },
    open
  )

  const TYPE_FILTERS: { value: 'all' | PickUpType; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'ocurre', label: 'Ocurre' },
    { value: 'entrega_bodega', label: 'Entrega' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Historial de bodega
          </DialogTitle>
          <DialogDescription>
            Paquetes registrados en {subsidiaryName || 'la sucursal'} durante la semana seleccionada.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setTypeFilter(f.value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  typeFilter === f.value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{total} registro(s)</span>
            <WeekRangePicker value={week} onChange={setWeek} disabled={isLoading} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto rounded-md border">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : isError ? (
            <div className="flex h-40 items-center justify-center text-red-600 text-sm">Error al cargar el historial</div>
          ) : history.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-muted-foreground">
              <Package className="h-8 w-8 opacity-40 mb-2" />
              <p className="text-sm">Sin registros en la semana seleccionada</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 backdrop-blur-sm text-left">
                <tr className="border-b">
                  <th className="px-3 py-2 font-medium">Guía</th>
                  <th className="px-3 py-2 font-medium">Destinatario</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2 font-mono">{row.trackingNumber}</td>
                    <td className="px-3 py-2 truncate max-w-[220px]">{row.recipientName || '—'}</td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary" className="text-[11px]">{typeLabel(row.type)}</Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.date
                        ? new Date(row.date).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || isLoading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages || isLoading} onClick={() => setPage((p) => p + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
