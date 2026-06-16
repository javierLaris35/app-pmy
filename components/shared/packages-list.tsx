"use client";

import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Package } from "lucide-react";
import { PackageFilters } from "@/components/shared/package-filters";
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

  className?: string;
}

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
      ) : (
        <div className={cn("overflow-y-auto rounded-md border", maxHeightClass)}>
          {filtered.map((pkg) => {
            const key = getKey(pkg);
            const extra = renderExpanded?.(pkg);
            const isExpanded = expanded.has(key);
            return (
              <div key={key} className="border-b last:border-b-0">
                <PackageListItem
                  pkg={pkg}
                  onRemove={onRemove ?? (() => {})}
                  onTransfer={onTransfer}
                  onCompleteData={onCompleteData}
                  isLoading={isLoading}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
