"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Gavel, Loader2, UserPlus, X } from "lucide-react"
import { useAuthStore } from "@/store/auth.store"
import { useToast } from "@/hooks/use-toast"
import { SupportTicketService, type ZoneAuthorizer } from "@/lib/services/support-ticket.service"
import { getZones } from "@/lib/services/zones"
import { getUsers } from "@/lib/services/users"

const SUPER_ROLES = ["superadmin", "superamin"]

export function SupportAuthorizersCard() {
  const role = (useAuthStore((s) => s.user?.role) || "").toString().toLowerCase()
  const isSuper = SUPER_ROLES.includes(role)
  const { toast } = useToast()

  const [zones, setZones] = useState<{ id: string; name: string }[]>([])
  const [users, setUsers] = useState<{ id: string; name?: string; email?: string }[]>([])
  const [authorizers, setAuthorizers] = useState<ZoneAuthorizer[]>([])
  const [zoneId, setZoneId] = useState("")
  const [userId, setUserId] = useState("")
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const [z, u, a] = await Promise.all([getZones(), getUsers(), SupportTicketService.listAuthorizers()])
      setZones((z as any[]).map((x) => ({ id: x.id, name: x.name })))
      setUsers((u as any[]).map((x) => ({ id: x.id, name: x.name, email: x.email })))
      setAuthorizers(a)
    } catch {
      toast({ title: "No se pudo cargar la configuración de autorizadores", variant: "destructive" })
    }
  }

  useEffect(() => {
    if (isSuper) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuper])

  const byZone = useMemo(() => {
    const m = new Map<string, ZoneAuthorizer[]>()
    for (const a of authorizers) m.set(a.zoneId, [...(m.get(a.zoneId) ?? []), a])
    return m
  }, [authorizers])

  const zoneName = (id: string) => zones.find((z) => z.id === id)?.name ?? id

  const add = async () => {
    if (!zoneId || !userId) return
    setSaving(true)
    try {
      await SupportTicketService.addAuthorizer(zoneId, userId)
      setUserId("")
      await load()
    } catch {
      toast({ title: "No se pudo agregar el autorizador", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    try {
      await SupportTicketService.removeAuthorizer(id)
      setAuthorizers((prev) => prev.filter((a) => a.id !== id))
    } catch {
      toast({ title: "No se pudo quitar el autorizador", variant: "destructive" })
    }
  }

  if (!isSuper) return null

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-1.5">
          <Gavel className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Autorizadores por zona</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Quien aprueba las <b>mejoras</b> de cada zona. Basta que un autorizador apruebe.
        </p>

        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1">
            <Select value={zoneId} onValueChange={setZoneId}>
              <SelectTrigger><SelectValue placeholder="Zona" /></SelectTrigger>
              <SelectContent>
                {zones.map((z) => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 flex-1">
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue placeholder="Usuario" /></SelectTrigger>
              <SelectContent>
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name ?? u.email ?? u.id}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={add} disabled={!zoneId || !userId || saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />} Agregar
          </Button>
        </div>

        <div className="space-y-2">
          {[...byZone.entries()].length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin autorizadores configurados. Las mejoras sin autorizador de zona las aprueba el superadmin.</p>
          ) : (
            [...byZone.entries()].map(([zid, list]) => (
              <div key={zid} className="rounded-md border p-2">
                <p className="mb-1.5 text-xs font-medium">{zoneName(zid)}</p>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((a) => (
                    <Badge key={a.id} variant="secondary" className="gap-1">
                      {a.userName ?? a.userEmail ?? a.userId}
                      <button type="button" onClick={() => remove(a.id)} aria-label="Quitar" className="ml-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
