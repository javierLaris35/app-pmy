"use client";

import { useMemo, useState } from "react";
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
  Store,
  FileSpreadsheet,
  Radar,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useAuthStore } from "@/store/auth.store";
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries";
import { useWelcomeDashboard } from "@/hooks/services/dashboard/use-welcome-dashboard";
import { exportWelcomeToExcel } from "@/lib/services/dashboard/export-welcome-to-excel";
import { cn } from "@/lib/utils";
import {
  ALL_SUBSIDIARIES,
  TONE_ACCENT,
  TONE_CHIP,
  type FeedItem,
  type FilterKey,
} from "./types";
import type { FedexVerifyResult } from "@/lib/services/dashboard";

const GLOBAL_ROLES = ["superadmin", "superamin", "owner"];

interface WelcomeDashboardViewProps {
  variant: "dialog" | "page";
  /** Navegación a un módulo (el diálogo cierra antes de navegar; la página solo enruta). */
  onNavigate: (route: string) => void;
  /** Solo diálogo: abre la página completa. */
  onOpenFullPage?: () => void;
}

/**
 * Vista compartida del resumen operativo. Contiene TODA la lógica de presentación
 * (selector de sucursal, comprobación FedEx, exportación a Excel, feed priorizado)
 * y se reutiliza tanto en el diálogo de bienvenida como en la página completa.
 */
export function WelcomeDashboardView({ variant, onNavigate, onOpenFullPage }: WelcomeDashboardViewProps) {
  const user = useAuthStore((s) => s.user);
  const { subsidiaries } = useSubsidiaries();

  // SCOPING (espejo del SucursalSelector/backend): globales ven todas; los demás,
  // su sucursal main + las adicionales que un superadmin les asignó.
  const role = String(user?.role || "").toLowerCase();
  const isGlobal = GLOBAL_ROLES.includes(role);
  const visibleSubsidiaries = useMemo(() => {
    if (isGlobal) return subsidiaries;
    const allowed = new Set(
      [user?.subsidiary?.id, ...((user?.additionalSubsidiaries || []).map((s) => s.id))].filter(Boolean),
    );
    return subsidiaries.filter((s) => allowed.has(s.id));
  }, [subsidiaries, isGlobal, user]);

  // El selector aparece solo si hay algo entre qué elegir.
  const showSelector = isGlobal || visibleSubsidiaries.length > 1;

  // Selección: por defecto la sucursal main del usuario; si no tiene (p.ej. superadmin
  // global), "Todas". `ALL_SUBSIDIARIES` = sin filtro (todas las visibles).
  const [selected, setSelected] = useState<string>(() => user?.subsidiary?.id || ALL_SUBSIDIARIES);
  const subsidiaryIds = selected === ALL_SUBSIDIARIES ? [] : [selected];
  const scopeLabel =
    selected === ALL_SUBSIDIARIES
      ? "Todas las sucursales"
      : visibleSubsidiaries.find((s) => s.id === selected)?.name || "Sucursal";

  const {
    isLoading,
    stats,
    expiringPackages,
    withoutDEXPackages,
    pendingPackages,
    feed,
    refetch,
    fedexResults,
    isVerifying,
    verifiedAt,
    verifyFedex,
  } = useWelcomeDashboard({ subsidiaryIds });

  const [filter, setFilter] = useState<FilterKey>("all");
  const [isExporting, setIsExporting] = useState(false);

  const criticalCount = feed.filter((f) => f.tone === "critical").length;
  const totalAttention = stats.expiringToday + stats.withoutDEX + stats.pendingYesterday;

  const filtered = feed.filter((it) => {
    if (filter === "all") return true;
    if (filter === "critical") return it.tone === "critical";
    return it.kind === filter;
  });

  const health =
    criticalCount > 0
      ? { label: "Atención crítica", cls: "bg-red-100 text-red-700 border-red-200", Icon: ShieldAlert }
      : totalAttention > 0
      ? { label: "Requiere atención", cls: "bg-amber-100 text-amber-700 border-amber-200", Icon: ShieldAlert }
      : { label: "Todo al día", cls: "bg-green-100 text-green-700 border-green-200", Icon: ShieldCheck };

  const distribution = [
    { key: "expiring" as FilterKey, label: "Vencen hoy", value: stats.expiringToday, bar: "bg-red-500", dot: "bg-red-500" },
    { key: "dex" as FilterKey, label: "Sin escaneo", value: stats.withoutDEX, bar: "bg-amber-500", dot: "bg-amber-500" },
    { key: "pending" as FilterKey, label: "Pendientes", value: stats.pendingYesterday, bar: "bg-slate-400", dot: "bg-slate-400" },
  ];

  const segments: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "Todos", count: feed.length },
    { key: "critical", label: "Críticos", count: criticalCount },
    { key: "expiring", label: "Vencen hoy", count: stats.expiringToday },
    { key: "dex", label: "Sin escaneo", count: stats.withoutDEX },
    { key: "pending", label: "Pendientes", count: stats.pendingYesterday },
  ];

  // Resumen de la comprobación FedEx (una vez ejecutada).
  const fedexSummary = useMemo(() => {
    if (!fedexResults.size) return null;
    let delivered = 0;
    let notFound = 0;
    fedexResults.forEach((r) => {
      if (r.found && r.isDelivered) delivered += 1;
      if (!r.found) notFound += 1;
    });
    return { total: fedexResults.size, delivered, notFound };
  }, [fedexResults]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportWelcomeToExcel({
        stats,
        expiringPackages,
        withoutDEXPackages,
        pendingPackages,
        scopeLabel,
        fedexResults,
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Barra de control: alcance (sucursal + fecha) a la izquierda, acciones a la derecha */}
      <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {showSelector ? (
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="h-9 w-[220px] gap-2 bg-background sm:w-[248px]">
                <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
                <SelectValue className="flex-1 truncate text-left" placeholder="Sucursal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SUBSIDIARIES}>Todas las sucursales</SelectItem>
                {visibleSubsidiaries.map((s) => (
                  <SelectItem key={s.id} value={s.id!}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
              {scopeLabel}
            </span>
          )}
          <span className="hidden whitespace-nowrap text-sm capitalize text-muted-foreground md:inline">
            {format(new Date(), "EEEE dd 'de' MMMM", { locale: es })}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 bg-background" onClick={verifyFedex} disabled={isVerifying || feed.length === 0}>
            {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
            {isVerifying ? "Comprobando…" : "Comprobar FedEx"}
          </Button>

          <Button variant="outline" size="sm" className="gap-1.5 bg-background" onClick={handleExport} disabled={isExporting || isLoading}>
            <FileSpreadsheet className="h-4 w-4" />
            Excel
          </Button>

          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 bg-background" onClick={refetch} disabled={isLoading} title="Actualizar" aria-label="Actualizar">
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>

          {variant === "dialog" && onOpenFullPage && (
            <Button size="sm" className="gap-1.5" onClick={onOpenFullPage}>
              <ExternalLink className="h-4 w-4" />
              Ver completo
            </Button>
          )}
        </div>
      </div>

      {fedexSummary && (
        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Comprobación FedEx: <span className="font-semibold text-foreground">{fedexSummary.total}</span> guía(s)
          {" · "}
          <span className="font-semibold text-green-600">{fedexSummary.delivered}</span> entregada(s) en FedEx
          {fedexSummary.notFound > 0 && (
            <>
              {" · "}
              <span className="font-semibold text-red-600">{fedexSummary.notFound}</span> sin dato
            </>
          )}
          {verifiedAt && <> · {format(verifiedAt, "HH:mm:ss")}</>}
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <span>Cargando resumen…</span>
        </div>
      ) : (
        <>
          {/* Hero: magnitud + distribución */}
          <div className="rounded-xl border bg-gradient-to-br from-muted/40 to-background p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Requieren tu atención</p>
              <span className={cn("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold", health.cls)}>
                <health.Icon className="h-3.5 w-3.5" />
                {health.label}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="shrink-0">
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
                          ),
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
            <KpiCard active={filter === "expiring"} onClick={() => setFilter("expiring")} icon={Clock} label="Vencen hoy" value={stats.expiringToday} hint={criticalCount > 0 ? `${criticalCount} en estado crítico` : "Próximos a vencer"} tone={stats.expiringToday > 0 ? (criticalCount > 0 ? "critical" : "warn") : "ok"} />
            <KpiCard active={filter === "dex"} onClick={() => setFilter("dex")} icon={FileWarning} label="Sin escaneo local" value={stats.withoutDEX} hint="Sin código 67/44 según la sucursal" tone={stats.withoutDEX > 0 ? "warn" : "ok"} />
            <KpiCard active={filter === "pending"} onClick={() => setFilter("pending")} icon={Calendar} label="Pendientes" value={stats.pendingYesterday} hint="De días anteriores" tone={stats.pendingYesterday > 0 ? "info" : "ok"} />
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
                      filter === s.key ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted text-muted-foreground",
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
                  <FeedRow key={it.key} item={it} fedex={fedexResults.get(it.trackingNumber)} onAction={() => onNavigate(it.route)} />
                ))}
              </div>
            )}

            {/* Atajos a módulos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <ShortcutButton icon={Truck} label="Monitoreo" onClick={() => onNavigate("/operaciones/monitoreo")} />
              <ShortcutButton icon={Package} label="Inventarios" onClick={() => onNavigate("/operaciones/inventarios")} />
              <ShortcutButton icon={ArrowRight} label="Salidas a ruta" onClick={() => onNavigate("/operaciones/salidas-a-ruta")} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Una fila del feed, con badge opcional del estatus fresco de FedEx. */
function FeedRow({ item, fedex, onAction }: { item: FeedItem; fedex?: FedexVerifyResult; onAction: () => void }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-l-4 px-3 py-2.5 transition-colors hover:bg-muted/40", TONE_ACCENT[item.tone])}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          {item.carrier && (
            <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", item.carrier.toUpperCase() === "DHL" ? "bg-[#ffcc00] text-[#d40511]" : "bg-[#4d148c] text-white")}>
              {item.carrier}
            </span>
          )}
          <span className="font-mono text-sm font-semibold truncate">{item.trackingNumber}</span>
          <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold", TONE_CHIP[item.tone])}>{item.metric}</span>
          {fedex && <FedexBadge result={fedex} />}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">{item.recipientName}</span>
          {item.sub && <span className="text-muted-foreground/50">·</span>}
          {item.sub && <span className="truncate capitalize">{item.sub}</span>}
          <span className="text-muted-foreground/50">·</span>
          <span className="truncate">{item.subsidiaryName}</span>
        </div>
      </div>
      <Button size="sm" variant="outline" className="shrink-0 gap-1 text-xs" onClick={onAction}>
        {item.actionLabel}
        <ArrowRight className="h-3 w-3" />
      </Button>
    </div>
  );
}

/** Badge con el resultado de re-verificar contra FedEx. */
function FedexBadge({ result }: { result: FedexVerifyResult }) {
  if (!result.found) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700" title={result.error || "Sin dato en FedEx"}>
        FedEx: sin dato
      </span>
    );
  }
  const cls = result.isDelivered ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold", cls)} title={result.lastEvent?.description || result.description || undefined}>
      FedEx: {result.isDelivered ? "Entregado" : result.status || "—"}
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, hint, tone, active, onClick }: { icon: React.ElementType; label: string; value: number; hint: string; tone: "critical" | "warn" | "info" | "ok"; active?: boolean; onClick: () => void }) {
  const toneCls =
    tone === "critical" ? "text-red-600" : tone === "warn" ? "text-amber-600" : tone === "info" ? "text-slate-600" : "text-green-600";
  return (
    <button type="button" onClick={onClick} className={cn("group rounded-xl border p-4 text-left transition-all hover:shadow-sm", active ? "border-primary ring-1 ring-primary/30 bg-primary/5" : "hover:border-foreground/20")}>
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
