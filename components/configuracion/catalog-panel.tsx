"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Trash2, Lock, AlertTriangle, ShieldAlert, Search, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  getCatalogs, createCatalogItem, updateCatalogItem, deleteCatalogItem,
  type CatalogGroup, type CatalogItem,
} from "@/lib/services/catalog";

export function CatalogPanel() {
  const [groups, setGroups] = useState<CatalogGroup[]>([]);
  const [type, setType] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newItem, setNewItem] = useState({ key: "", label: "" });
  const [toDelete, setToDelete] = useState<CatalogItem | null>(null);

  const reload = async () => {
    const { groups } = await getCatalogs();
    setGroups(groups);
    setType((t) => t || groups[0]?.type || "");
  };

  useEffect(() => {
    reload().catch(() => toast.error("No se pudieron cargar los catálogos.")).finally(() => setLoading(false));
  }, []);

  const current = useMemo(() => groups.find((g) => g.type === type), [groups, type]);
  const visibleGroups = useMemo(
    () => groups.filter((g) => g.label.toLowerCase().includes(search.toLowerCase())),
    [groups, search],
  );
  const visibleItems = useMemo(
    () => (current?.items || []).filter((i) => `${i.label} ${i.key}`.toLowerCase().includes(itemSearch.toLowerCase())),
    [current, itemSearch],
  );
  const totalValues = useMemo(() => groups.reduce((a, g) => a + g.items.length, 0), [groups]);

  const saveLabel = async (item: CatalogItem, label: string) => {
    if (label.trim() === item.label || !label.trim()) return;
    setBusyId(item.id);
    try { await updateCatalogItem(item.id, { label: label.trim() }); await reload(); }
    catch (e: any) { toast.error(e?.response?.data?.message || "No se pudo guardar."); }
    finally { setBusyId(null); }
  };

  const toggleActive = async (item: CatalogItem, active: boolean) => {
    setBusyId(item.id);
    try { await updateCatalogItem(item.id, { active }); await reload(); }
    catch (e: any) { toast.error(e?.response?.data?.message || "No se pudo cambiar el estado."); }
    finally { setBusyId(null); }
  };

  const handleAdd = async () => {
    if (!type || !newItem.key.trim() || !newItem.label.trim()) return;
    try {
      await createCatalogItem({ type, key: newItem.key.trim(), label: newItem.label.trim() });
      setAddOpen(false); setNewItem({ key: "", label: "" });
      await reload();
      toast.success("Valor agregado.");
    } catch (e: any) { toast.error(e?.response?.data?.message || "No se pudo agregar."); }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try { await deleteCatalogItem(toDelete.id); await reload(); toast.success("Valor eliminado."); }
    catch (e: any) { toast.error(e?.response?.data?.message || "No se pudo eliminar."); }
    setToDelete(null);
  };

  if (loading) {
    return <div className="flex h-48 items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando catálogos…</div>;
  }

  return (
    <div className="space-y-4">
      <Alert className="border-amber-200 bg-amber-50 text-amber-900 [&>svg]:text-amber-600">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Zona sensible</AlertTitle>
        <AlertDescription className="text-amber-800">
          Edita <strong>etiqueta</strong>, activa/desactiva y <strong>agrega</strong> valores. Los <Lock className="inline h-3 w-3" /> del sistema no se borran y un valor en uso tampoco — desactívalo.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Lista de catálogos */}
        <Card className="h-fit">
          <CardHeader className="pb-3 space-y-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Catálogos</CardTitle>
              <Badge variant="secondary" className="tabular-nums">{groups.length}</Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar catálogo…" className="h-8 pl-8 text-sm" />
            </div>
          </CardHeader>
          <CardContent className="p-2 max-h-[60vh] overflow-y-auto space-y-0.5">
            {visibleGroups.map((g) => {
              const active = g.type === type;
              return (
                <button
                  key={g.type}
                  onClick={() => { setType(g.type); setItemSearch(""); }}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-left transition-colors",
                    active ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted",
                  )}
                >
                  <span className="flex-1 truncate">{g.label}</span>
                  <Badge variant={active ? "default" : "secondary"} className="text-[10px] tabular-nums">{g.items.length}</Badge>
                  {active && <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              );
            })}
            {visibleGroups.length === 0 && <p className="text-xs text-muted-foreground px-3 py-4 text-center">Sin coincidencias.</p>}
          </CardContent>
        </Card>

        {/* Valores del catálogo seleccionado */}
        <Card>
          <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base">{current?.label ?? "Catálogo"}</CardTitle>
              <CardDescription>{current?.items.length ?? 0} valor(es) · {totalValues} en total</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} placeholder="Buscar valor…" className="h-8 pl-8 text-sm w-[160px]" />
              </div>
              <Button size="sm" onClick={() => setAddOpen(true)} disabled={!type}><Plus className="h-4 w-4 mr-1" /> Agregar</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Etiqueta</TableHead>
                    <TableHead>Clave</TableHead>
                    <TableHead className="w-[120px] text-center">Estado</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input defaultValue={item.label} onBlur={(e) => saveLabel(item, e.target.value)} className="h-8 max-w-[240px]" />
                          {item.isSystem && <Badge variant="outline" className="text-[10px] shrink-0"><Lock className="h-2.5 w-2.5 mr-0.5" /> Sistema</Badge>}
                          {busyId === item.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                        </div>
                      </TableCell>
                      <TableCell><code className="text-[11px] text-muted-foreground font-mono">{item.key}</code></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Switch checked={item.active} disabled={busyId === item.id} onCheckedChange={(v) => toggleActive(item, v)} />
                          <span className="text-[11px] text-muted-foreground w-12">{item.active ? "Activo" : "Inactivo"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost" size="icon"
                          className="h-8 w-8 text-destructive/70 hover:text-destructive disabled:opacity-30"
                          disabled={item.isSystem}
                          title={item.isSystem ? "Valor del sistema (no eliminable)" : "Eliminar"}
                          onClick={() => setToDelete(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {visibleItems.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="h-20 text-center text-muted-foreground">Sin valores.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agregar valor */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar valor a «{current?.label}»</DialogTitle>
            <DialogDescription>La clave (key) es el valor estable que guardará la BD; no podrá cambiarse luego.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Etiqueta</Label>
              <Input value={newItem.label} onChange={(e) => setNewItem((p) => ({ ...p, label: e.target.value }))} placeholder="Ej: Camión 3.5 ton" />
            </div>
            <div className="space-y-2">
              <Label>Clave (key)</Label>
              <Input value={newItem.key} onChange={(e) => setNewItem((p) => ({ ...p, key: e.target.value }))} placeholder="Ej: camion_3_5" className="font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={!newItem.key.trim() || !newItem.label.trim()}>Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar borrado */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive w-5 h-5" /> Eliminar valor</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar <strong>{toDelete?.label}</strong> (<code>{toDelete?.key}</code>)? Si está en uso en la BD, el sistema lo impedirá.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
