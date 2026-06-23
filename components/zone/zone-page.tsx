"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  MapPin,
  Plus,
  Search,
  Edit2,
  Trash2,
  Building2,
  Calendar,
  User,
  ChevronRight,
  Settings2,
  Check,
  AlertCircle,
  Loader2,
  GripVertical,
} from "lucide-react"
import { Separator } from "../ui/separator"
import { OperationHeader } from "@/components/shared/operation-header"
import type { Subsidiary, Zone } from "@/lib/types"
import { useZones } from "@/hooks/services/zones/use-zones"
import { createZone, updateZone, deleteZone } from "@/lib/services/zones"
import { useSubsidiaries, useSaveSubsidiary } from "@/hooks/services/subsidiaries/use-subsidiaries"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

// MySQL bit -> el front puede recibir Buffer; normalizamos a boolean antes de guardar.
const toBool = (v: any): boolean =>
  v && typeof v === "object" && "data" in v ? v.data?.[0] === 1 : Boolean(v)

/**
 * Chip de sucursal arrastrable. A NIVEL DE MÓDULO (tipo estable) para que un
 * re-render del padre no lo remonte a mitad del arrastre (eso cancelaba el drag).
 */
function SucursalChip({
  sub,
  compact = false,
  isDragging,
  onDragStart,
  onDragEnd,
}: {
  sub: Subsidiary
  compact?: boolean
  isDragging: boolean
  onDragStart: (e: React.DragEvent, sub: Subsidiary) => void
  onDragEnd: () => void
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, sub)}
      onDragEnd={onDragEnd}
      className={cn(
        "flex items-center gap-2 rounded-md border bg-white cursor-grab active:cursor-grabbing transition-shadow hover:shadow-sm select-none",
        compact ? "px-2 py-1 text-xs" : "p-2 text-sm",
        isDragging && "opacity-50"
      )}
      title="Arrastra para asignar a otra zona"
    >
      <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0" />
      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      <span className="flex-1 truncate">{sub.name}</span>
      {toBool(sub.isWarehouse) && (
        <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/30 text-primary">Bodega</Badge>
      )}
    </div>
  )
}

export default function ZonesPage() {
  const { zones, isLoading: zonesLoading, mutate: mutateZones } = useZones()
  const { subsidiaries, mutate: mutateSubs } = useSubsidiaries()
  const { save } = useSaveSubsidiary()

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)

  const [formData, setFormData] = useState({ name: "", description: "" })
  const [selectedSucursales, setSelectedSucursales] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Drag & drop
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null) // zoneId | "unassigned"

  const filteredZones = useMemo(() => {
    if (!searchTerm) return zones
    const term = searchTerm.toLowerCase()
    return zones.filter(
      (z) => z.name.toLowerCase().includes(term) || z.description?.toLowerCase().includes(term)
    )
  }, [zones, searchTerm])

  const getSucursalesForZone = (zoneId: string) => subsidiaries.filter((s: Subsidiary) => s.zoneId === zoneId)
  const unassignedSucursales = useMemo(() => subsidiaries.filter((s: Subsidiary) => !s.zoneId), [subsidiaries])

  // Guarda la sucursal con su nuevo zoneId, normalizando isWarehouse a boolean.
  const persistZone = (sub: Subsidiary, zoneId: string | null) =>
    save({ ...sub, isWarehouse: toBool(sub.isWarehouse), zoneId })

  const handleCreateZone = async () => {
    if (!formData.name.trim()) return
    setIsLoading(true)
    try {
      await createZone({ name: formData.name.trim(), description: formData.description.trim() || undefined })
      await mutateZones()
      setFormData({ name: "", description: "" })
      setShowCreateModal(false)
      toast.success("Zona creada correctamente")
    } catch {
      toast.error("No se pudo crear la zona")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditZone = async () => {
    if (!selectedZone || !formData.name.trim()) return
    setIsLoading(true)
    try {
      await updateZone(selectedZone.id, { name: formData.name.trim(), description: formData.description.trim() || undefined })
      await mutateZones()
      setShowEditModal(false)
      setSelectedZone(null)
      setFormData({ name: "", description: "" })
      toast.success("Zona actualizada")
    } catch {
      toast.error("No se pudo actualizar la zona")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteZone = async () => {
    if (!selectedZone) return
    setIsLoading(true)
    try {
      await deleteZone(selectedZone.id)
      await Promise.all([mutateZones(), mutateSubs()])
      setShowDeleteModal(false)
      setSelectedZone(null)
      toast.success("Zona eliminada")
    } catch {
      toast.error("No se pudo eliminar la zona")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveAssignments = async () => {
    if (!selectedZone) return
    setIsLoading(true)
    try {
      const changes: Promise<unknown>[] = []
      for (const s of subsidiaries as Subsidiary[]) {
        const wasInZone = s.zoneId === selectedZone.id
        const nowSelected = selectedSucursales.includes(s.id!)
        if (nowSelected && s.zoneId !== selectedZone.id) changes.push(persistZone(s, selectedZone.id))
        else if (wasInZone && !nowSelected) changes.push(persistZone(s, null))
      }
      await Promise.all(changes)
      await mutateSubs()
      setShowAssignModal(false)
      setSelectedZone(null)
      setSelectedSucursales([])
      toast.success("Asignaciones guardadas")
    } catch {
      toast.error("No se pudieron guardar las asignaciones")
    } finally {
      setIsLoading(false)
    }
  }

  // Drag & drop: asignar/quitar una sucursal soltándola sobre una zona (o "Sin asignar").
  const handleDropOnTarget = async (target: string | null, subId: string) => {
    setDraggingId(null)
    setDragOverTarget(null)
    if (!subId) return
    const sub = subsidiaries.find((s: Subsidiary) => s.id === subId)
    if (!sub) return
    const newZoneId = target // zoneId o null (unassigned)
    if ((sub.zoneId || null) === newZoneId) return // sin cambio
    try {
      await persistZone(sub, newZoneId)
      await mutateSubs()
      toast.success(
        newZoneId
          ? `${sub.name} asignada a ${zones.find((z) => z.id === newZoneId)?.name ?? "la zona"}`
          : `${sub.name} quedó sin zona`
      )
    } catch {
      toast.error("No se pudo mover la sucursal")
    }
  }

  const openEditModal = (zone: Zone) => {
    setSelectedZone(zone)
    setFormData({ name: zone.name, description: zone.description || "" })
    setShowEditModal(true)
  }
  const openDeleteModal = (zone: Zone) => {
    setSelectedZone(zone)
    setShowDeleteModal(true)
  }
  const openAssignModal = (zone: Zone) => {
    setSelectedZone(zone)
    setSelectedSucursales(getSucursalesForZone(zone.id).map((s) => s.id!))
    setShowAssignModal(true)
  }
  const toggleSucursal = (sucursalId: string) => {
    setSelectedSucursales((prev) =>
      prev.includes(sucursalId) ? prev.filter((id) => id !== sucursalId) : [...prev, sucursalId]
    )
  }

  // Handlers de arrastre. Usamos dataTransfer para el id (robusto) y draggingId
  // solo para el estilo. El chip vive a nivel de módulo (SucursalChip) para que
  // un re-render NO lo remonte a mitad del arrastre.
  const onChipDragStart = (e: React.DragEvent, sub: Subsidiary) => {
    e.dataTransfer.setData("text/plain", sub.id!)
    e.dataTransfer.effectAllowed = "move"
    setDraggingId(sub.id!)
  }
  const onChipDragEnd = () => {
    setDraggingId(null)
    setDragOverTarget(null)
  }

  return (
    <div className="space-y-4">
      {/* Header estándar */}
      <OperationHeader
        icon={MapPin}
        title="Gestión de Zonas"
        description="Agrupa sucursales por zona. Arrastra una sucursal a una zona para asignarla."
        actions={
          <Button onClick={() => { setFormData({ name: "", description: "" }); setShowCreateModal(true) }}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Zona
          </Button>
        }
      />

      {/* Search & Stats */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar zonas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /><strong>{zones.length}</strong> zonas</span>
          <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4" /><strong>{subsidiaries.length - unassignedSucursales.length}</strong> asignadas</span>
          <span className="flex items-center gap-1.5 text-amber-600"><AlertCircle className="w-4 h-4" /><strong>{unassignedSucursales.length}</strong> sin asignar</span>
        </div>
      </div>

      {/* Main */}
      <div>
        {zonesLoading ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando zonas…
          </div>
        ) : filteredZones.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <MapPin className="w-16 h-16 text-muted/30 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">{searchTerm ? "No se encontraron zonas" : "No hay zonas creadas"}</p>
              {!searchTerm && (
                <Button onClick={() => setShowCreateModal(true)} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" /> Crear Zona
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredZones.map((zone) => {
              const zoneSucursales = getSucursalesForZone(zone.id)
              const isOver = dragOverTarget === zone.id
              return (
                <Card
                  key={zone.id}
                  onDragOver={(e) => { e.preventDefault(); setDragOverTarget(zone.id) }}
                  onDragLeave={() => setDragOverTarget((t) => (t === zone.id ? null : t))}
                  onDrop={(e) => { e.preventDefault(); handleDropOnTarget(zone.id, e.dataTransfer.getData("text/plain")) }}
                  className={cn("shadow-md transition-all", isOver ? "ring-2 ring-primary border-primary" : "hover:shadow-lg")}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-primary" />
                          {zone.name}
                        </CardTitle>
                        {zone.description && <CardDescription className="mt-1 line-clamp-2">{zone.description}</CardDescription>}
                      </div>
                      <div className="flex gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditModal(zone)}>
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar zona</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => openDeleteModal(zone)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Eliminar zona</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Sucursales asignadas</Label>
                        <Badge variant="secondary">{zoneSucursales.length}</Badge>
                      </div>
                      {zoneSucursales.length === 0 ? (
                        <p className={cn("text-sm italic rounded-md border border-dashed py-3 text-center", isOver ? "text-primary border-primary" : "text-muted-foreground")}>
                          {isOver ? "Suelta para asignar aquí" : "Arrastra sucursales aquí"}
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {zoneSucursales.map((suc) => (
                            <SucursalChip
                              key={suc.id}
                              sub={suc}
                              isDragging={draggingId === suc.id}
                              onDragStart={onChipDragStart}
                              onDragEnd={onChipDragEnd}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {zone.createdAt ? new Date(zone.createdAt).toLocaleDateString("es-MX") : "—"}
                      </span>
                      {zone.createdBy && (
                        <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />{zone.createdBy.name}</span>
                      )}
                    </div>

                    <Button variant="outline" className="w-full" onClick={() => openAssignModal(zone)}>
                      <Settings2 className="w-4 h-4 mr-2" />
                      Administrar Sucursales
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Sin asignar — también es drop target para quitar la zona */}
        {(unassignedSucursales.length > 0 || draggingId) && (
          <Card
            onDragOver={(e) => { e.preventDefault(); setDragOverTarget("unassigned") }}
            onDragLeave={() => setDragOverTarget((t) => (t === "unassigned" ? null : t))}
            onDrop={(e) => { e.preventDefault(); handleDropOnTarget(null, e.dataTransfer.getData("text/plain")) }}
            className={cn("mt-6 transition-all", dragOverTarget === "unassigned" ? "ring-2 ring-amber-400 border-amber-300 bg-amber-50" : "border-amber-200 bg-amber-50")}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-5 h-5" />
                Sucursales sin asignar ({unassignedSucursales.length})
              </CardTitle>
              <CardDescription className="text-amber-700">Arrastra una sucursal aquí para quitarle la zona.</CardDescription>
            </CardHeader>
            <CardContent>
              {unassignedSucursales.length === 0 ? (
                <p className="text-sm text-amber-700 italic">Todas las sucursales están asignadas.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {unassignedSucursales.map((suc) => (
                    <div key={suc.id} className="w-full sm:w-auto">
                      <SucursalChip
                        sub={suc}
                        compact
                        isDragging={draggingId === suc.id}
                        onDragStart={onChipDragStart}
                        onDragEnd={onChipDragEnd}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Zone Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Zona</DialogTitle>
            <DialogDescription>Crea una nueva zona para agrupar sucursales</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="zone-name">Nombre de la Zona *</Label>
              <Input id="zone-name" placeholder="Ej: Zona Norte" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone-description">Descripción (opcional)</Label>
              <Textarea id="zone-description" placeholder="Describe la zona..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
            <Button onClick={handleCreateZone} disabled={!formData.name.trim() || isLoading}>
              {isLoading ? "Creando..." : "Crear Zona"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Zone Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Zona</DialogTitle>
            <DialogDescription>Modifica los datos de la zona</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-zone-name">Nombre de la Zona *</Label>
              <Input id="edit-zone-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-zone-description">Descripción (opcional)</Label>
              <Textarea id="edit-zone-description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancelar</Button>
            <Button onClick={handleEditZone} disabled={!formData.name.trim() || isLoading}>
              {isLoading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Eliminar Zona</DialogTitle>
            <DialogDescription>Esta acción no se puede deshacer. Las sucursales asignadas quedarán sin zona.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
              <p className="font-medium">¿Eliminar la zona "{selectedZone?.name}"?</p>
              {selectedZone && getSucursalesForZone(selectedZone.id).length > 0 && (
                <p className="text-sm text-destructive mt-2">
                  Esta zona tiene {getSucursalesForZone(selectedZone.id).length} sucursal(es) asignada(s).
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeleteZone} disabled={isLoading}>
              {isLoading ? "Eliminando..." : "Eliminar Zona"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Modal (forma actual con checkboxes) */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Administrar Sucursales</DialogTitle>
            <DialogDescription>
              Zona: <strong>{selectedZone?.name}</strong> — selecciona las sucursales que pertenecen a esta zona
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {subsidiaries.map((suc: Subsidiary) => {
                const isSelected = selectedSucursales.includes(suc.id!)
                const otherZone = suc.zoneId && suc.zoneId !== selectedZone?.id ? zones.find((z) => z.id === suc.zoneId) : null
                return (
                  <div
                    key={suc.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      isSelected ? "bg-primary/5 border-primary/40" : "bg-white border-slate-200 hover:bg-slate-50"
                    )}
                    onClick={() => toggleSucursal(suc.id!)}
                  >
                    <Checkbox checked={isSelected} onCheckedChange={() => toggleSucursal(suc.id!)} />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{suc.name}</p>
                      <p className="text-xs text-muted-foreground">{suc.address || "Sin dirección"}</p>
                    </div>
                    {otherZone && (
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">En: {otherZone.name}</Badge>
                    )}
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </div>
                )
              })}
            </div>
            <div className="mt-4 p-3 bg-muted/40 rounded-lg flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Sucursales seleccionadas:</span>
              <Badge>{selectedSucursales.length}</Badge>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveAssignments} disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar Asignaciones"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
