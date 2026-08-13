"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bell, CheckCircle2, Loader2, Mail, MessageCircle, RefreshCw, Send, XCircle } from "lucide-react"
import { useAuthStore } from "@/store/auth.store"
import { useToast } from "@/hooks/use-toast"
import {
  SupportTicketService,
  type ChannelHealth,
  type ChannelStatus,
  type ChannelTestResult,
} from "@/lib/services/support-ticket.service"

const SUPER_ROLES = ["superadmin", "superamin"]

const CHANNELS: { key: keyof ChannelHealth; label: string; icon: typeof Bell }[] = [
  { key: "bell", label: "Campana (app)", icon: Bell },
  { key: "email", label: "Correo", icon: Mail },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
]

export function SupportChannelsCard() {
  const role = (useAuthStore((s) => s.user?.role) || "").toString().toLowerCase()
  const isSuper = SUPER_ROLES.includes(role)
  const { toast } = useToast()

  const [health, setHealth] = useState<ChannelHealth | null>(null)
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [test, setTest] = useState<ChannelTestResult | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      setHealth(await SupportTicketService.getChannelHealth())
    } catch {
      toast({ title: "No se pudo leer el estado de canales", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isSuper) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuper])

  const runTest = async () => {
    setTesting(true)
    setTest(null)
    try {
      const res = await SupportTicketService.sendChannelTest()
      setTest(res)
      const ok = Object.values(res).filter((r) => r.sent).length
      toast({ title: `Prueba enviada: ${ok}/${Object.keys(res).length} canales` })
    } catch {
      toast({ title: "No se pudo enviar la prueba", variant: "destructive" })
    } finally {
      setTesting(false)
    }
  }

  if (!isSuper) return null

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Canales de notificación</h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="h-7" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="outline" size="sm" className="h-7 gap-1.5" onClick={runTest} disabled={testing}>
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Enviar prueba
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {CHANNELS.map(({ key, label, icon: Icon }) => {
            const c: ChannelStatus | undefined = health?.[key]
            const t = test?.[key]
            return (
              <div key={key} className="flex items-start gap-2.5 text-sm">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium">{label}</span>
                    {c && (c.ready
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      : <XCircle className="h-3.5 w-3.5 text-red-500" />)}
                    {t && (
                      <span className={`text-xs ${t.sent ? "text-green-600" : "text-red-500"}`}>
                        · prueba {t.sent ? "enviada" : "falló"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground break-words">
                    {c?.detail ?? "—"}
                    {t && !t.sent && t.error ? ` (${t.error})` : ""}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
