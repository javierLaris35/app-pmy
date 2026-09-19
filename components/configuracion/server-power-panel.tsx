"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Power,
  PowerOff,
  Moon,
  Sun,
  Loader2,
  Save,
  Mail,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "@/lib/toast";
import {
  getPowerSchedule,
  updatePowerSchedule,
  suspendServerNow,
  sendPowerTestEmail,
  type PowerSchedule,
} from "@/lib/services/server-power";

const DAYS: { iso: number; label: string }[] = [
  { iso: 1, label: "Lun" },
  { iso: 2, label: "Mar" },
  { iso: 3, label: "Mié" },
  { iso: 4, label: "Jue" },
  { iso: 5, label: "Vie" },
  { iso: 6, label: "Sáb" },
  { iso: 7, label: "Dom" },
];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Fecha ISO → "vie 18 sep, 09:30 p. m." (o "—"). */
function fmt(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es-MX", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

/**
 * Programación de energía del servidor (solo superadmin). El servidor se suspende
 * y despierta solo según este horario; también permite suspenderlo de inmediato.
 */
export function ServerPowerPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [testing, setTesting] = useState(false);

  const [enabled, setEnabled] = useState(true);
  const [suspendTime, setSuspendTime] = useState("21:30");
  const [wakeTime, setWakeTime] = useState("06:00");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [status, setStatus] = useState<PowerSchedule["status"] | null>(null);

  const hydrate = useCallback((s: PowerSchedule) => {
    setEnabled(s.enabled);
    setSuspendTime(s.suspendTime);
    setWakeTime(s.wakeTime);
    setDays([...s.days].sort((a, b) => a - b));
    setRecipients(s.recipients ?? []);
    setStatus(s.status);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await getPowerSchedule();
        if (alive) hydrate(s);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || "No se pudo cargar la programación de energía.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [hydrate]);

  const toggleDay = (iso: number) => {
    setDays((prev) => (prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso].sort((a, b) => a - b)));
  };

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      toast.error("Correo no válido.");
      return;
    }
    if (recipients.includes(email)) {
      toast.error("Ese correo ya está en la lista.");
      return;
    }
    setRecipients((prev) => [...prev, email]);
    setNewEmail("");
  };

  const removeEmail = (email: string) => setRecipients((prev) => prev.filter((e) => e !== email));

  const validate = (): string | null => {
    if (!TIME_RE.test(suspendTime)) return "La hora de suspensión no es válida.";
    if (!TIME_RE.test(wakeTime)) return "La hora de encendido no es válida.";
    if (days.length === 0) return "Selecciona al menos un día.";
    if (recipients.length === 0) return "Agrega al menos un correo de aviso.";
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      const s = await updatePowerSchedule({ enabled, suspendTime, wakeTime, days, recipients });
      hydrate(s);
      toast.success("Programación guardada y aplicada al servidor.");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo guardar la programación.");
    } finally {
      setSaving(false);
    }
  };

  const suspendNow = async () => {
    setSuspending(true);
    try {
      const r = await suspendServerNow();
      toast.success(r.message || "El servidor se está suspendiendo.");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo suspender el servidor.");
    } finally {
      setSuspending(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      await sendPowerTestEmail();
      toast.success("Correo de prueba enviado.");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo enviar el correo de prueba.");
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando programación…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="h-5 w-5" /> Programación de energía
          </CardTitle>
          <CardDescription>
            El servidor se suspende y se enciende solo según este horario. Recibirás un correo
            cuando se suspenda y cuando despierte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Activado */}
          <div className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
            <div className="space-y-0.5">
              <Label htmlFor="power-enabled">Suspensión automática</Label>
              <p className="text-sm text-muted-foreground">
                Si la apagas, el servidor no se suspenderá solo (pero puedes suspenderlo manualmente abajo).
              </p>
            </div>
            <Switch id="power-enabled" checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {/* Horas */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="suspend-time" className="flex items-center gap-1.5">
                <Moon className="h-4 w-4" /> Se suspende a las
              </Label>
              <Input
                id="suspend-time"
                type="time"
                value={suspendTime}
                onChange={(e) => setSuspendTime(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wake-time" className="flex items-center gap-1.5">
                <Sun className="h-4 w-4" /> Se enciende a las
              </Label>
              <Input
                id="wake-time"
                type="time"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="w-40"
              />
            </div>
          </div>

          {/* Días */}
          <div className="space-y-2">
            <Label>Días que se suspende</Label>
            <div className="flex flex-wrap gap-3">
              {DAYS.map((d) => (
                <label
                  key={d.iso}
                  className="flex cursor-pointer select-none items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
                >
                  <Checkbox checked={days.includes(d.iso)} onCheckedChange={() => toggleDay(d.iso)} />
                  {d.label}
                </label>
              ))}
            </div>
          </div>

          {/* Correos */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Mail className="h-4 w-4" /> Correos de aviso
            </Label>
            <div className="space-y-2">
              {recipients.map((email) => (
                <div key={email} className="flex items-center gap-2">
                  <span className="flex-1 truncate rounded-md bg-muted/40 px-3 py-1.5 text-sm">{email}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeEmail(email)}
                    aria-label={`Quitar ${email}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {recipients.length === 0 && (
                <p className="text-sm text-muted-foreground">Aún no hay correos. Agrega al menos uno.</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="email"
                placeholder="correo@ejemplo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addEmail();
                  }
                }}
                className="max-w-xs"
              />
              <Button type="button" variant="outline" size="sm" onClick={addEmail}>
                <Plus className="mr-1 h-4 w-4" /> Agregar
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
              Guardar
            </Button>
            <Button variant="outline" onClick={sendTest} disabled={testing}>
              {testing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Mail className="mr-1 h-4 w-4" />}
              Enviar correo de prueba
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md bg-muted/40 px-3 py-2">
              <p className="text-xs text-muted-foreground">Próximo apagado</p>
              <p className="text-sm font-medium">{fmt(status?.nextSuspend ?? null)}</p>
            </div>
            <div className="rounded-md bg-muted/40 px-3 py-2">
              <p className="text-xs text-muted-foreground">Próximo encendido</p>
              <p className="text-sm font-medium">{fmt(status?.nextWake ?? null)}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Programación:</span>
            {status?.timerActive ? (
              <Badge variant="outline" className="gap-1 text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Activa
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <PowerOff className="h-3.5 w-3.5" /> Inactiva
              </Badge>
            )}
            <span className="text-muted-foreground">· Última aplicación: {fmt(status?.lastAppliedAt ?? null)}</span>
          </div>
          {status?.lastApplyError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Último error al aplicar: {status.lastApplyError}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suspender ahora */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PowerOff className="h-5 w-5 text-destructive" /> Suspender ahora
          </CardTitle>
          <CardDescription>
            Suspende el servidor de inmediato. Despertará solo a la hora configurada
            (<b>{wakeTime}</b>). Durante la suspensión el sistema no estará disponible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={suspending}>
                {suspending ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <PowerOff className="mr-1 h-4 w-4" />
                )}
                Suspender ahora
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Suspender el servidor ahora?</AlertDialogTitle>
                <AlertDialogDescription>
                  El servidor se dormirá de inmediato y todos perderán acceso hasta que despierte
                  automáticamente a las <b>{wakeTime}</b>. Úsalo solo si estás seguro.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={suspendNow}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sí, suspender ahora
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Separator className="opacity-0" />
    </div>
  );
}
