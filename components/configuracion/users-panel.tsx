"use client";

import { useEffect, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Loader2, Pencil, Plus, Trash2, AlertTriangle, MoreHorizontal, KeyRound, Building2, Sparkles, Copy, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DataTable } from "@/components/data-table/data-table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SucursalSelector } from "@/components/sucursal-selector";
import { UserDialog, type UserFormData } from "@/components/modals/user-dialog-modal";
import { useUsers } from "@/hooks/services/users/use-users";
import { deleteUser, register, updateUser } from "@/lib/services/users";
import { generateSecurePassword } from "@/lib/password";
import type { User } from "@/lib/types";
import { toast } from "@/lib/toast";

const roleVariant: Record<string, string> = {
  superadmin: "bg-violet-100 text-violet-700", superamin: "bg-violet-100 text-violet-700",
  admin: "bg-blue-100 text-blue-700", subadmin: "bg-sky-100 text-sky-700",
  auxiliar: "bg-amber-100 text-amber-700", bodega: "bg-teal-100 text-teal-700", user: "bg-slate-100 text-slate-700",
};
const initials = (u: User) => `${(u.name || "?")[0] ?? ""}${(u.lastName || "")[0] ?? ""}`.toUpperCase();
const toForm = (u: User): UserFormData => ({
  id: u.id, name: u.name || "", lastName: u.lastName || "", email: u.email || "",
  role: (u.role as string) || "user", subsidiary: u.subsidiary ? { id: (u.subsidiary as any).id } : null, active: u.active,
});

export function UsersPanel() {
  const { users, isLoading, isError, mutate } = useUsers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [pwdUser, setPwdUser] = useState<User | null>(null);
  const [subUser, setSubUser] = useState<User | null>(null);

  const handleSubmit = async (data: UserFormData) => {
    try {
      if (data.id) { await updateUser(data); toast.success("Usuario actualizado correctamente"); }
      else { await register(data); toast.success("Usuario creado correctamente"); }
      mutate();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo guardar el usuario");
    }
    setDialogOpen(false);
  };

  const onToggleActive = async (u: User, value: boolean) => {
    try { await updateUser({ ...toForm(u), active: value }); mutate(); }
    catch { toast.error("Error al cambiar el estado del usuario"); }
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try { await deleteUser(userToDelete.id!); mutate(); toast.success("Usuario eliminado correctamente"); }
    catch (e: any) { toast.error(e?.response?.data?.message || "No se pudo eliminar el usuario"); }
    setUserToDelete(null);
  };

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: "Usuario",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9"><AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{initials(row.original)}</AvatarFallback></Avatar>
          <div className="min-w-0">
            <p className="font-medium leading-tight truncate">{row.original.name} {row.original.lastName}</p>
            <p className="text-xs text-muted-foreground truncate">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "Rol",
      cell: ({ row }) => {
        const r = String(row.original.role || "");
        return <Badge variant="secondary" className={roleVariant[r.toLowerCase()] || "bg-slate-100 text-slate-700"}>{r}</Badge>;
      },
    },
    { id: "subsidiary", header: "Sucursal", cell: ({ row }) => <span className="text-sm text-muted-foreground">{(row.original.subsidiary as any)?.name || "—"}</span> },
    { accessorKey: "active", header: "Activo", cell: ({ row }) => <Switch checked={row.original.active} onCheckedChange={(v) => onToggleActive(row.original, v)} /> },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const u = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setEditingUser(u); setDialogOpen(true); }}><Pencil className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPwdUser(u)}><KeyRound className="h-4 w-4 mr-2" /> Cambiar contraseña</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSubUser(u)}><Building2 className="h-4 w-4 mr-2" /> Cambiar sucursal</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setUserToDelete(u)}><Trash2 className="h-4 w-4 mr-2" /> Eliminar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Gestión de Usuarios</CardTitle>
          <CardDescription>Crea, edita y administra los accesos del sistema.</CardDescription>
        </div>
        <Button onClick={() => { setEditingUser(null); setDialogOpen(true); }}><Plus className="w-4 h-4 mr-2" /> Nuevo Usuario</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando usuarios…</div>
        ) : isError ? (
          <p className="text-destructive text-sm">Error al cargar usuarios.</p>
        ) : (
          <DataTable columns={columns} data={users} />
        )}
      </CardContent>

      <UserDialog open={dialogOpen} user={editingUser} onSubmit={handleSubmit} onClose={() => setDialogOpen(false)} />
      <PasswordDialog user={pwdUser} onClose={() => setPwdUser(null)} onSaved={mutate} />
      <SubsidiaryDialog user={subUser} onClose={() => setSubUser(null)} onSaved={mutate} />

      <AlertDialog open={!!userToDelete} onOpenChange={(o) => !o && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive w-5 h-5" /> Confirmar eliminación</AlertDialogTitle>
            <AlertDialogDescription>¿Eliminar a <strong>{userToDelete?.name} {userToDelete?.lastName}</strong>? Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/* ===== Cambio rápido de contraseña (con generador seguro) ===== */
function PasswordDialog({ user, onClose, onSaved }: { user: User | null; onClose: () => void; onSaved: () => void }) {
  const [pwd, setPwd] = useState("");
  const [show, setShow] = useState(true);
  const [saving, setSaving] = useState(false);

  // Sugiere una contraseña segura cada vez que se abre con un usuario.
  useEffect(() => { if (user) { setPwd(generateSecurePassword()); setShow(true); } }, [user]);

  const close = () => { setPwd(""); onClose(); };

  const save = async () => {
    if (!user || pwd.length < 8) { toast.error("La contraseña debe tener al menos 8 caracteres."); return; }
    setSaving(true);
    try {
      await updateUser({ ...toForm(user), password: pwd });
      toast.success(`Contraseña de ${user.name} actualizada.`);
      onSaved();
      close();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo cambiar la contraseña.");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /> Cambiar contraseña</DialogTitle>
          <DialogDescription>Nueva contraseña para <strong>{user?.name} {user?.lastName}</strong>.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <Label>Nueva contraseña</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input value={pwd} type={show ? "text" : "password"} onChange={(e) => setPwd(e.target.value)} className="pr-9 font-mono" />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" tabIndex={-1}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button type="button" variant="outline" size="icon" title="Generar" onClick={() => { setPwd(generateSecurePassword()); setShow(true); }}><Sparkles className="h-4 w-4" /></Button>
            <Button type="button" variant="outline" size="icon" title="Copiar" onClick={() => { navigator.clipboard?.writeText(pwd); toast.success("Copiada al portapapeles."); }}><Copy className="h-4 w-4" /></Button>
          </div>
          <p className="text-xs text-muted-foreground">Sugerida segura (sin caracteres ambiguos). Puedes editarla o generar otra.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancelar</Button>
          <Button onClick={save} disabled={saving || pwd.length < 8}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar contraseña</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===== Cambio rápido de sucursal ===== */
function SubsidiaryDialog({ user, onClose, onSaved }: { user: User | null; onClose: () => void; onSaved: () => void }) {
  const [subId, setSubId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (user) setSubId((user.subsidiary as any)?.id || ""); }, [user]);

  const close = () => { setSubId(""); onClose(); };

  const save = async () => {
    if (!user || !subId) { toast.error("Selecciona una sucursal."); return; }
    setSaving(true);
    try {
      await updateUser({ ...toForm(user), subsidiary: { id: subId } });
      toast.success(`Sucursal de ${user.name} actualizada.`);
      onSaved();
      close();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo cambiar la sucursal.");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" /> Cambiar sucursal</DialogTitle>
          <DialogDescription>Reasigna la sucursal de <strong>{user?.name} {user?.lastName}</strong>.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>Sucursal</Label>
          <SucursalSelector value={subId} onValueChange={(v) => setSubId(typeof v === "string" ? v : (v as any)?.id || "")} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancelar</Button>
          <Button onClick={save} disabled={saving || !subId}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
