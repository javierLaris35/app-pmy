"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  getWelcomeDashboard,
  verifyWelcomeFedex,
  type FedexVerifyResult,
} from "@/lib/services/dashboard";
import {
  daysOverdue,
  type DashboardStats,
  type ExpiringPackage,
  type FeedItem,
  type PendingPackage,
  type Tone,
  type WithoutDEXPackage,
} from "@/components/welcome-dashboard/types";

const EMPTY_STATS: DashboardStats = { pendingYesterday: 0, withoutDEX: 0, expiringToday: 0 };

interface UseWelcomeDashboardOptions {
  /** Sucursales a consultar. Vacío = todas las visibles (el backend acota por rol). */
  subsidiaryIds: string[];
  /** Si es `false`, no se dispara la consulta (p.ej. diálogo cerrado). */
  enabled?: boolean;
}

/**
 * Fuente única de datos del resumen operativo (diálogo y página completa comparten
 * esta lógica): trae los paquetes acotados por sucursal, arma el feed priorizado y
 * permite re-verificar contra FedEx (read-only).
 */
export function useWelcomeDashboard({ subsidiaryIds, enabled = true }: UseWelcomeDashboardOptions) {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [pendingPackages, setPendingPackages] = useState<PendingPackage[]>([]);
  const [withoutDEXPackages, setWithoutDEXPackages] = useState<WithoutDEXPackage[]>([]);
  const [expiringPackages, setExpiringPackages] = useState<ExpiringPackage[]>([]);

  // Re-verificación FedEx (read-only): mapa guía -> último estatus fresco.
  const [fedexResults, setFedexResults] = useState<Map<string, FedexVerifyResult>>(new Map());
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState<Date | null>(null);

  const key = subsidiaryIds.slice().sort().join(",");

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getWelcomeDashboard(subsidiaryIds);
      setPendingPackages(data.pendingPackages ?? []);
      setWithoutDEXPackages(data.withoutDEXPackages ?? []);
      setExpiringPackages(data.expiringPackages ?? []);
      setStats(data.stats ?? EMPTY_STATS);
    } catch (error) {
      console.error("Error fetching welcome dashboard:", error);
      setPendingPackages([]);
      setWithoutDEXPackages([]);
      setExpiringPackages([]);
      setStats(EMPTY_STATS);
    } finally {
      setIsLoading(false);
    }
    // Los datos cambiaron: invalida la verificación FedEx previa.
    setFedexResults(new Map());
    setVerifiedAt(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (enabled) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key]);

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

  /** Re-verifica contra FedEx todas las guías del feed actual (dedup, cap 200). */
  const verifyFedex = useCallback(async () => {
    const trackings = [...new Set(feed.map((f) => f.trackingNumber).filter(Boolean))];
    if (!trackings.length) return;
    setIsVerifying(true);
    try {
      const results = await verifyWelcomeFedex(trackings);
      setFedexResults(new Map(results.map((r) => [r.trackingNumber, r])));
      setVerifiedAt(new Date());
    } catch (error) {
      console.error("Error verifying FedEx:", error);
    } finally {
      setIsVerifying(false);
    }
  }, [feed]);

  return {
    isLoading,
    stats,
    pendingPackages,
    withoutDEXPackages,
    expiringPackages,
    feed,
    refetch: fetchData,
    // FedEx
    fedexResults,
    isVerifying,
    verifiedAt,
    verifyFedex,
  };
}

export type UseWelcomeDashboardResult = ReturnType<typeof useWelcomeDashboard>;
