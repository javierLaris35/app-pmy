"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Panel, PanelContent, PanelDescription, PanelHeader, PanelTitle } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUsers } from "@/hooks/services/users/use-users";
import {
  evaluateOpsAlerts,
  getOpsSettings,
  getOpsSubsidiaries,
  getWhatsappGroups,
  OpsSettings,
  OpsSubsidiaryConfig,
  updateOpsSettings,
  updateOpsSubsidiary,
} from "@/lib/services/ops-alerts";
import { toast } from "@/lib/toast";
import { Loader2, Pencil, Play, Save } from "lucide-react";

const errText = (e: unknown, f: string) => {
  const m = (e as any)?.response?.data?.message;
  return typeof m === "string" && (e as any)?.response?.status < 500 ? m : f;
};

const STEP_COLS: { key: keyof OpsSubsidiaryConfig; label: string }[] = [
  { key: "stepUpload", label: "Subir" },
  { key: "stepUnloading", label: "Desembarque" },
  { key: "stepDispatch", label: "Salida a ruta" },
  { key: "stepClosure", label: "Cierre" },
  { key: "stepInventory", label: "Inventario" },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs font-semibold text-slate-700">{label}</Label>
      {children}
      {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
    </div>
  );
}

/** Configuración → Alertas operativas (solo superadmin). */
export function OpsAlertsPanel() {
  const { data: settings, mutate: mutateSettings } = useSWR("/ops-alerts/settings", getOpsSettings);
  const { data: subs, mutate: mutateSubs } = useSWR("/ops-alerts/subsidiaries", getOpsSubsidiaries);
  const [form, setForm] = useState<OpsSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<OpsSubsidiaryConfig | null>(null);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const set = <K extends keyof OpsSettings>(k: K, v: OpsSettings[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  async function save(patch?: Partial<OpsSettings>) {
    if (!form) return;
    setSaving(true);
    try {
      await updateOpsSettings(patch ?? form);
      toast.success(patch?.enabled !== undefined ? (patch.enabled ? "Alertas activadas" : "Alertas pausadas") : "Configuración guardada");
      await mutateSettings();
    } catch (e) {
      toast.error(errText(e, "No se pudo guardar"));
    } finally {
      setSaving(false);
    }
  }

  async function toggleStep(row: OpsSubsidiaryConfig, key: keyof OpsSubsidiaryConfig, value: boolean) {
    try {
      await updateOpsSubsidiary(row.subsidiaryId, { [key]: value });
      await mutateSubs();
    } catch (e) {
      toast.error(errText(e, "No se pudo guardar"));
    }
  }

  async function runNow() {
    try {
      const r = await evaluateOpsAlerts();
      toast.success(r.skipped ? r.skipped : `Revisión hecha: ${r.notified} aviso(s), ${r.resolved} resuelta(s)`);
    } catch (e) {
      toast.error(errText(e, "No se pudo revisar"));
    }
  }

  if (!form || !subs) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader>
          <PanelTitle>Alertas operativas</PanelTitle>
          <PanelDescription>
            Avisa cuando un consolidado que llegó por correo no se sube, no se desembarca, no sale a ruta o no se cierra a tiempo, y cuando una sucursal no hace su inventario del día.
          </PanelDescription>
        </PanelHeader>
        <PanelContent className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Switch checked={form.enabled} disabled={saving} onCheckedChange={(v) => save({ enabled: v })} />
              {form.enabled ? "Alertas activas" : "Alertas pausadas"}
            </label>
            {form.enabled && form.enabledAt && <span className="text-xs text-slate-500">Lo que ya estaba atrasado antes de activarlas se muestra, pero no se avisa.</span>}
            <Button size="sm" variant="outline" className="ml-auto gap-1.5" onClick={runNow}>
              <Play className="h-4 w-4" /> Revisar ahora
            </Button>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Plazos (iguales para todas las sucursales)</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Field label="Subir el consolidado" hint="minutos después del correo">
                <Input type="number" min={1} value={form.uploadMinutes} onChange={(e) => set("uploadMinutes", Number(e.target.value))} className="h-9" />
              </Field>
              <Field label="Desembarque" hint="el mismo día, a más tardar">
                <Input type="time" value={form.unloadingTime} onChange={(e) => set("unloadingTime", e.target.value)} className="h-9" />
              </Field>
              <Field label="Salida a ruta" hint="del día siguiente, a más tardar">
                <Input type="time" value={form.dispatchTime} onChange={(e) => set("dispatchTime", e.target.value)} className="h-9" />
              </Field>
              <Field label="Cierre de ruta" hint="el día de la salida">
                <Input type="time" value={form.closureTime} onChange={(e) => set("closureTime", e.target.value)} className="h-9" />
              </Field>
              <Field label="Inventario del día" hint="todos los días">
                <Input type="time" value={form.inventoryTime} onChange={(e) => set("inventoryTime", e.target.value)} className="h-9" />
              </Field>
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Escalamiento y reglas</p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Field label="Avisar al encargado" hint="minutos después de vencer">
                <Input type="number" min={1} value={form.escalate1Min} onChange={(e) => set("escalate1Min", Number(e.target.value))} className="h-9" />
              </Field>
              <Field label="Avisar a supervisión" hint="minutos después de vencer">
                <Input type="number" min={1} value={form.escalate2Min} onChange={(e) => set("escalate2Min", Number(e.target.value))} className="h-9" />
              </Field>
              <Field label="Paso completo al" hint="% de las guías">
                <Input type="number" min={1} max={100} value={form.completePct} onChange={(e) => set("completePct", Number(e.target.value))} className="h-9" />
              </Field>
              <Field label="Avisar desde" hint="hora de inicio de avisos">
                <Input type="time" value={form.activeFrom} onChange={(e) => set("activeFrom", e.target.value)} className="h-9" />
              </Field>
              <Field label="Avisar hasta" hint="después no se manda nada">
                <Input type="time" value={form.activeTo} onChange={(e) => set("activeTo", e.target.value)} className="h-9" />
              </Field>
            </div>
          </div>

          <div className="flex justify-end">
            <Button size="sm" className="gap-1.5" onClick={() => save()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar plazos
            </Button>
          </div>
        </PanelContent>
      </Panel>

      <Panel>
        <PanelHeader>
          <PanelTitle>Por sucursal</PanelTitle>
          <PanelDescription>Qué pasos aplican a cada sucursal, quién es su encargado y a qué WhatsApp llega el último aviso.</PanelDescription>
        </PanelHeader>
        <PanelContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-9 px-3">Sucursal</TableHead>
                  {STEP_COLS.map((c) => (
                    <TableHead key={c.key} className="h-9 px-2 text-center">
                      {c.label}
                    </TableHead>
                  ))}
                  <TableHead className="h-9 px-2">Encargados</TableHead>
                  <TableHead className="h-9 px-2">WhatsApp</TableHead>
                  <TableHead className="h-9 px-2" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {subs.map((r) => (
                  <TableRow key={r.subsidiaryId}>
                    <TableCell className="px-3 py-1.5 text-sm font-medium">{r.subsidiaryName}</TableCell>
                    {STEP_COLS.map((c) => (
                      <TableCell key={c.key} className="px-2 py-1.5 text-center">
                        <Switch checked={!!r[c.key]} onCheckedChange={(v) => toggleStep(r, c.key, v)} aria-label={`${c.label} en ${r.subsidiaryName}`} />
                      </TableCell>
                    ))}
                    <TableCell className="px-2 py-1.5 text-xs">{r.managerUserIds.length ? `${r.managerUserIds.length} persona(s)` : <span className="text-amber-700">Sin encargado</span>}</TableCell>
                    <TableCell className="px-2 py-1.5 text-xs">
                      {r.whatsappNumbers.length + r.whatsappGroups.length ? `${r.whatsappNumbers.length} número(s) · ${r.whatsappGroups.length} grupo(s)` : <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-right">
                      <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => setEditing(r)}>
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </PanelContent>
      </Panel>

      <SubsidiaryContactsDialog row={editing} onClose={() => setEditing(null)} onSaved={() => mutateSubs()} />
    </div>
  );
}

/** Encargados y destinos de WhatsApp de una sucursal. */
function SubsidiaryContactsDialog({ row, onClose, onSaved }: { row: OpsSubsidiaryConfig | null; onClose: () => void; onSaved: () => void }) {
  const { users } = useUsers();
  const { data: groups, error: groupsError } = useSWR(row ? "/ops-alerts/whatsapp-groups" : null, getWhatsappGroups);
  const [managers, setManagers] = useState<string[]>([]);
  const [numbers, setNumbers] = useState("");
  const [selGroups, setSelGroups] = useState<{ id: string; name: string }[]>([]);
  const [q, setQ] = useState("");
  const [numError, setNumError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!row) return;
    setManagers(row.managerUserIds);
    setNumbers(row.whatsappNumbers.join("\n"));
    setSelGroups(row.whatsappGroups);
    setQ("");
    setNumError(null);
  }, [row]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (users as any[])
      .filter((u) => u.active !== false)
      .filter((u) => !t || `${u.name ?? ""} ${u.lastName ?? ""} ${u.email ?? ""}`.toLowerCase().includes(t))
      .sort((a, b) => Number(managers.includes(b.id)) - Number(managers.includes(a.id)) || `${a.name}`.localeCompare(`${b.name}`));
  }, [users, q, managers]);

  async function save() {
    if (!row) return;
    const nums = numbers.split(/[\n,;]+/).map((n) => n.replace(/\D/g, "")).filter(Boolean);
    if (nums.some((n) => n.length < 10)) {
      setNumError("Cada número debe tener al menos 10 dígitos, con lada del país (por ejemplo 52 662 123 4567).");
      return;
    }
    setSaving(true);
    try {
      await updateOpsSubsidiary(row.subsidiaryId, { managerUserIds: managers, whatsappNumbers: nums, whatsappGroups: selGroups });
      toast.success("Contactos guardados");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(errText(e, "No se pudo guardar"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Contactos de alertas · {row?.subsidiaryName}</DialogTitle>
          <DialogDescription>El encargado recibe el segundo aviso (app y correo). El WhatsApp recibe el último aviso.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Encargados ({managers.length})</Label>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar persona" className="h-9" />
            <div className="max-h-64 space-y-0.5 overflow-y-auto rounded-md border p-1">
              {list.map((u) => (
                <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                  <Checkbox
                    checked={managers.includes(u.id)}
                    onCheckedChange={(v) => setManagers((m) => (v ? [...m, u.id] : m.filter((x) => x !== u.id)))}
                  />
                  <span className="truncate">
                    {[u.name, u.lastName].filter(Boolean).join(" ") || u.email}
                    <span className="ml-1 text-xs text-slate-500">{u.subsidiary?.name ?? ""}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Números de WhatsApp</Label>
              <Textarea value={numbers} onChange={(e) => setNumbers(e.target.value)} rows={4} placeholder={"526621234567\n526241234567"} className="text-sm" />
              {numError ? <p className="text-xs text-red-600">{numError}</p> : <p className="text-[11px] text-slate-500">Uno por renglón, con lada del país (52…).</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Grupos de WhatsApp ({selGroups.length})</Label>
              {groupsError ? (
                <p className="text-xs text-amber-700">WhatsApp no está conectado. Vincula el número en Configuración → WhatsApp para elegir grupos.</p>
              ) : !groups ? (
                <p className="flex items-center gap-1 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando grupos…
                </p>
              ) : groups.length === 0 ? (
                <p className="text-xs text-slate-500">El número vinculado no está en ningún grupo.</p>
              ) : (
                <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-md border p-1">
                  {groups.map((g) => (
                    <label key={g.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                      <Checkbox
                        checked={selGroups.some((x) => x.id === g.id)}
                        onCheckedChange={(v) => setSelGroups((s) => (v ? [...s, { id: g.id, name: g.subject }] : s.filter((x) => x.id !== g.id)))}
                      />
                      <span className="truncate">{g.subject}</span>
                      <Badge variant="secondary" className="ml-auto px-1.5 py-0 text-[10px]">
                        {g.participants}
                      </Badge>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar contactos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
