"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Search, MapPin, Pencil, Trash2, Loader2, ExternalLink, BrainCircuit } from "lucide-react"
import { toast } from "@/lib/toast"
import {
  getGeocodeCache, updateGeocodeCache, deleteGeocodeCache, clearGeocodeCache,
  type GeocodeCacheItem,
} from "@/lib/services/geocode"

const sourceBadge = (item: GeocodeCacheItem) => {
  if (item.manual || item.source === "manual") return <Badge className="rounded-full bg-emerald-500 hover:bg-emerald-500">manual</Badge>
  const map: Record<string, string> = {
    address: "border-blue-300 bg-blue-50 text-blue-700",
    postalcode: "border-amber-300 bg-amber-50 text-amber-700",
    city: "border-slate-300 bg-slate-50 text-slate-600",
  }
  const label = item.source === "address" ? "exacta" : item.source === "postalcode" ? "por CP" : item.source === "city" ? "ciudad" : item.source
  return <Badge variant="outline" className={`rounded-full ${map[item.source] ?? ""}`}>{label}</Badge>
}

export function GeocodePanel() {
  const [items, setItems] = useState<GeocodeCacheItem[]>([])
  const [counts, setCounts] = useState({ total: 0, manual: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<GeocodeCacheItem | null>(null)
  const [editLat, setEditLat] = useState("")
  const [editLng, setEditLng] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (term?: string) => {
    setLoading(true)
    try {
      const data = await getGeocodeCache(term)
      setItems(data.items)
      setCounts({ total: data.total, manual: data.manual })
    } catch {
      toast.error("No se pudo cargar el caché de geolocalización.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  // Búsqueda con debounce.
  useEffect(() => {
    const t = setTimeout(() => load(search), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const openEdit = (it: GeocodeCacheItem) => {
    setEditing(it); setEditLat(it.latitude); setEditLng(it.longitude)
  }
  const saveEdit = async () => {
    if (!editing) return
    const lat = parseFloat(editLat), lng = parseFloat(editLng)
    if (Number.isNaN(lat) || Number.isNaN(lng)) { toast.error("Coordenadas inválidas."); return }
    setSaving(true)
    try {
      await updateGeocodeCache(editing.id, lat, lng)
      toast.success("Coordenadas actualizadas (marcadas como manual).")
      setEditing(null); load(search)
    } catch { toast.error("No se pudo actualizar.") } finally { setSaving(false) }
  }
  const remove = async (id: string) => {
    try { await deleteGeocodeCache(id); toast.success("Entrada eliminada."); load(search) }
    catch { toast.error("No se pudo eliminar.") }
  }
  const clear = async (scope: "all" | "auto") => {
    try {
      const r = await clearGeocodeCache(scope)
      toast.success(`${r.deleted} entradas eliminadas.`)
      load(search)
    } catch { toast.error("No se pudo limpiar.") }
  }

  return (
    <Card className="rounded-xl border-border/60 shadow-sm">
      <CardHeader className="gap-1 border-b bg-muted/30 px-4 py-3 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base">
          <BrainCircuit className="h-4 w-4 text-primary" /> Geolocalización aprendida
        </CardTitle>
        <CardDescription>
          Coordenadas memorizadas de direcciones ya resueltas. Las <b>manuales</b> (corregidas en el mapa) tienen prioridad.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 p-4 sm:p-6">
        {/* Barra: búsqueda + contadores + limpiar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar dirección, ciudad o CP…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full">{counts.total} memorizadas</Badge>
            <Badge className="rounded-full bg-emerald-500 hover:bg-emerald-500">{counts.manual} manuales</Badge>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-lg">Limpiar automáticas</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Limpiar las automáticas?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Se borran las geolocalizaciones automáticas (se conservan las manuales). Se volverán a calcular cuando se necesiten.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => clear("auto")}>Limpiar automáticas</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
            No hay direcciones memorizadas todavía.
          </div>
        ) : (
          <>
            {/* DESKTOP: tabla */}
            <div className="hidden overflow-hidden rounded-xl border md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead>Dirección</TableHead>
                    <TableHead className="w-24">CP</TableHead>
                    <TableHead className="w-40">Coordenadas</TableHead>
                    <TableHead className="w-24">Origen</TableHead>
                    <TableHead className="w-16 text-center">Usos</TableHead>
                    <TableHead className="w-24 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="max-w-[280px]">
                        <div className="truncate font-medium" title={it.rawAddress}>{it.rawAddress || "—"}</div>
                        {it.city && <div className="truncate text-xs text-muted-foreground">{it.city}</div>}
                      </TableCell>
                      <TableCell className="text-sm">{it.zip || "—"}</TableCell>
                      <TableCell className="font-mono text-xs tabular-nums">
                        {Number(it.latitude).toFixed(5)}, {Number(it.longitude).toFixed(5)}
                      </TableCell>
                      <TableCell>{sourceBadge(it)}</TableCell>
                      <TableCell className="text-center text-sm tabular-nums">{it.hits}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" asChild title="Ver en mapa">
                            <a href={`https://www.openstreetmap.org/?mlat=${it.latitude}&mlon=${it.longitude}#map=17/${it.latitude}/${it.longitude}`} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(it)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => remove(it.id)} title="Eliminar">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* MÓVIL: cards */}
            <div className="space-y-2 md:hidden">
              {items.map((it) => (
                <div key={it.id} className="rounded-xl border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium" title={it.rawAddress}>{it.rawAddress || "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">{[it.city, it.zip].filter(Boolean).join(" · ") || "—"}</p>
                    </div>
                    {sourceBadge(it)}
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {Number(it.latitude).toFixed(5)}, {Number(it.longitude).toFixed(5)}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{it.hits} uso(s)</span>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                        <a href={`https://www.openstreetmap.org/?mlat=${it.latitude}&mlon=${it.longitude}#map=17/${it.latitude}/${it.longitude}`} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(it)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => remove(it.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>

      {/* Editar coordenadas */}
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar coordenadas</DialogTitle>
            <DialogDescription className="truncate">{editing?.rawAddress}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Latitud</Label>
              <Input value={editLat} onChange={(e) => setEditLat(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Longitud</Label>
              <Input value={editLng} onChange={(e) => setEditLng(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
