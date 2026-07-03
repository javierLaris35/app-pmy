"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Sparkles, Eye, EyeOff, UserPlus, Pencil } from "lucide-react"
import { SucursalSelector } from "@/components/sucursal-selector"
import type { User } from "@/lib/types"
import { generateSecurePassword } from "@/lib/password"
import { getRoles, type RbacRole } from "@/lib/services/rbac"
import { useAuthStore } from "@/store/auth.store"

export interface UserFormData {
  id?: string
  name: string
  lastName: string
  email: string
  password?: string
  role: string
  subsidiary: { id: string } | null
  additionalSubsidiaries?: string[]
  active?: boolean
}

const FALLBACK_ROLES = [
  { key: "superadmin", name: "Superadministrador" },
  { key: "admin", name: "Administrador" },
  { key: "subadmin", name: "Subadministrador" },
  { key: "auxiliar", name: "Auxiliar / Finanzas" },
  { key: "bodega", name: "Bodega" },
  { key: "user", name: "Usuario" },
]

interface UserDialogProps {
  user?: User | null
  open: boolean
  onClose: () => void
  onSubmit: (form: UserFormData) => Promise<void>
}

const EMPTY: UserFormData = { name: "", lastName: "", email: "", password: "", role: "user", subsidiary: null, additionalSubsidiaries: [] }

export function UserDialog({ user, open, onClose, onSubmit }: UserDialogProps) {
  const [form, setForm] = useState<UserFormData>(EMPTY)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [roles, setRoles] = useState<{ key: string; name: string }[]>(FALLBACK_ROLES)
  const currentUser = useAuthStore((s) => s.user)
  // Las sucursales adicionales solo las puede asignar un superadmin (mismo criterio que el backend: SuperAdminGuard en /rbac).
  const isSuperAdmin = ["superadmin", "superamin"].includes(String(currentUser?.role || "").toLowerCase())

  useEffect(() => {
    getRoles()
      .then((rls: RbacRole[]) => rls.length && setRoles(rls.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (user) {
      setForm({
        id: user.id,
        name: user.name || "",
        lastName: user.lastName || "",
        email: user.email,
        role: (user.role as string) || "user",
        subsidiary: user.subsidiary ? { id: (user.subsidiary as any).id } : null,
        additionalSubsidiaries: (user.additionalSubsidiaries || []).map((s: any) => s.id),
        password: "",
      })
    } else {
      setForm(EMPTY)
    }
    setShowPwd(false)
  }, [user, open])

  const set = (k: keyof UserFormData, v: any) => setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    // No mandar password vacío al editar (el backend hashea "" y rompería el login).
    const payload: UserFormData = { ...form }
    if (!payload.password) delete payload.password
    await onSubmit(payload)
    setIsSubmitting(false)
    onClose()
  }

  const isEdit = !!form.id

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? <Pencil className="h-5 w-5 text-primary" /> : <UserPlus className="h-5 w-5 text-primary" />}
            {isEdit ? "Editar usuario" : "Nuevo usuario"}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? "Actualiza los datos del usuario." : "Completa los datos para crear el acceso."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido</Label>
              <Input id="lastName" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Contraseña {isEdit && <span className="text-muted-foreground font-normal">(opcional — deja vacío para no cambiarla)</span>}
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  value={form.password || ""}
                  onChange={(e) => set("password", e.target.value)}
                  required={!isEdit}
                  placeholder={isEdit ? "••••••••" : "Mínimo 8 caracteres"}
                  className="pr-9 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="button" variant="outline" onClick={() => { set("password", generateSecurePassword()); setShowPwd(true) }}>
                <Sparkles className="h-4 w-4 mr-1" /> Generar
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 min-w-0">
              <Label htmlFor="role">Rol</Label>
              <Select value={form.role} onValueChange={(v) => set("role", v)}>
                <SelectTrigger id="role"><SelectValue placeholder="Selecciona un rol" /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => <SelectItem key={r.key} value={r.key}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-0">
              <Label>Sucursal</Label>
              <SucursalSelector
                value={form.subsidiary?.id || ""}
                onValueChange={(v) => {
                  const id = typeof v === "string" ? v : (v as any)?.id
                  set("subsidiary", { id })
                  // La main no debe duplicarse en las adicionales.
                  set("additionalSubsidiaries", (form.additionalSubsidiaries || []).filter((sid) => sid !== id))
                }}
              />
            </div>
          </div>

          {isSuperAdmin && (
            // min-w-0: DialogContent es `grid` — sin esto, un texto largo (varias
            // sucursales seleccionadas) empuja el grid item más ancho que el diálogo
            // en vez de truncarse.
            <div className="space-y-2 min-w-0">
              <Label>Sucursales adicionales</Label>
              <SucursalSelector
                multi
                insideAModal
                value={form.additionalSubsidiaries || []}
                onValueChange={(v) => {
                  const ids = Array.isArray(v) ? (v as any[]).map((x) => (typeof x === "string" ? x : x?.id)) : []
                  set("additionalSubsidiaries", ids.filter((id) => id && id !== form.subsidiary?.id))
                }}
              />
              <p className="text-xs text-muted-foreground">Además de la sucursal principal, este usuario podrá ver/operar estas.</p>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
