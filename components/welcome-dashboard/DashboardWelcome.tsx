"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Truck,
  FileWarning,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAuthStore } from "@/store/auth.store";
import { getWelcomeDashboard } from "@/lib/services/dashboard";
import { cn } from "@/lib/utils";

interface PendingPackage {
  id: string;
  trackingNumber: string;
  recipientName: string;
  status: string;
  subsidiaryName: string;
  createdAt: string;
  reason?: string;
}

interface WithoutDEXPackage {
  id: string;
  trackingNumber: string;
  recipientName: string;
  subsidiaryName: string;
  carrier: string;
  missingDocument: string;
}

interface ExpiringPackage {
  id: string;
  trackingNumber: string;
  recipientName: string;
  expiryDate: string;
  subsidiaryName: string;
  hoursRemaining: number;
}

interface DashboardStats {
  pendingYesterday: number;
  withoutDEX: number;
  expiringToday: number;
}

interface DashboardWelcomeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

type Tone = "critical" | "warn" | "info";
type FilterKey = "all" | "critical" | "expiring" | "dex" | "pending";

interface FeedItem {
  key: string;
  kind: "expiring" | "dex" | "pending";
  tone: Tone;
  rank: number;
  trackingNumber: string;
  recipientName: string;
  subsidiaryName: string;
  carrier?: string;
  metric: string;
  sub?: string;
  actionLabel: string;
  route: string;
}

const TONE_ACCENT: Record<Tone, string> = {
  critical: "border-l-red-500",
  warn: "border-l-amber-400",
  info: "border-l-slate-300",
};

const TONE_CHIP: Record<Tone, string> = {
  critical: "bg-red-100 text-red-700",
  warn: "bg-amber-100 text-amber-700",
  info: "bg-slate-100 text-slate-600",
};

const daysOverdue = (iso: string) => {
  if (!iso) return 0;
  const d = new Date(iso).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - d) / 86_400_000));
};

export default function DashboardWelcome({ open, onOpenChange, userId }: DashboardWelcomeProps) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const subsidiaryId = user?.subsidiary?.id || (user as any)?.subsidiaryId || undefined;

  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({ pendingYesterday: 0, withoutDEX: 0, expiringToday: 0 });
  const [pendingPackages, setPendingPackages] = useState<PendingPackage[]>([]);
  const [withoutDEXPackages, setWithoutDEXPackages] = useState<WithoutDEXPackage[]>([]);
  const [expiringPackages, setExpiringPackages] = useState<ExpiringPackage[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    if (open) fetchDashboardData();
  }, [open, userId, subsidiaryId]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const data = await getWelcomeDashboard(subsidiaryId);
      setPendingPackages(data.pendingPackages ?? []);
      setWithoutDEXPackages(data.withoutDEXPackages ?? []);
      setExpiringPackages(data.expiringPackages ?? []);
      setStats(data.stats ?? { pendingYesterday: 0, withoutDEX: 0, expiringToday: 0 });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setPendingPackages([]);
      setWithoutDEXPackages([]);
      setExpiringPackages([]);
      setStats({ pendingYesterday: 0, withoutDEX: 0, expiringToday: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  const goTo = (route: string) => {
    onOpenChange(false);
    router.push(route);
  };

  // Feed unificado, ordenado por urgencia: lo más accionable primero.
  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];

    expiringPackages.forEach((p, i) => {
      const h = p.hoursRemaining ?? 0;
      const tone: Tone = h <= 4 ? "critical" : h <= 12 ? "warn" : "info";
      items.push({
        key: `exp-${p.id}-${i}`,
        kind: "expiring",
        tone,
        rank: tone === "critical" ? h : 30 + h,
        trackingNumber: p.trackingNumber,
        recipientName: p.recipientName,
        subsidiaryName: p.subsidiaryName,
        metric: h <= 0 ? "Vence hoy" : `Vence en ${h} h`,
        sub: p.expiryDate ? `Compromiso ${format(new Date(p.expiryDate), "HH:mm")}` : undefined,
        actionLabel: "Gestionar",
        route: "/operaciones/monitoreo",
      });
    });

    withoutDEXPackages.forEach((p, i) => {
      items.push({
        key: `dex-${p.id}-${i}`,
        kind: "dex",
        tone: "warn",
        rank: 20,
        trackingNumber: p.trackingNumber,
        recipientName: p.recipientName,
        subsidiaryName: p.subsidiaryName,
        carrier: p.carrier,
        metric: `Falta ${p.missingDocument}`,
        sub: "Bloquea procesamiento",
        actionLabel: "Revisar en inventario",
        route: "/operaciones/inventarios",
      });
    });

    pendingPackages.forEach((p, i) => {
      const d = daysOverdue(p.createdAt);
      items.push({
        key: `pen-${p.id}-${i}`,
        kind: "pending",
        tone: "info",
        rank: 100 + i,
        trackingNumber: p.trackingNumber,
        recipientName: p.recipientName,
        subsidiaryName: p.subsidiaryName,
        metric: d > 0 ? `Vencido hace ${d} ${d === 1 ? "día" : "días"}` : "Pendiente",
        sub: p.status,
        actionLabel: "Dar seguimiento",
        route: "/operaciones/monitoreo",
      });
    });

    return items.sort((a, b) => a.rank - b.rank);
  }, [expiringPackages, withoutDEXPackages, pendingPackages]);

  const criticalCount = feed.filter((f) => f.tone === "critical").length;
  const totalAttention = stats.expiringToday + stats.withoutDEX + stats.pendingYesterday;

  const filtered = feed.filter((it) => {
    if (filter === "all") return true;
    if (filter === "critical") return it.tone === "critical";
    return it.kind === filter;
  });

  // Salud general (para gerencia): un vistazo del estado.
  const health =
    criticalCount > 0
      ? { label: "Atención crítica", cls: "bg-red-100 text-red-700 border-red-200", Icon: ShieldAlert }
      : totalAttention > 0
      ? { label: "Requiere atención", cls: "bg-amber-100 text-amber-700 border-amber-200", Icon: ShieldAlert }
      : { label: "Todo al día", cls: "bg-green-100 text-green-700 border-green-200", Icon: ShieldCheck };

  const distribution = [
    { key: "expiring" as FilterKey, label: "Vencen hoy", value: stats.expiringToday, bar: "bg-red-500", dot: "bg-red-500" },
    { key: "dex" as FilterKey, label: "Sin 67", value: stats.withoutDEX, bar: "bg-amber-500", dot: "bg-amber-500" },
    { key: "pending" as FilterKey, label: "Pendientes", value: stats.pendingYesterday, bar: "bg-slate-400", dot: "bg-slate-400" },
  ];

  const segments: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "Todos", count: feed.length },
    { key: "critical", label: "Críticos", count: criticalCount },
    { key: "expiring", label: "Vencen hoy", count: stats.expiringToday },
    { key: "dex", label: "Sin 67", count: stats.withoutDEX },
    { key: "pending", label: "Pendientes", count: stats.pendingYesterday },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 gap-0 max-h-[92vh] flex flex-col overflow-hidden" showCloseButton={false}>
        {/* Header */}
        <DialogHeader className="space-y-0 border-b p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20">
                <Package className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl">Resumen operativo</DialogTitle>
                <DialogDescription className="truncate">
                  {format(new Date(), "EEEE dd 'de' MMMM", { locale: es })}
                  {user?.subsidiary?.name ? ` · ${user.subsidiary.name}` : ""}
                </DialogDescription>
              </div>
            </div>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium self-start", health.cls)}>
              <health.Icon className="h-4 w-4" />
              {health.label}
            </span>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading ? (
            <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
              <span>Cargando resumen…</span>
            </div>
          ) : (
            <>
              {/* Hero: magnitud + distribución (visión gerencial) */}
              <div className="rounded-xl border bg-gradient-to-br from-muted/40 to-background p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="shrink-0">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Requieren tu atención</p>
                    <div className="flex items-baseline gap-2">
                      <span className={cn("text-5xl font-bold tabular-nums", totalAttention === 0 ? "text-green-600" : "text-foreground")}>
                        {totalAttention}
                      </span>
                      <span className="text-sm text-muted-foreground">paquete{totalAttention === 1 ? "" : "s"}</span>
                    </div>
                    {criticalCount > 0 && (
                      <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-red-600">
                        <AlertTriangle className="h-3.5 w-3.5" /> {criticalCount} crítico{criticalCount === 1 ? "" : "s"} (vencen ≤ 4 h)
                      </p>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {totalAttention > 0 ? (
                      <>
                        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                          {distribution.map(
                            (d) =>
                              d.value > 0 && (
                                <div
                                  key={d.key}
                                  className={cn("h-full", d.bar)}
                                  style={{ width: `${(d.value / totalAttention) * 100}%` }}
                                  title={`${d.label}: ${d.value}`}
                                />
                              )
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                          {distribution.map((d) => (
                            <span key={d.key} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span className={cn("h-2 w-2 rounded-full", d.dot)} />
                              {d.label} <span className="font-semibold text-foreground">{d.value}</span>
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                        Sin pendientes ni vencimientos para hoy. ¡Todo en orden!
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* KPIs accionables */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <KpiCard
                  active={filter === "expiring"}
                  onClick={() => setFilter("expiring")}
                  icon={Clock}
                  label="Vencen hoy"
                  value={stats.expiringToday}
                  hint={criticalCount > 0 ? `${criticalCount} en estado crítico` : "Próximos a vencer"}
                  tone={stats.expiringToday > 0 ? (criticalCount > 0 ? "critical" : "warn") : "ok"}
                />
                <KpiCard
                  active={filter === "dex"}
                  onClick={() => setFilter("dex")}
                  icon={FileWarning}
                  label="Sin DEX / 67"
                  value={stats.withoutDEX}
                  hint="Bloquean procesamiento"
                  tone={stats.withoutDEX > 0 ? "warn" : "ok"}
                />
                <KpiCard
                  active={filter === "pending"}
                  onClick={() => setFilter("pending")}
                  icon={Calendar}
                  label="Pendientes"
                  value={stats.pendingYesterday}
                  hint="De días anteriores"
                  tone={stats.pendingYesterday > 0 ? "info" : "ok"}
                />
              </div>

              {/* Feed priorizado */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <ChevronRight className="h-4 w-4 text-primary" />
                    Prioridad de atención
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {segments.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setFilter(s.key)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                          filter === s.key ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted text-muted-foreground"
                        )}
                      >
                        {s.label}
                        <span className={cn("tabular-nums", filter === s.key ? "opacity-90" : "text-foreground/70")}>{s.count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-12 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mb-2" />
                    <p className="font-medium">Nada en esta vista</p>
                    <p className="text-sm text-muted-foreground">No hay paquetes que atender aquí.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border [&>div:last-child]:border-b-0">
                    {filtered.map((it) => (
                      <div
                        key={it.key}
                        className={cn("flex items-center justify-between gap-3 border-b border-l-4 px-3 py-2.5 transition-colors hover:bg-muted/40", TONE_ACCENT[it.tone])}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {it.carrier && (
                              <span
                                className={cn(
                                  "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                                  it.carrier.toUpperCase() === "DHL" ? "bg-[#ffcc00] text-[#d40511]" : "bg-[#4d148c] text-white"
                                )}
                              >
                                {it.carrier}
                              </span>
                            )}
                            <span className="font-mono text-sm font-semibold truncate">{it.trackingNumber}</span>
                            <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold", TONE_CHIP[it.tone])}>
                              {it.metric}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="truncate">{it.recipientName}</span>
                            {it.sub && <span className="text-muted-foreground/50">·</span>}
                            {it.sub && <span className="truncate capitalize">{it.sub}</span>}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 gap-1 text-xs"
                          onClick={() => goTo(it.route)}
                        >
                          {it.actionLabel}
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Atajos a módulos (decisión rápida) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <ShortcutButton icon={Truck} label="Monitoreo" onClick={() => goTo("/operaciones/monitoreo")} />
                  <ShortcutButton icon={Package} label="Inventarios" onClick={() => goTo("/operaciones/inventarios")} />
                  <ShortcutButton icon={ArrowRight} label="Salidas a ruta" onClick={() => goTo("/operaciones/salidas-a-ruta")} />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <label htmlFor="dontShowAgain" className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              id="dontShowAgain"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              onChange={(e) => {
                const userPrefsKey = `dashboard_prefs_${userId}`;
                localStorage.setItem(userPrefsKey, JSON.stringify({ showDailyWelcome: !e.target.checked }));
              }}
            />
            No mostrar este resumen al iniciar sesión
          </label>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button onClick={fetchDashboardData} disabled={isLoading} className="gap-2">
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              Actualizar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Tarjeta KPI clicable que filtra el feed. */
function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  hint: string;
  tone: "critical" | "warn" | "info" | "ok";
  active?: boolean;
  onClick: () => void;
}) {
  const toneCls =
    tone === "critical"
      ? "text-red-600"
      : tone === "warn"
      ? "text-amber-600"
      : tone === "info"
      ? "text-slate-600"
      : "text-green-600";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group rounded-xl border p-4 text-left transition-all hover:shadow-sm",
        active ? "border-primary ring-1 ring-primary/30 bg-primary/5" : "hover:border-foreground/20"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4", toneCls)} />
      </div>
      <div className={cn("mt-1 text-3xl font-bold tabular-nums", value === 0 ? "text-green-600" : toneCls)}>{value}</div>
      <p className="mt-0.5 text-xs text-muted-foreground">{value === 0 ? "Al día" : hint}</p>
    </button>
  );
}

function ShortcutButton({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <Button variant="ghost" onClick={onClick} className="justify-between border bg-muted/30 hover:bg-muted">
      <span className="flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </span>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
    </Button>
  );
}
