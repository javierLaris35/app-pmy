"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, MessageCircle, Smartphone, LinkIcon, Unlink, RefreshCw, CheckCircle2, AlertTriangle, Send, Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast";
import {
  getWhatsappSettings, updateWhatsappSettings, type WhatsappSettings,
  getWhatsappConnection, linkWhatsapp, logoutWhatsapp, sendWhatsappMessage, type WhatsappConnection,
} from "@/lib/services/whatsapp-settings";
import {
  listWhatsappTemplates, createWhatsappTemplate, updateWhatsappTemplate, deleteWhatsappTemplate,
  WHATSAPP_PLACEHOLDERS, type WhatsappTemplate,
} from "@/lib/services/whatsapp-templates";

const EMPTY: WhatsappSettings = { enabled: true };

function prettyPhone(digits?: string | null): string {
  const d = (digits || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("52")) return `+52 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  return d ? `+${d}` : "—";
}

/**
 * Conexión del gateway auto-hospedado: muestra el estado, el QR para vincular un
 * número (se escanea desde WhatsApp del teléfono → Dispositivos vinculados) y
 * permite desconectar. Poll cada 2s mientras se está vinculando/conectando.
 */
function WhatsappConnectionCard() {
  const [conn, setConn] = useState<WhatsappConnection | null>(null);
  const [busy, setBusy] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = async () => {
    try { setConn(await getWhatsappConnection()); } catch { /* noop */ }
  };

  useEffect(() => {
    refresh();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Mientras haya QR o esté conectando, refrescamos para detectar cuando se conecta.
  useEffect(() => {
    const active = conn?.status === "qr" || conn?.status === "connecting";
    if (active && !pollRef.current) {
      pollRef.current = setInterval(refresh, 2000);
    } else if (!active && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [conn?.status]);

  const handleLink = async () => {
    setBusy(true);
    try { setConn(await linkWhatsapp()); } catch (e: any) { toast.error(e?.response?.data?.message || "No se pudo iniciar la vinculación."); } finally { setBusy(false); }
  };
  const handleLogout = async () => {
    setBusy(true);
    try { setConn(await logoutWhatsapp()); toast.success("WhatsApp desvinculado."); } catch { toast.error("No se pudo desvincular."); } finally { setBusy(false); }
  };
  const handleTest = async () => {
    const to = testPhone.replace(/\D/g, "");
    if (!to) { toast.error("Escribe un número para la prueba (ej. tu propio WhatsApp)."); return; }
    setTesting(true);
    try {
      await sendWhatsappMessage("✅ Mensaje de prueba de PMY. La conexión de WhatsApp funciona correctamente.", to);
      toast.success(`Mensaje de prueba enviado a ${prettyPhone(to)}.`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo enviar el mensaje de prueba.");
    } finally {
      setTesting(false);
    }
  };

  const status = conn?.status ?? "disconnected";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-emerald-600" /> Conexión de WhatsApp</CardTitle>
        <CardDescription>
          El sistema envía los mensajes desde un número de WhatsApp vinculado (como un dispositivo más). Escanea el QR una sola vez.
          Usa un número <strong>dedicado</strong>: es una integración no oficial y el número podría ser bloqueado por WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === "connected" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></span>
                <div>
                  <p className="font-semibold text-emerald-800">Conectado</p>
                  <p className="text-sm text-muted-foreground">Enviando desde {prettyPhone(conn?.me)}</p>
                </div>
              </div>
              <Button variant="outline" onClick={handleLogout} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unlink className="mr-2 h-4 w-4" />} Desvincular
              </Button>
            </div>

            {/* Prueba de envío — valida la conexión antes de usarla en rutas. */}
            <div className="rounded-lg border p-4">
              <Label htmlFor="wa-test" className="text-sm font-semibold">Enviar mensaje de prueba</Label>
              <p className="mb-2 mt-0.5 text-xs text-muted-foreground">Manda un mensaje de prueba (ej. a tu propio WhatsApp) para confirmar que todo funciona.</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="wa-test"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="Número destino (ej. 526441234567)"
                  className="sm:max-w-xs"
                />
                <Button onClick={handleTest} disabled={testing} className="bg-emerald-600 text-white hover:bg-emerald-700">
                  {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {testing ? "Enviando…" : "Enviar prueba"}
                </Button>
              </div>
            </div>
          </div>
        ) : status === "qr" && conn?.qr ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">En tu teléfono: WhatsApp → <strong>Dispositivos vinculados</strong> → Vincular dispositivo, y escanea:</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={conn.qr} alt="QR de WhatsApp" className="h-56 w-56 rounded-lg border bg-white p-2" />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Esperando escaneo…</p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
                {status === "connecting" ? <Loader2 className="h-5 w-5 animate-spin" /> : <AlertTriangle className="h-5 w-5" />}
              </span>
              <div>
                <p className="font-semibold">{status === "connecting" ? "Conectando…" : "Sin vincular"}</p>
                <p className="text-sm text-muted-foreground">
                  {status === "connecting" ? "Estableciendo conexión con WhatsApp." : "No hay ningún número vinculado; no se pueden enviar mensajes."}
                </p>
                {conn?.lastError && status !== "connecting" && (
                  <p className="mt-0.5 text-xs text-rose-600">Último error: {conn.lastError}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={refresh} disabled={busy} aria-label="Actualizar estado"><RefreshCw className="h-4 w-4" /></Button>
              <Button onClick={handleLink} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />} Vincular número
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Gestor de plantillas de WhatsApp: lista editable de mensajes por evento
 * (salida a ruta, desembarque, inventario, reporte, prioridad de entrega…).
 * El número destino NO se define aquí: se elige al enviar la notificación.
 */
function TemplatesManagerCard() {
  const [templates, setTemplates] = useState<WhatsappTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<WhatsappTemplate>>({});
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = async (keepId?: string | null) => {
    try {
      const all = await listWhatsappTemplates();
      setTemplates(all);
      const pick = all.find((t) => t.id === keepId) ?? all[0] ?? null;
      setSelectedId(pick?.id ?? null);
      setDraft(pick ? { ...pick } : {});
      setCreating(false);
    } catch {
      toast.error("No se pudieron cargar las plantillas de WhatsApp.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const select = (t: WhatsappTemplate) => { setSelectedId(t.id); setDraft({ ...t }); setCreating(false); };

  const startNew = () => { setCreating(true); setSelectedId(null); setDraft({ key: "", name: "", body: "", active: true }); };

  const insertPlaceholder = (ph: string) => setDraft((d) => ({ ...d, body: `${d.body ?? ""}${ph}` }));

  const handleSave = async () => {
    if (!draft.name?.trim() || !draft.body?.trim()) { toast.error("Nombre y cuerpo son obligatorios."); return; }
    if (creating && !draft.key?.trim()) { toast.error("La clave es obligatoria para una plantilla nueva."); return; }
    setSaving(true);
    try {
      const saved = creating
        ? await createWhatsappTemplate({ key: draft.key!.trim(), name: draft.name, body: draft.body, active: draft.active ?? true })
        : await updateWhatsappTemplate(selectedId!, { name: draft.name, body: draft.body, active: draft.active });
      toast.success("Plantilla guardada.");
      await load(saved.id);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo guardar la plantilla.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm("¿Eliminar esta plantilla?")) return;
    setSaving(true);
    try {
      await deleteWhatsappTemplate(selectedId);
      toast.success("Plantilla eliminada.");
      await load(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo eliminar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-600" /> Plantillas de WhatsApp</CardTitle>
        <CardDescription>
          Mensajes por evento (salida a ruta, desembarque, inventario, reportes…). Al enviar una notificación se elige la plantilla y el número destino (custom, chofer o encargado). Usa <span className="font-mono">*texto*</span> para negritas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando…
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[220px_1fr]">
            {/* Lista de plantillas */}
            <div className="space-y-1">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => select(t)}
                  className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${selectedId === t.id ? "border-emerald-300 bg-emerald-50" : "hover:bg-muted/50"}`}
                >
                  <span className="truncate">{t.name}</span>
                  {!t.active && <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">inactiva</span>}
                </button>
              ))}
              <Button variant="outline" size="sm" className="mt-1 w-full gap-1" onClick={startNew}>
                <Plus className="h-3.5 w-3.5" /> Nueva plantilla
              </Button>
            </div>

            {/* Editor */}
            {(selectedId || creating) ? (
              <div className="space-y-3">
                {creating && (
                  <div className="space-y-1.5">
                    <Label htmlFor="wa-tpl-key">Clave</Label>
                    <Input id="wa-tpl-key" value={draft.key ?? ""} onChange={(e) => setDraft((d) => ({ ...d, key: e.target.value }))} placeholder="ej. salida_ruta" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="wa-tpl-name">Nombre</Label>
                  <Input id="wa-tpl-name" value={draft.name ?? ""} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wa-tpl-body">Mensaje</Label>
                  <Textarea id="wa-tpl-body" value={draft.body ?? ""} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} rows={9} className="font-mono text-xs" />
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Variables (clic para insertar):</p>
                    <div className="flex flex-wrap gap-1.5">
                      {WHATSAPP_PLACEHOLDERS.map((p) => (
                        <button key={p.key} type="button" title={p.desc} onClick={() => insertPlaceholder(p.key)} className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px] text-emerald-700 ring-1 ring-border hover:bg-emerald-50">{p.key}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <Label htmlFor="wa-tpl-active">Activa</Label>
                  <Switch id="wa-tpl-active" checked={draft.active ?? true} onCheckedChange={(v) => setDraft((d) => ({ ...d, active: v }))} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  {!creating ? (
                    <Button variant="ghost" size="sm" className="gap-1 text-rose-600 hover:text-rose-700" onClick={handleDelete} disabled={saving}>
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </Button>
                  ) : <span />}
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {creating ? "Crear plantilla" : "Guardar"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Selecciona o crea una plantilla.</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function WhatsappConfigPanel() {
  const [data, setData] = useState<WhatsappSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getWhatsappSettings()
      .then((d) => setData({ ...EMPTY, ...d }))
      .catch(() => toast.error("No se pudo cargar la configuración de WhatsApp."))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveEnabled = async (enabled: boolean) => {
    setData((p) => ({ ...p, enabled }));
    setSaving(true);
    try {
      await updateWhatsappSettings({ enabled });
      toast.success("Configuración de WhatsApp guardada.");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <WhatsappConnectionCard />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-600" /> Avisos por WhatsApp</CardTitle>
          <CardDescription>
            Interruptor general del envío de avisos por WhatsApp. El número destino se elige al enviar cada notificación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-16 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Cargando…
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="wa-enabled">Función activa</Label>
                <p className="text-sm text-muted-foreground">Habilita el envío de notificaciones por WhatsApp en la app.</p>
              </div>
              <Switch id="wa-enabled" checked={data.enabled} disabled={saving} onCheckedChange={handleSaveEnabled} />
            </div>
          )}
        </CardContent>
      </Card>
      <TemplatesManagerCard />
    </div>
  );
}
