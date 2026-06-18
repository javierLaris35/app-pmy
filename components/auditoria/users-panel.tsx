"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Search, Activity, Monitor, MapPin, Globe, LogIn, LogOut, Loader2, Download, Boxes, ArrowUpDown, AlertTriangle,
} from "lucide-react";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuditUsers, useAuditUserDetail } from "@/hooks/services/audit/use-audit";
import { exportAuditExcel } from "@/lib/services/audit";

const AVATAR_COLORS = ["bg-indigo-500","bg-violet-500","bg-pink-500","bg-amber-500","bg-emerald-500","bg-cyan-500","bg-rose-500","bg-lime-500"];
const initials = (s?: string) => (s || "?").split(/[\s@.]/).filter(Boolean).slice(0, 2).map((x) => x[0]?.toUpperCase()).join("") || "?";
const colorFor = (s?: string) => AVATAR_COLORS[(s || "").length % AVATAR_COLORS.length];
const fmt = (d?: string | null) => (d ? format(new Date(d), "dd/MM/yyyy HH:mm") : "—");
const relative = (d?: string | null) => {
  if (!d) return "nunca";
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
};

function Bars({ rows, labelKey }: { rows: any[]; labelKey: string }) {
  const max = Math.max(1, ...rows.map((r) => Number(r.count)));
  if (rows.length === 0) return <p className="text-xs text-muted-foreground">Sin datos.</p>;
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs mb-0.5"><span className="truncate">{r[labelKey] || "—"}</span><span className="font-semibold tabular-nums">{Number(r.count)}</span></div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${(Number(r.count) / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function StatTile({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border p-3 ${className || ""}`}>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function UserDetailDialog({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const today = new Date();
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [from, setFrom] = useState(format(monthAgo, "yyyy-MM-dd"));
  const [to, setTo] = useState(format(today, "yyyy-MM-dd"));
  const [exporting, setExporting] = useState(false);
  const fromISO = `${from}T00:00:00`;
  const toISO = `${to}T23:59:59`;

  const { detail, isLoading, error } = useAuditUserDetail(userId, fromISO, toISO);
  const d = detail;

  const doExport = async () => {
    if (!userId) return;
    try {
      setExporting(true);
      const blob = await exportAuditExcel({ userId, dateFrom: fromISO, dateTo: toISO });
      saveAs(blob, `auditoria_${d?.user?.email || userId}_${from}_${to}.xlsx`);
    } catch {
      toast.error("No se pudo exportar el historial");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-11 w-11"><AvatarFallback className={`text-white font-bold ${colorFor(d?.user?.name)}`}>{initials(d?.user?.name)}</AvatarFallback></Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate">{d?.user?.name || "Detalle de usuario"}</span>
                {d?.online && <span className="inline-flex items-center gap-1 text-[11px] font-normal text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> en línea</span>}
              </div>
              {d?.user?.email && (
                <p className="text-xs font-normal text-muted-foreground">
                  {d.user.email} · <span className="uppercase">{d.user.role}</span>{d.user.subsidiary ? ` · ${d.user.subsidiary}` : ""}
                </p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {error ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <AlertTriangle className="h-9 w-9 text-amber-500" />
            <p className="text-sm font-medium">No se pudo cargar el detalle del usuario.</p>
            <p className="text-xs text-muted-foreground">Verifica que el backend esté actualizado/reiniciado. ({(error as any)?.message || "error"})</p>
          </div>
        ) : isLoading || !d ? (
          <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div>
            <div className="space-y-4">
              {/* Rango + export */}
              <div className="flex flex-wrap items-center gap-2">
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-[150px]" />
                <span className="text-muted-foreground text-sm">→</span>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-[150px]" />
                <Button size="sm" variant="outline" className="ml-auto" onClick={doExport} disabled={exporting}>
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}<span className="ml-1">Excel</span>
                </Button>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-3 gap-3">
                <StatTile label="Eventos" value={d.totals?.total ?? 0} />
                <StatTile label="Errores" value={<span className="text-amber-600">{d.totals?.errors ?? 0}</span>} />
                <StatTile label="% Error" value={`${d.totals?.errorRate ?? 0}%`} />
              </div>

              {/* Tabs */}
              <Tabs defaultValue="resumen">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="resumen" className="text-xs">Resumen</TabsTrigger>
                  <TabsTrigger value="accesos" className="text-xs">Accesos</TabsTrigger>
                  <TabsTrigger value="sesiones" className="text-xs">Sesiones</TabsTrigger>
                  <TabsTrigger value="eventos" className="text-xs">Eventos</TabsTrigger>
                </TabsList>

                <TabsContent value="resumen" className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card><CardContent className="p-4"><p className="text-sm font-semibold mb-2 flex items-center gap-2"><Activity className="h-4 w-4 text-indigo-500" /> Acciones</p><Bars rows={d.byAction || []} labelKey="action" /></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-sm font-semibold mb-2 flex items-center gap-2"><Boxes className="h-4 w-4 text-purple-500" /> Módulos</p><Bars rows={d.byModule || []} labelKey="module" /></CardContent></Card>
                </TabsContent>

                <TabsContent value="accesos" className="mt-3 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card><CardContent className="p-4">
                      <p className="text-sm font-semibold mb-2 flex items-center gap-2"><Monitor className="h-4 w-4 text-cyan-500" /> Dispositivos</p>
                      {(d.devices || []).length === 0 ? <p className="text-xs text-muted-foreground">Sin datos.</p> : (
                        <div className="space-y-1">{(d.devices || []).map((dv: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs border-b py-1 last:border-0">
                            <span className="truncate">{dv.device || "—"}</span>
                            <span className="text-muted-foreground shrink-0">{dv.count} · {relative(dv.lastSeen)}</span>
                          </div>
                        ))}</div>
                      )}
                    </CardContent></Card>
                    <Card><CardContent className="p-4">
                      <p className="text-sm font-semibold mb-2 flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-500" /> Ubicaciones</p>
                      {(d.locations || []).length === 0 ? <p className="text-xs text-muted-foreground">Sin datos.</p> : (
                        <div className="space-y-1">{(d.locations || []).map((l: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs border-b py-1 last:border-0">
                            <span className="truncate">{[l.city, l.country].filter(Boolean).join(", ") || "—"}</span>
                            <span className="text-muted-foreground shrink-0">{l.count}</span>
                          </div>
                        ))}</div>
                      )}
                    </CardContent></Card>
                  </div>
                  <Card><CardContent className="p-4">
                    <p className="text-sm font-semibold mb-2 flex items-center gap-2"><Globe className="h-4 w-4 text-blue-500" /> IPs</p>
                    <div className="flex flex-wrap gap-2">
                      {(d.ips || []).length === 0 ? <p className="text-xs text-muted-foreground">Sin datos.</p>
                        : (d.ips || []).map((ip: any, i: number) => <Badge key={i} variant="outline" className="font-mono text-[11px]">{ip.ip || "—"} · {ip.count}</Badge>)}
                    </div>
                  </CardContent></Card>
                </TabsContent>

                <TabsContent value="sesiones" className="mt-3">
                  <Card><CardContent className="p-4">
                    {(d.sessions || []).length === 0 ? <p className="text-xs text-muted-foreground">Sin sesiones registradas.</p> : (
                      <div className="space-y-1">{(d.sessions || []).map((s: any) => (
                        <div key={s.id} className="flex items-center gap-2 text-xs border-b py-1.5 last:border-0">
                          <span className={`grid h-6 w-6 place-items-center rounded-full ${s.action === "logout" ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"}`}>
                            {s.action === "logout" ? <LogOut className="h-3.5 w-3.5" /> : <LogIn className="h-3.5 w-3.5" />}
                          </span>
                          <span className="font-medium">{s.action === "logout" ? "Cerró sesión" : "Inició sesión"}</span>
                          <span className="text-muted-foreground">{fmt(s.createdAt)}</span>
                          <span className="ml-auto text-muted-foreground truncate">{[s.geoCity, s.geoCountry].filter(Boolean).join(", ")}{s.publicIp ? ` · ${s.publicIp}` : ""}</span>
                        </div>
                      ))}</div>
                    )}
                  </CardContent></Card>
                </TabsContent>

                <TabsContent value="eventos" className="mt-3">
                  <Card><CardContent className="p-2">
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-1 p-2">{(d.recent || []).map((e: any) => (
                        <div key={e.id} className="flex items-center gap-2 text-xs border-b py-1.5 last:border-0">
                          <Badge variant="secondary" className="text-[10px]">{e.action}</Badge>
                          <span className="font-medium">{e.module}</span>
                          <span className="text-muted-foreground font-mono truncate">{e.entityId || ""}</span>
                          <span className="ml-auto text-muted-foreground shrink-0">{fmt(e.createdAt)}</span>
                        </div>
                      ))}
                      {(d.recent || []).length === 0 && <p className="text-xs text-muted-foreground p-2">Sin eventos en el rango.</p>}
                      </div>
                    </ScrollArea>
                  </CardContent></Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

type SortCol = "name" | "eventCount" | "lastActivityAt";

export function UsersPanel() {
  const { users, isLoading } = useAuditUsers();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [subFilter, setSubFilter] = useState("all");
  const [onlineFilter, setOnlineFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortCol>("lastActivityAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<string | null>(null);

  const roles = Array.from(new Set(users.map((u) => u.role).filter(Boolean)));
  const subs = Array.from(new Set(users.map((u) => u.subsidiary).filter(Boolean)));

  const filtered = users.filter((u) => {
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.role?.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchSub = subFilter === "all" || u.subsidiary === subFilter;
    const matchOnline = onlineFilter === "all" || (onlineFilter === "online" ? u.online : !u.online);
    return matchSearch && matchRole && matchSub && matchOnline;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "name") {
      const r = (a.name || "").localeCompare(b.name || "");
      return sortDir === "asc" ? r : -r;
    }
    const av = sortBy === "eventCount" ? a.eventCount : (a.lastActivityAt ? +new Date(a.lastActivityAt) : 0);
    const bv = sortBy === "eventCount" ? b.eventCount : (b.lastActivityAt ? +new Date(b.lastActivityAt) : 0);
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const toggleSort = (col: SortCol) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("desc"); }
  };
  const SortHead = ({ col, label, className }: { col: SortCol; label: string; className?: string }) => (
    <TableHead className={className}>
      <button type="button" onClick={() => toggleSort(col)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label} <ArrowUpDown className={`h-3 w-3 ${sortBy === col ? "text-foreground" : "opacity-40"}`} />
      </button>
    </TableHead>
  );
  const selectCls = "h-9 rounded-md border bg-background px-2 text-sm";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar usuario..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <select className={selectCls} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">Rol: todos</option>{roles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className={selectCls} value={subFilter} onChange={(e) => setSubFilter(e.target.value)}>
          <option value="all">Sucursal: todas</option>{subs.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={selectCls} value={onlineFilter} onChange={(e) => setOnlineFilter(e.target.value)}>
          <option value="all">Todos</option><option value="online">En línea</option><option value="offline">Desconectados</option>
        </select>
        <span className="text-xs text-muted-foreground ml-auto">{sorted.length} usuarios</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead col="name" label="Usuario" />
                <TableHead>Rol</TableHead>
                <TableHead>Sucursal</TableHead>
                <SortHead col="eventCount" label="Eventos" className="text-right" />
                <SortHead col="lastActivityAt" label="Última actividad" />
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((u) => (
                <TableRow key={u.id} className="cursor-pointer" onClick={() => setSelected(u.id)}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Avatar className="h-8 w-8"><AvatarFallback className={`text-white text-[11px] font-bold ${colorFor(u.name)}`}>{initials(u.name)}</AvatarFallback></Avatar>
                        {u.online && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium leading-tight truncate flex items-center gap-1.5">{u.name}{!u.active && <Badge variant="secondary" className="text-[9px]">inactivo</Badge>}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{u.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px] uppercase">{u.role}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.subsidiary || "—"}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{u.eventCount}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{relative(u.lastActivityAt)}</TableCell>
                  <TableCell>
                    {u.online
                      ? <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> en línea</span>
                      : <span className="text-[11px] text-muted-foreground">desconectado</span>}
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">Sin usuarios.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <UserDetailDialog userId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
