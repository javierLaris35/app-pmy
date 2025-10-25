"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { SucursalSelector } from "@/components/sucursal-selector"
import type { Subsidiary, User } from "@/lib/types"

export interface UserFormData {
  id?: string
  name: string
  lastName: string
  email: string
  password?: string
  role: "admin" | "user"
  subsidiary: {
    id: string
  }
  active?: boolean
}

interface UserDialogProps {
  user?: User | null
  open: boolean
  onClose: () => void
  onSubmit: (form: UserFormData) => Promise<void>
}

export function UserDialog({ user, open, onClose, onSubmit }: UserDialogProps) {
  const [form, setForm] = useState<UserFormData>({
    name: "",
    lastName: "",
    email: "",
    password: "",
    role: "user",
    subsidiary:  null,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({
        id: user.id,
        name: user.name || "",
        lastName: user.lastName || "",
        email: user.email,
        role: user.role,
        subsidiary: user.subsidiary || "",
        password: "",
      })
    } else {
      setForm({
        name: "",
        lastName: "",
        email: "",
        password: "",
        role: "user",
        subsidiary: null,
      })
    }
  }, [user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubsidiaryChange = (value: string) => {
    setForm((prev) => ({ ...prev, subsidiary: {id: value} }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    await onSubmit(form)
    setIsSubmitting(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{form.id ? "Editar usuario" : "Agregar nuevo usuario"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" name="name" value={form.name} onChange={handleInputChange} required />
          </div>
          <div>
            <Label htmlFor="lastName">Apellido</Label>
            <Input id="lastName" name="lastName" value={form.lastName} onChange={handleInputChange} required />
          </div>
          <div>
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" name="email" value={form.email} onChange={handleInputChange} required />
          </div>
          {!form.id && (
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="password" name="password" value={form.password} onChange={handleInputChange} required />
            </div>
          )}
          <div>
            {/*role: 'admin' | 'user' | 'auxiliar' | 'superamin' | 'bodega';*/}
            <Label htmlFor="role">Rol</Label>
            <select
              id="role"
              name="role"
              value={form.role}
              onChange={handleInputChange}
              className="w-full border rounded-md p-2"
            >
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
              <option value="auxiliar">Auxiliar/Finanzas</option>
              <option value="bodega">Bodega</option>
            </select>
          </div>
          <div>
            <Label htmlFor="subsidiaryId">Sucursal</Label>
            <SucursalSelector
              value={form.subsidiary}
              onValueChange={handleSubsidiaryChange}
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {form.id ? "Actualizar" : "Crear"} Usuario
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
