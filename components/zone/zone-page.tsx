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
  X,
  Check,
  AlertCircle,
} from "lucide-react"
import { Separator } from "../ui/separator"

// Types
interface Zone {
  id: string
  name: string
  description?: string
  createdById?: string
  createdBy?: { name: string }
  createdAt: Date
}

interface Sucursal {
  id: string
  name: string
  address: string
  postalCode: string
  zoneId?: string
}

// Mock data
const mockSucursales: Sucursal[] = [
  { id: "s1", name: "Sucursal Alamos", address: "Av. Principal #123", postalCode: "85760", zoneId: undefined },
  { id: "s2", name: "Sucursal Navojoa", address: "Blvd. Comercial #456", postalCode: "85800", zoneId: undefined },
  { id: "s3", name: "Sucursal Huatabampo", address: "Calle Centro #789", postalCode: "85900", zoneId: undefined },
  { id: "s4", name: "Sucursal Pueblo Yaqui", address: "Av. Yaqui #321", postalCode: "85200", zoneId: undefined },
  { id: "s5", name: "Sucursal Villa Juarez", address: "Calle Juarez #654", postalCode: "85280", zoneId: undefined },
  { id: "s6", name: "Sucursal Vicam", address: "Blvd. Sonora #987", postalCode: "85520", zoneId: undefined },
  { id: "s7", name: "Sucursal Obregon Centro", address: "Calle 5 de Febrero #111", postalCode: "85000", zoneId: undefined },
  { id: "s8", name: "Sucursal Obregon Norte", address: "Blvd. Morelos #222", postalCode: "85010", zoneId: undefined },
]

const initialZones: Zone[] = [
  {
    id: "z1",
    name: "Zona Norte",
    description: "Cobertura de sucursales en la zona norte del estado",
    createdById: "user1",
    createdBy: { name: "Admin Sistema" },
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "z2",
    name: "Zona Sur",
    description: "Cobertura de sucursales en la zona sur",
    createdById: "user1",
    createdBy: { name: "Admin Sistema" },
    createdAt: new Date("2024-02-20"),
  },
]

const initialAssignments: Record<string, string[]> = {
  z1: ["s1", "s2", "s3"],
  z2: ["s4", "s5"],
}

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>(initialZones)
  const [sucursales, setSucursales] = useState<Sucursal[]>(mockSucursales)
  const [assignments, setAssignments] = useState<Record<string, string[]>>(initialAssignments)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  
  // Form states
  const [formData, setFormData] = useState({ name: "", description: "" })
  const [selectedSucursales, setSelectedSucursales] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Filtered zones
  const filteredZones = useMemo(() => {
    if (!searchTerm) return zones
    const term = searchTerm.toLowerCase()
    return zones.filter(
      (z) =>
        z.name.toLowerCase().includes(term) ||
        z.description?.toLowerCase().includes(term)
    )
  }, [zones, searchTerm])

  // Get sucursales for a zone
  const getSucursalesForZone = (zoneId: string) => {
    const assignedIds = assignments[zoneId] || []
    return sucursales.filter((s) => assignedIds.includes(s.id))
  }

  // Get unassigned sucursales
  const unassignedSucursales = useMemo(() => {
    const allAssigned = Object.values(assignments).flat()
    return sucursales.filter((s) => !allAssigned.includes(s.id))
  }, [assignments, sucursales])

  // Handlers
  const handleCreateZone = async () => {
    if (!formData.name.trim()) return
    
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 500))
    
    const newZone: Zone = {
      id: `z${Date.now()}`,
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      createdById: "current-user",
      createdBy: { name: "Usuario Actual" },
      createdAt: new Date(),
    }
    
    setZones([...zones, newZone])
    setAssignments({ ...assignments, [newZone.id]: [] })
    setFormData({ name: "", description: "" })
    setShowCreateModal(false)
    setIsLoading(false)
  }

  const handleEditZone = async () => {
    if (!selectedZone || !formData.name.trim()) return
    
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 500))
    
    setZones(
      zones.map((z) =>
        z.id === selectedZone.id
          ? { ...z, name: formData.name.trim(), description: formData.description.trim() || undefined }
          : z
      )
    )
    setShowEditModal(false)
    setSelectedZone(null)
    setFormData({ name: "", description: "" })
    setIsLoading(false)
  }

  const handleDeleteZone = async () => {
    if (!selectedZone) return
    
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 500))
    
    setZones(zones.filter((z) => z.id !== selectedZone.id))
    const newAssignments = { ...assignments }
    delete newAssignments[selectedZone.id]
    setAssignments(newAssignments)
    setShowDeleteModal(false)
    setSelectedZone(null)
    setIsLoading(false)
  }

  const handleSaveAssignments = async () => {
    if (!selectedZone) return
    
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 500))
    
    // Remove selected sucursales from other zones
    const newAssignments = { ...assignments }
    Object.keys(newAssignments).forEach((zoneId) => {
      if (zoneId !== selectedZone.id) {
        newAssignments[zoneId] = newAssignments[zoneId].filter(
          (sId) => !selectedSucursales.includes(sId)
        )
      }
    })
    
    // Assign to current zone
    newAssignments[selectedZone.id] = selectedSucursales
    
    setAssignments(newAssignments)
    setShowAssignModal(false)
    setSelectedZone(null)
    setSelectedSucursales([])
    setIsLoading(false)
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
    setSelectedSucursales(assignments[zone.id] || [])
    setShowAssignModal(true)
  }

  const toggleSucursal = (sucursalId: string) => {
    setSelectedSucursales((prev) =>
      prev.includes(sucursalId)
        ? prev.filter((id) => id !== sucursalId)
        : [...prev, sucursalId]
    )
  }

    return (
        <div className="">
            {/* Header */}
            <div className="pb-4">
                <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-600 text-white shadow-lg">
                    <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                    <h1 className="text-xl font-bold text-slate-900">Gestion de Zonas</h1>
                    <p className="text-sm text-slate-600">Administra zonas y asigna sucursales</p>
                    </div>
                </div>

                <Button
                    onClick={() => {
                    setFormData({ name: "", description: "" })
                    setShowCreateModal(true)
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Zona
                </Button>
                </div>

                {/* Search & Stats */}
                <div className="mt-4 flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                    placeholder="Buscar zonas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    />
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    <strong>{zones.length}</strong> zonas
                    </span>
                    <span className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" />
                    <strong>{sucursales.length - unassignedSucursales.length}</strong> asignadas
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-600">
                    <AlertCircle className="w-4 h-4" />
                    <strong>{unassignedSucursales.length}</strong> sin asignar
                    </span>
                </div>
                </div>
            </div>

            <Separator />

            {/* Main Content */}
            <div className="pt-4">
                {filteredZones.length === 0 ? (
                <Card className="text-center py-12">
                    <CardContent>
                    <MapPin className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">
                        {searchTerm ? "No se encontraron zonas" : "No hay zonas creadas"}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                        {searchTerm ? "Intenta con otro termino de busqueda" : "Crea tu primera zona para comenzar"}
                    </p>
                    {!searchTerm && (
                        <Button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-4 bg-emerald-600 hover:bg-emerald-700"
                        >
                        <Plus className="w-4 h-4 mr-2" />
                        Crear Zona
                        </Button>
                    )}
                    </CardContent>
                </Card>
                ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredZones.map((zone) => {
                    const zoneSucursales = getSucursalesForZone(zone.id)
                    return (
                        <Card key={zone.id} className="shadow-md hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <CardTitle className="text-lg flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                {zone.name}
                                </CardTitle>
                                {zone.description && (
                                <CardDescription className="mt-1 line-clamp-2">
                                    {zone.description}
                                </CardDescription>
                                )}
                            </div>
                            <div className="flex gap-1">
                                <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => openEditModal(zone)}
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Editar zona</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => openDeleteModal(zone)}
                                    >
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
                            {/* Sucursales List */}
                            <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label className="text-sm font-medium text-slate-700">
                                Sucursales Asignadas
                                </Label>
                                <Badge variant="secondary">{zoneSucursales.length}</Badge>
                            </div>
                            
                            {zoneSucursales.length === 0 ? (
                                <p className="text-sm text-slate-400 italic">Sin sucursales asignadas</p>
                            ) : (
                                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                {zoneSucursales.map((suc) => (
                                    <div
                                    key={suc.id}
                                    className="flex items-center gap-2 text-sm p-2 bg-slate-50 rounded"
                                    >
                                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="flex-1 truncate">{suc.name}</span>
                                    <Badge variant="outline" className="text-xs">
                                        {suc.postalCode}
                                    </Badge>
                                    </div>
                                ))}
                                </div>
                            )}
                            </div>

                            {/* Metadata */}
                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {zone.createdAt.toLocaleDateString("es-MX")}
                            </span>
                            {zone.createdBy && (
                                <span className="flex items-center gap-1">
                                <User className="w-3.5 h-3.5" />
                                {zone.createdBy.name}
                                </span>
                            )}
                            </div>

                            {/* Action Button */}
                            <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => openAssignModal(zone)}
                            >
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

                {/* Unassigned Sucursales Warning */}
                {unassignedSucursales.length > 0 && (
                <Card className="mt-6 border-amber-200 bg-amber-50">
                    <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                        <AlertCircle className="w-5 h-5" />
                        Sucursales sin Asignar ({unassignedSucursales.length})
                    </CardTitle>
                    </CardHeader>
                    <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {unassignedSucursales.map((suc) => (
                        <Badge key={suc.id} variant="outline" className="bg-white">
                            <Building2 className="w-3 h-3 mr-1" />
                            {suc.name}
                        </Badge>
                        ))}
                    </div>
                    </CardContent>
                </Card>
                )}
            </div>

            {/* Create Zone Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nueva Zona</DialogTitle>
                    <DialogDescription>
                    Crea una nueva zona para agrupar sucursales
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                    <Label htmlFor="zone-name">Nombre de la Zona *</Label>
                    <Input
                        id="zone-name"
                        placeholder="Ej: Zona Norte"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        autoFocus
                    />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="zone-description">Descripcion (opcional)</Label>
                    <Textarea
                        id="zone-description"
                        placeholder="Describe la zona..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                    />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                    Cancelar
                    </Button>
                    <Button
                    onClick={handleCreateZone}
                    disabled={!formData.name.trim() || isLoading}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    >
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
                    <DialogDescription>
                    Modifica los datos de la zona
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                    <Label htmlFor="edit-zone-name">Nombre de la Zona *</Label>
                    <Input
                        id="edit-zone-name"
                        placeholder="Ej: Zona Norte"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        autoFocus
                    />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="edit-zone-description">Descripcion (opcional)</Label>
                    <Textarea
                        id="edit-zone-description"
                        placeholder="Describe la zona..."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                    />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowEditModal(false)}>
                    Cancelar
                    </Button>
                    <Button
                    onClick={handleEditZone}
                    disabled={!formData.name.trim() || isLoading}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    >
                    {isLoading ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-red-600">Eliminar Zona</DialogTitle>
                    <DialogDescription>
                    Esta accion no se puede deshacer. Las sucursales asignadas quedaran sin zona.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="font-medium text-red-900">
                        Estas seguro de eliminar la zona "{selectedZone?.name}"?
                    </p>
                    {selectedZone && getSucursalesForZone(selectedZone.id).length > 0 && (
                        <p className="text-sm text-red-700 mt-2">
                        Esta zona tiene {getSucursalesForZone(selectedZone.id).length} sucursal(es) asignada(s).
                        </p>
                    )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                    Cancelar
                    </Button>
                    <Button
                    variant="destructive"
                    onClick={handleDeleteZone}
                    disabled={isLoading}
                    >
                    {isLoading ? "Eliminando..." : "Eliminar Zona"}
                    </Button>
                </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assign Sucursales Modal */}
            <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
                <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Administrar Sucursales</DialogTitle>
                    <DialogDescription>
                    Zona: <strong>{selectedZone?.name}</strong> - Selecciona las sucursales que pertenecen a esta zona
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                    {sucursales.map((suc) => {
                        const isSelected = selectedSucursales.includes(suc.id)
                        const currentZone = Object.entries(assignments).find(([zId, sIds]) => 
                        sIds.includes(suc.id) && zId !== selectedZone?.id
                        )
                        const currentZoneName = currentZone 
                        ? zones.find((z) => z.id === currentZone[0])?.name 
                        : null

                        return (
                        <div
                            key={suc.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                                ? "bg-emerald-50 border-emerald-300"
                                : "bg-white border-slate-200 hover:bg-slate-50"
                            }`}
                            onClick={() => toggleSucursal(suc.id)}
                        >
                            <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSucursal(suc.id)}
                            />
                            <div className="flex-1">
                            <p className="font-medium text-sm">{suc.name}</p>
                            <p className="text-xs text-slate-500">{suc.address} - CP: {suc.postalCode}</p>
                            </div>
                            {currentZoneName && (
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-300">
                                En: {currentZoneName}
                            </Badge>
                            )}
                            {isSelected && (
                            <Check className="w-4 h-4 text-emerald-600" />
                            )}
                        </div>
                        )
                    })}
                    </div>
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg flex items-center justify-between text-sm">
                    <span className="text-slate-600">Sucursales seleccionadas:</span>
                    <Badge className="bg-emerald-600">{selectedSucursales.length}</Badge>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAssignModal(false)}>
                    Cancelar
                    </Button>
                    <Button
                    onClick={handleSaveAssignments}
                    disabled={isLoading}
                    className="bg-emerald-600 hover:bg-emerald-700"
                    >
                    {isLoading ? "Guardando..." : "Guardar Asignaciones"}
                    </Button>
                </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
