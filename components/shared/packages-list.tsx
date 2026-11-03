"use client";

import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ChevronsDownUp, ChevronsUpDown, ChevronUp, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PackageFilters, computePackageFilterCounts } from "@/components/shared/package-filters";
import { PackageListItem, daysUntilCommit } from "@/components/shared/package-list-item";
import { PackageInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PackagesListProps {
  packages: PackageInfo[];
  /** Eliminar un paquete (PackageListItem lo llama con dhlUniqueId || trackingNumber). */
  onRemove?: (identifier: string) => void;
  /** Traspaso inline (subadmin+) para guías que no pertenecen a la sucursal. */
  onTransfer?: (pkg: PackageInfo) => void;
  /** Completar datos faltantes (desembarque). */
  onCompleteData?: (pkg: PackageInfo) => void;
  isLoading?: boolean;

  /** Barra de filtros estandarizada (la misma de inventario/salidas). Default: true. */
  showFilters?: boolean;
  searchPlaceholder?: string;

  /** Altura máxima del área scrolleable. Sin paginación: todo es local. */
  maxHeightClass?: string;

  emptyTitle?: string;
  emptyDescription?: string;

  /** Contenido expandible opcional por paquete (p. ej. piezas/remesa DHL). */
  renderExpanded?: (pkg: PackageInfo) => React.ReactNode;
  /** Texto del toggle expandible (cuando hay contenido). */
  expandLabel?: string;
  collapseLabel?: string;
  /** Identidad estable de cada paquete. Default: dhlUniqueId || trackingNumber || id. */
  getKey?: (pkg: PackageInfo) => string;
  /**
   * Agrupa visualmente la lista: pinta un encabezado (con conteo) cada vez que
   * cambia el grupo. La lista debe venir ya ordenada por ese grupo.
   */
  groupBy?: (pkg: PackageInfo) => string;
  /** Número de fila al inicio (estilo Excel / VS Code), según el orden mostrado. */
  showRowNumbers?: boolean;
  /**
   * Con `groupBy` por paquetería: cada grupo en su propio bloque (borde, encabezado de
   * color fijo al hacer scroll, plegable, numeración desde 1 y atajos "Ir a"), como en
   * Operaciones → Nueva salida. Solo si hay más de un grupo; si no, lista normal.
   */
  carrierBlocks?: boolean;

  className?: string;
}

/** Color del bloque por paquetería (mismo que Operaciones → Nueva salida). */
const carrierTone = (label: string) => {
  const l = label.toLowerCase();
  if (l.includes("fedex")) return "bg-violet-50 text-violet-800 border-violet-200 hover:bg-violet-100";
  if (l.includes("dhl")) return "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100";
  return "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100";
};

const defaultKey = (p: PackageInfo) => (p as any).dhlUniqueId || p.trackingNumber || (p.id as string);

/**
 * Lista estandarizada de paquetes (mismo estilo de inventario/salidas/desembarque).
 * Es LOCAL: no pagina, muestra todo con scroll. Reutilizable vía params; incluye
 * los filtros estandarizados (PackageFilters) y un panel expandible por fila (remesas).
 */
export function PackagesList({
  packages,
  onRemove,
  onTransfer,
  onCompleteData,
  isLoading,
  showFilters = true,
  searchPlaceholder = "Buscar por guía, CP, destinatario o dirección...",
  maxHeightClass = "max-h-[460px]",
  emptyTitle = "Sin paquetes",
  emptyDescription = "Aún no hay paquetes en esta lista.",
  renderExpanded,
  expandLabel = "Ver piezas de la remesa",
  collapseLabel = "Ocultar piezas",
  getKey = defaultKey,
  groupBy,
  showRowNumbers = false,
  carrierBlocks = false,
  className,
}: PackagesListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [carrier, setCarrier] = useState("all");
  const [onlyToday, setOnlyToday] = useState(false);
  const [onlyPayment, setOnlyPayment] = useState(false);
  const [priority, setPriority] = useState("all");
  const [type, setType] = useState("all");

  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // Mismo predicado de filtros que inventario/salidas.
  const matchesFilters = useCallback(
    (pkg: PackageInfo) => {
      const term = searchTerm.trim().toLowerCase();
      const uniqueId = ((pkg as any).dhlUniqueId || "").toLowerCase();
      const matchesSearch =
        !term ||
        pkg.trackingNumber?.toLowerCase().includes(term) ||
        uniqueId.includes(term) ||
        (pkg.recipientZip && pkg.recipientZip.includes(term)) ||
        (pkg.recipientName && pkg.recipientName.toLowerCase().includes(term)) ||
        (pkg.recipientAddress && pkg.recipientAddress.toLowerCase().includes(term));
      const matchesPriority = priority === "all" || pkg.priority === priority;
      const matchesType =
        type === "all" ||
        (type === "special" && (pkg.isCharge || pkg.isHighValue || pkg.payment)) ||
        (type === "normal" && !pkg.isCharge && !pkg.isHighValue && !pkg.payment);
      const matchesCarrier = carrier === "all" || pkg.shipmentType === carrier;
      const matchesToday = !onlyToday || daysUntilCommit(pkg.commitDateTime) === 0;
      const matchesPayment = !onlyPayment || !!pkg.payment;
      return matchesSearch && matchesPriority && matchesType && matchesCarrier && matchesToday && matchesPayment;
    },
    [searchTerm, priority, type, carrier, onlyToday, onlyPayment]
  );

  const filtered = useMemo(() => packages.filter(matchesFilters), [packages, matchesFilters]);

  const filterCounts = useMemo(() => computePackageFilterCounts(packages, daysUntilCommit), [packages]);

  // Acordeón de grupos (por ciudad / paquetería): grupos contraídos.
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const toggleGroup = (g: string) =>
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      next.has(g) ? next.delete(g) : next.add(g);
      return next;
    });

  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (groupBy) filtered.forEach((p) => counts.set(groupBy(p), (counts.get(groupBy(p)) ?? 0) + 1));
    return counts;
  }, [filtered, groupBy]);

  const activeFilterCount =
    (priority !== "all" ? 1 : 0) +
    (type !== "all" ? 1 : 0) +
    (carrier !== "all" ? 1 : 0) +
    (onlyToday ? 1 : 0) +
    (onlyPayment ? 1 : 0);

  const clearFilters = () => {
    setSearchTerm("");
    setCarrier("all");
    setOnlyToday(false);
    setOnlyPayment(false);
    setPriority("all");
    setType("all");
  };

  const hasActiveQuery = activeFilterCount > 0 || searchTerm.trim().length > 0;

  const renderItem = (pkg: PackageInfo, rowNumber?: number) => {
    const key = getKey(pkg);
    const extra = renderExpanded?.(pkg);
    const isExpanded = expanded.has(key);
    return (
      <>
        <PackageListItem
          pkg={pkg}
          onRemove={onRemove}
          onTransfer={onTransfer}
          onCompleteData={onCompleteData}
          isLoading={isLoading}
          index={rowNumber}
        />
        {extra ? (
          <>
            <button
              type="button"
              onClick={() => toggleExpanded(key)}
              className="flex w-full items-center gap-1.5 border-t bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60 transition-colors"
            >
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {isExpanded ? collapseLabel : expandLabel}
            </button>
            {isExpanded ? extra : null}
          </>
        ) : null}
      </>
    );
  };

  // Bloques por paquetería (en el orden de la lista; la lista ya viene agrupada).
  const blocks = useMemo(() => {
    if (!carrierBlocks || !groupBy) return null;
    const out: { label: string; items: PackageInfo[] }[] = [];
    for (const p of filtered) {
      const g = groupBy(p);
      const last = out[out.length - 1];
      if (last && last.label === g) last.items.push(p);
      else out.push({ label: g, items: [p] });
    }
    return out.length > 1 ? out : null;
  }, [carrierBlocks, groupBy, filtered]);
  const blockId = (label: string) => `bloque-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const goToBlock = (label: string) => {
    setCollapsedGroups((prev) => { const next = new Set(prev); next.delete(label); return next; });
    document.getElementById(blockId(label))?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className={cn("space-y-3", className)}>
      {showFilters && (
        <PackageFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder={searchPlaceholder}
          carrier={carrier}
          onCarrierChange={setCarrier}
          onlyToday={onlyToday}
          onToggleToday={() => setOnlyToday((v) => !v)}
          onlyPayment={onlyPayment}
          onTogglePayment={() => setOnlyPayment((v) => !v)}
          priority={priority}
          onPriorityChange={setPriority}
          type={type}
          onTypeChange={setType}
          activeFilterCount={activeFilterCount}
          onClear={clearFilters}
          counts={filterCounts}
        />
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-muted rounded-lg">
          <Package className="h-14 w-14 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="text-base font-medium text-muted-foreground mb-1">{emptyTitle}</h3>
          <p className="text-sm text-muted-foreground">
            {hasActiveQuery ? "Sin coincidencias para los filtros aplicados." : emptyDescription}
          </p>
        </div>
      ) : blocks ? (
        <div className="space-y-3">
          <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
            Ir a:
            {blocks.map((b) => (
              <Button
                key={b.label}
                type="button"
                size="sm"
                variant="outline"
                className={cn("h-7 px-2 text-xs", carrierTone(b.label))}
                onClick={() => goToBlock(b.label)}
              >
                {b.label} {b.items.length}
              </Button>
            ))}
          </div>
          {blocks.map((b) => {
            const collapsed = collapsedGroups.has(b.label);
            return (
              <section key={b.label} id={blockId(b.label)} className="scroll-mt-2 rounded-lg border">
                <button
                  type="button"
                  onClick={() => toggleGroup(b.label)}
                  aria-expanded={!collapsed}
                  className={cn(
                    "sticky top-0 z-10 flex w-full items-center gap-2 rounded-t-lg border-b px-3 py-2 text-left text-sm",
                    carrierTone(b.label),
                    collapsed && "rounded-b-lg border-b-0",
                  )}
                >
                  <span className="font-semibold">{b.label}</span>
                  <span className="tabular-nums">{b.items.length} {b.items.length === 1 ? "guía" : "guías"}</span>
                  <span className="ml-auto hidden text-xs opacity-80 sm:inline">Hoja propia en el PDF · pestaña {b.label} en el Excel</span>
                  {collapsed ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronUp className="h-4 w-4 shrink-0" />}
                </button>
                {!collapsed && (
                  <div className="divide-y">
                    {b.items.map((pkg, i) => (
                      <div key={getKey(pkg)}>{renderItem(pkg, showRowNumbers ? i + 1 : undefined)}</div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="space-y-1.5">
        {groupBy && groupCounts.size > 1 && (
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 gap-1 rounded-full px-2.5 text-xs text-muted-foreground"
              onClick={() =>
                setCollapsedGroups(
                  collapsedGroups.size >= groupCounts.size ? new Set() : new Set(groupCounts.keys()),
                )
              }
            >
              {collapsedGroups.size >= groupCounts.size ? (
                <><ChevronsUpDown className="h-3.5 w-3.5" /> Expandir todo</>
              ) : (
                <><ChevronsDownUp className="h-3.5 w-3.5" /> Contraer todo</>
              )}
            </Button>
          </div>
        )}
        <div className={cn("rounded-md border", maxHeightClass && "overflow-y-auto", maxHeightClass)}>
          {filtered.map((pkg, i) => {
            const key = getKey(pkg);
            const group = groupBy?.(pkg);
            const startsGroup = group !== undefined && (i === 0 || groupBy?.(filtered[i - 1]) !== group);
            const groupCollapsed = group !== undefined && collapsedGroups.has(group);
            if (groupCollapsed && !startsGroup) return null;
            return (
              <div key={key} className="border-b last:border-b-0">
                {startsGroup ? (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group!)}
                    aria-expanded={!groupCollapsed}
                    className={cn(
                      "sticky top-0 z-10 flex w-full items-center gap-1.5 bg-muted px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-muted/80 transition-colors",
                      !groupCollapsed && "border-b",
                    )}
                  >
                    {groupCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    <span>{group}</span>
                    <span className="ml-auto rounded-full bg-background px-1.5 text-[11px] tabular-nums">
                      {groupCounts.get(group!) ?? 0}
                    </span>
                  </button>
                ) : null}
                {groupCollapsed ? null : renderItem(pkg, showRowNumbers ? i + 1 : undefined)}
              </div>
            );
          })}
        </div>
        </div>
      )}
    </div>
  );
}
