"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useUsers } from "@/hooks/services/users/use-users" // Importar tu nuevo hook
import type { Role, User } from "@/lib/types"

const getUserRoles = async (usuarioId: string): Promise<Role[]> => {
  if (usuarioId === "1") {
    return [
      { id: "1", name: "Administrador", description: "Acceso completo al sistema", isDefault: true },
      { id: "2", name: "Usuario", description: "Acceso limitado al sistema", isDefault: false },
    ]
  }
  return [{ id: "2", name: "Usuario", description: "Acceso limitado al sistema", isDefault: false }]
}

const asignarRolAUsuario = async (usuarioId: string, rolId: string): Promise<void> => {
  console.log(`Rol ${rolId} asignado al usuario ${usuarioId}`)
}

const quitarRolDeUsuario = async (usuarioId: string, rolId: string): Promise<void> => {
  console.log(`Rol ${rolId} quitado del usuario ${usuarioId}`)
}

export default function UsuariosPage() {
  const { users, isLoading, isError, mutate } = useUsers()
  const [roles, setRoles] = useState<Role[]>([])
  const [selectedUsuario, setSelectedUsuario] = useState<User | null>(null)
  const [usuarioRoles, setUsuarioRoles] = useState<Role[]>([])
  const [loadingRoles, setLoadingRoles] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (users.length > 0 && !selectedUsuario) {
      setSelectedUsuario(users[0])
    }s
  }, [users])

  useEffect(() => {
    if (selectedUsuario) {
      loadUsuarioRoles(selectedUsuario.id)
    }
  }, [selectedUsuario])

  useEffect(() => {
    const rolesData: Role[] = [
      { id: "1", name: "Administrador", description: "Acceso completo al sistema", isDefault: true },
      { id: "2", name: "Usuario", description: "Acceso limitado al sistema", isDefault: false },
      { id: "3", name: "Invitado", description: "Acceso muy limitado", isDefault: false },
    ]
    setRoles(rolesData)
  }, [])

  const loadUsuarioRoles = async (usuarioId: string) => {
    setLoadingRoles(true)
    try {
      const rolesData = await getUserRoles(usuarioId)
      setUsuarioRoles(rolesData)
    } catch (error) {
      console.error("Error al cargar roles del usuario:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los roles del usuario",
        variant: "destructive",
      })
    } finally {
      setLoadingRoles(false)
    }
  }

  const handleToggleRol = async (rol: Role, isChecked: boolean) => {
    if (!selectedUsuario) return

    try {
      if (isChecked) {
        await asignarRolAUsuario(selectedUsuario.id, rol.id)
        setUsuarioRoles((prev) => [...prev, rol])
      } else {
        await quitarRolDeUsuario(selectedUsuario.id, rol.id)
        setUsuarioRoles((prev) => prev.filter((r) => r.id !== rol.id))
      }
    } catch (error) {
      console.error("Error al actualizar rol:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el rol",
        variant: "destructive",
      })
    }
  }

  const isRolAsignado = (rolId: string) => {
    return usuarioRoles.some((r) => r.id === rolId)
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestión de Usuarios</h2>
          <p className="text-muted-foreground">Administra los usuarios y sus roles</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Usuarios</CardTitle>
                <CardDescription>Selecciona un usuario para gestionar sus roles</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : isError ? (
                  <div className="text-red-500 text-sm">Error al cargar usuarios</div>
                ) : (
                  <div className="space-y-2">
                    {users.map((usuario) => (
                      <div
                        key={usuario.id}
                        className={`p-3 rounded-md cursor-pointer ${
                          selectedUsuario?.id === usuario.id ? "bg-secondary" : "hover:bg-secondary/50"
                        }`}
                        onClick={() => setSelectedUsuario(usuario)}
                      >
                        <div className="font-medium">
                          {usuario.name} {usuario.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">{usuario.email}</div>
                        <div className="mt-1">
                          <Badge variant={usuario.role === "admin" ? "default" : "secondary"}>
                            {usuario.role === "admin" ? "Administrador" : "Usuario"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="col-span-1 md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedUsuario ? `Roles de ${selectedUsuario.name} ${selectedUsuario.lastName}` : "Roles"}
                </CardTitle>
                <CardDescription>
                  {selectedUsuario
                    ? "Gestiona los roles asignados a este usuario"
                    : "Selecciona un usuario para gestionar sus roles"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedUsuario ? (
                  <div className="flex items-center justify-center py-4">
                    <p className="text-muted-foreground">Selecciona un usuario para ver sus roles</p>
                  </div>
                ) : loadingRoles ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {roles.map((rol) => (
                        <div key={rol.id} className="flex items-start space-x-2 p-3 rounded-md border">
                          <Checkbox
                            id={`rol-${rol.id}`}
                            checked={isRolAsignado(rol.id)}
                            onCheckedChange={(checked) => handleToggleRol(rol, checked === true)}
                          />
                          <div className="grid gap-1.5">
                            <Label htmlFor={`rol-${rol.id}`} className="font-medium">
                              {rol.name}
                            </Label>
                            {rol.description && <p className="text-sm text-muted-foreground">{rol.description}</p>}
                            {rol.isDefault && (
                              <Badge variant="outline" className="w-fit">
                                Predeterminado
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}