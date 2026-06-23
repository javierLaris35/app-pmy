"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Plus, Save, Shield, Trash2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  getPermissions, getRoles, createRole, deleteRole, setRolePermissions,
  getUserPermissions, setUserPermissions,
  type RbacPermission, type RbacRole, type PermissionEffect,
} from "@/lib/services/rbac";
import { getUsers } from "@/lib/services/users";

export function PermissionsPanel() {
  const [groups, setGroups] = useState<Record<string, RbacPermission[]>>({});
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const [perm, rls] = await Promise.all([getPermissions(), getRoles()]);
    setGroups(perm.groups || {});
    setRoles(rls);
  };

  useEffect(() => {
    reload().catch(() => toast.error("No se pudieron cargar roles/permisos.")).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex h-48 items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando…</div>;
  }

  return (
    <Tabs defaultValue="roles" className="space-y-4">
      <TabsList>
        <TabsTrigger value="roles">Roles y permisos</TabsTrigger>
        <TabsTrigger value="user">Permisos por usuario</TabsTrigger>
      </TabsList>
      <TabsContent value="roles">
        <RolesMatrix groups={groups} roles={roles} reload={reload} />
      </TabsContent>
      <TabsContent value="user">
        <UserOverrides groups={groups} />
      </TabsContent>
    </Tabs>
  );
}

/* ============ Matriz Rol × Permiso ============ */
function RolesMatrix({ groups, roles, reload }: { groups: Record<string, RbacPermission[]>; roles: RbacRole[]; reload: () => Promise<void> }) {
  const [selectedId, setSelectedId] = useState<string>(roles[0]?.id ?? "");
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newRole, setNewRole] = useState({ key: "", name: "" });

  const selected = roles.find((r) => r.id === selectedId) || roles[0];

  useEffect(() => {
    if (selected) setDraft(new Set(selected.permissionCodes));
  }, [selectedId, roles]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (code: string) =>
    setDraft((prev) => {
      const n = new Set(prev);
      n.has(code) ? n.delete(code) : n.add(code);
      return n;
    });

  const toggleGroup = (perms: RbacPermission[], on: boolean) =>
    setDraft((prev) => {
      const n = new Set(prev);
      perms.forEach((p) => (on ? n.add(p.code) : n.delete(p.code)));
      return n;
    });

  const dirty = useMemo(() => {
    if (!selected) return false;
    const cur = new Set(selected.permissionCodes);
    if (cur.size !== draft.size) return true;
    for (const c of draft) if (!cur.has(c)) return true;
    return false;
  }, [draft, selected]);

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await setRolePermissions(selected.id, [...draft]);
      await reload();
      toast.success(`Permisos de "${selected.name}" guardados.`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudieron guardar los permisos.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newRole.key.trim() || !newRole.name.trim()) return;
    try {
      await createRole({ key: newRole.key.trim().toLowerCase(), name: newRole.name.trim() });
      setShowCreate(false);
      setNewRole({ key: "", name: "" });
      await reload();
      toast.success("Rol creado.");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo crear el rol.");
    }
  };

  const handleDelete = async (r: RbacRole) => {
    try {
      await deleteRole(r.id);
      await reload();
      if (selectedId === r.id) setSelectedId(roles[0]?.id ?? "");
      toast.success("Rol eliminado.");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo eliminar el rol.");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
      {/* Lista de roles */}
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Roles</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {roles.map((r) => {
            const active = selectedId === r.id;
            return (
              <div
                key={r.id}
                className={cn(
                  "flex items-center gap-1 rounded-md transition-colors",
                  active ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-muted",
                )}
              >
                <button
                  onClick={() => setSelectedId(r.id)}
                  className={cn("flex-1 min-w-0 text-left px-3 py-2 text-sm flex items-center gap-2", active && "text-primary font-medium")}
                >
                  <span className="truncate">{r.name}</span>
                  <Badge variant="secondary" className="ml-auto text-[10px] tabular-nums">{r.permissionCodes.length}</Badge>
                </button>
                {r.isSystem ? (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground mr-2.5 shrink-0" aria-label="Rol del sistema" />
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 mr-1 text-destructive/70 hover:text-destructive shrink-0"
                    onClick={() => handleDelete(r)}
                    title="Eliminar rol"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Matriz de permisos del rol seleccionado */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> {selected?.name}</CardTitle>
            <CardDescription>{draft.size} permiso(s) activo(s){selected?.isSystem && " · rol del sistema"}</CardDescription>
          </div>
          <Button size="sm" onClick={save} disabled={!dirty || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Guardar
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(groups).map(([group, perms]) => {
            const allOn = perms.every((p) => draft.has(p.code));
            return (
              <div key={group}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold">{group}</h4>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => toggleGroup(perms, !allOn)}>
                    {allOn ? "Quitar todos" : "Marcar todos"}
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {perms.map((p) => (
                    <label key={p.code} className="flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer hover:bg-muted/50">
                      <Checkbox checked={draft.has(p.code)} onCheckedChange={() => toggle(p.code)} />
                      <span className="flex-1">{p.name}</span>
                      <code className="text-[10px] text-muted-foreground">{p.code}</code>
                    </label>
                  ))}
                </div>
                <Separator className="mt-3" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo rol</DialogTitle>
            <DialogDescription>Crea un rol y luego asígnale permisos en la matriz.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={newRole.name} onChange={(e) => setNewRole((p) => ({ ...p, name: e.target.value }))} placeholder="Ej: Supervisor de bodega" />
            </div>
            <div className="space-y-2">
              <Label>Clave (key)</Label>
              <Input value={newRole.key} onChange={(e) => setNewRole((p) => ({ ...p, key: e.target.value }))} placeholder="Ej: supervisor_bodega" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newRole.key.trim() || !newRole.name.trim()}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============ Permisos especiales por usuario ============ */
function UserOverrides({ groups }: { groups: Record<string, RbacPermission[]> }) {
  const [users, setUsers] = useState<any[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [info, setInfo] = useState<{ rolePermissionCodes: string[]; overrides: { code: string; effect: PermissionEffect }[] } | null>(null);
  const [draft, setDraft] = useState<Record<string, PermissionEffect>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getUsers().then(setUsers).catch(() => {}); }, []);

  useEffect(() => {
    if (!userId) { setInfo(null); return; }
    setLoading(true);
    getUserPermissions(userId)
      .then((d) => {
        setInfo(d);
        const m: Record<string, PermissionEffect> = {};
        d.overrides.forEach((o) => (m[o.code] = o.effect));
        setDraft(m);
      })
      .catch(() => toast.error("No se pudieron cargar los permisos del usuario."))
      .finally(() => setLoading(false));
  }, [userId]);

  const setEffect = (code: string, value: string) =>
    setDraft((prev) => {
      const next = { ...prev };
      if (value === "inherit") delete next[code];
      else next[code] = value as PermissionEffect;
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      const overrides = Object.entries(draft).map(([code, effect]) => ({ code, effect }));
      await setUserPermissions(userId, overrides);
      toast.success("Permisos especiales guardados.");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudieron guardar.");
    } finally {
      setSaving(false);
    }
  };

  const roleCodes = new Set(info?.rolePermissionCodes || []);

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <CardTitle className="text-base">Permisos especiales por usuario</CardTitle>
          <CardDescription>Concede o revoca permisos puntuales por encima del rol. Clic en el estado para alternar Heredado → Permitir → Denegar.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger className="w-[240px]"><SelectValue placeholder="Selecciona un usuario" /></SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name} {u.lastName} · {u.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={save} disabled={!userId || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Guardar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!userId ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Selecciona un usuario para ver y ajustar sus permisos.</p>
        ) : loading ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando…</div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groups).map(([group, perms]) => (
              <div key={group}>
                <h4 className="text-sm font-semibold mb-2">{group}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {perms.map((p) => {
                    const val = draft[p.code] ?? "inherit";
                    return (
                      <div key={p.code} className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
                        <span className="flex-1 truncate" title={p.code}>{p.name}</span>
                        <Select value={val} onValueChange={(v) => setEffect(p.code, v)}>
                          <SelectTrigger className={cn(
                            "w-[140px] h-8",
                            val === "allow" && "text-emerald-700 border-emerald-300",
                            val === "deny" && "text-rose-700 border-rose-300",
                          )}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inherit">{roleCodes.has(p.code) ? "Heredado ✓" : "Heredado —"}</SelectItem>
                            <SelectItem value="allow">Permitir</SelectItem>
                            <SelectItem value="deny">Denegar</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
