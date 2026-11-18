"use client";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Forward, MapPin, PackageCheckIcon, Sheet } from "lucide-react";
import { Inventory, PackageInfo } from "@/lib/types";
import { InventoryPDFReport } from "@/lib/services/inventory/inventory-pdf-generator";
import { generateInventoryExcel, inventoryRejectedRows } from "@/lib/services/inventory/inventory-excel-generator";
import { pdf } from "@react-pdf/renderer";
import { IconPdf } from "@tabler/icons-react";
import { useToast } from "@/components/ui/use-toast";
import { cn, mapToPackageInfo } from "@/lib/utils";
import { PackagesList } from "@/components/shared/packages-list";
import { InventoryPackageToolbar, useInventoryPackageView } from "./inventory-package-view";
import { getInventoryCompare } from "@/lib/services/inventories";
import { resendInventoryEmail } from "@/lib/services/inventory/inventory-email";
import { downloadBlob, inventoryFileBase } from "@/lib/inventory-files";
import { statusLabel } from "@/lib/package-dossier";
import { apiError } from "@/components/maintenance/shared/confirm-action";
import { GONE_BUCKETS, GONE_BUCKET_META, describeMovement, type InventoryGoneBucket } from "@/lib/inventory-compare";
import type { InventoryGoneRow } from "@/lib/services/inventories";
import { daysUntilCommit } from "@/components/shared/package-list-item";
import { Pill, StatusPill } from "@/components/shared/status-pill";
import { commitUrgency, noDueMark } from "@/lib/inventory-excel-rules";
import { ArrowRight, BanknoteIcon, Clock, Package } from "lucide-react";

interface Props {
  inventory: Inventory;
  onClose: () => void;
  /** Grupo con el que se abre (al tocar una pastilla de "Contra el anterior" en el historial). */
  initialCompareFilter?: CompareFilter;
}

const TYPE_LABEL: Record<string, string> = { initial: "Inicial", dex: "DEX", final: "Final" };

/** Grupo de las que ya no están, o las nuevas / las que siguen. */
export type CompareFilter = InventoryGoneBucket | "appeared" | "kept" | null;

const isGoneBucket = (f: CompareFilter): f is InventoryGoneBucket => !!f && f !== "appeared" && f !== "kept";

const pkgKey = (p: { trackingNumber?: string | null; dhlUniqueId?: string | null }) =>
  String(p.dhlUniqueId || p.trackingNumber || "").trim().toUpperCase();

const fmtDateTime = (v?: string | Date | null) =>
  v
    ? new Date(v).toLocaleString("es-MX", {
        timeZone: "America/Hermosillo",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "N/A";

export default function InventoryDetails({ inventory, onClose, initialCompareFilter = null }: Props) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [compareFilter, setCompareFilter] = useState<CompareFilter>(initialCompareFilter);
  const [confirmResend, setConfirmResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const packages = useMemo(
    () => mapToPackageInfo(inventory.shipments, inventory.chargeShipments),
    [inventory.shipments, inventory.chargeShipments],
  );

  // Estatus al momento del inventario (mig 122). Inventarios viejos: null → solo estatus actual.
  const statusAt = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const s of (inventory.shipments ?? []) as any[]) m.set(`s:${s.id}`, s.statusAtInventory ?? null);
    for (const c of (inventory.chargeShipments ?? []) as any[]) m.set(`c:${c.id}`, c.statusAtInventory ?? null);
    return m;
  }, [inventory.shipments, inventory.chargeShipments]);

  // Comparación contra el inventario anterior del mismo día.
  const { data: compare } = useSWR(inventory.id ? ["inventory-compare", inventory.id] : null, () => getInventoryCompare(inventory.id), {
    revalidateOnFocus: false,
  });
  const appeared = useMemo(() => new Set(compare?.appearedKeys ?? []), [compare]);
  const kept = useMemo(() => new Set(compare?.keptKeys ?? []), [compare]);

  const comparedPackages = useMemo(() => {
    if (compareFilter === "appeared") return packages.filter((p) => appeared.has(pkgKey(p)));
    if (compareFilter === "kept") return packages.filter((p) => kept.has(pkgKey(p)));
    return packages;
  }, [packages, compareFilter, appeared, kept]);

  const view = useInventoryPackageView(comparedPackages);
  const rejected = inventoryRejectedRows(inventory);
  const baseName = inventoryFileBase(inventory);

  // PDF/Excel con lo que se ve: paquetería/ciudad elegidas y el orden elegido.
  const exportOptions = { packages: view.visible, filterLabel: view.filterLabel };

  const handlePdfCreate = async () => {
    setIsLoading(true);
    try {
      const blob = await pdf(<InventoryPDFReport report={inventory} {...exportOptions} />).toBlob();
      downloadBlob(blob, `${baseName}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ title: "No se generó el PDF", description: "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExcelCreate = async () => {
    setIsLoading(true);
    try {
      const gone = compare?.gone ?? [];
      const sortedGone = [...gone].sort((a, b) => GONE_BUCKETS.indexOf(a.bucket) - GONE_BUCKETS.indexOf(b.bucket));
      const compareSheet = compare?.previous && gone.length
        ? {
            urgency: sortedGone.map((g) => commitUrgency(g.commitDateTime, undefined, g.status)),
            title: `Contra el ${TYPE_LABEL[compare.previous.type] ?? "inventario"} de las ${fmtDateTime(compare.previous.inventoryDate)} (${compare.previous.totalPackages} paquetes)`,
            rows: sortedGone
              .map((g) => ({
                Grupo: GONE_BUCKET_META[g.bucket].label,
                Guía: g.dhlUniqueId || g.trackingNumber,
                Destinatario: g.recipientName ?? "",
                Dirección: g.recipientAddress ?? "",
                CP: g.recipientZip ?? "",
                Ciudad: g.recipientCity ?? "",
                "Estatus hoy": statusLabel(g.status),
                "Último movimiento": describeMovement(g.lastMovement, statusLabel, compare.previous?.inventoryDate, String(inventory.inventoryDate)),
                Vence: g.commitDateTime ? new Date(g.commitDateTime).toLocaleDateString("es-MX", { timeZone: "America/Hermosillo" }) : "",
                Cobro: g.paymentLabel ?? "",
              })),
          }
        : undefined;
      await generateInventoryExcel(inventory, true, { ...exportOptions, compareSheet });
    } catch (error) {
      console.error("Error generating Excel:", error);
      toast({ title: "No se generó el Excel", description: "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await resendInventoryEmail(inventory);
      toast({ title: "Correo reenviado", description: `Se mandó a la sucursal ${inventory.subsidiary?.name ?? ""}.` });
      setConfirmResend(false);
    } catch (error) {
      console.error("Error al reenviar:", error);
      toast({ title: "No se reenvió el correo", description: apiError(error, "No se pudo reenviar el correo"), variant: "destructive" });
    } finally {
      setIsResending(false);
    }
  };

  // Estatus con el semáforo de la app; "En bodega → Entregado" cuando cambió después del inventario.
  const renderStatus = (pkg: PackageInfo) => {
    const at = statusAt.get(`${pkg.isCharge ? "c" : "s"}:${pkg.id}`) ?? null;
    const now = pkg.status ?? null;
    if (!at && !now) return null;
    if (!at || at === now) {
      return <StatusPill status={at ?? now} title={at ? "Estatus al inventario (sin cambios)" : "Estatus actual"} />;
    }
    return (
      <span className="inline-flex items-center gap-1" title="Estatus al inventario → estatus de hoy">
        <StatusPill status={at} />
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <StatusPill status={now} />
      </span>
    );
  };

  const prev = compare?.previous ?? null;
  const toggle = (f: Exclude<CompareFilter, null>) => setCompareFilter((cur) => (cur === f ? null : f));
  const fmtTime = (v: string) =>
    new Date(v).toLocaleTimeString("es-MX", { timeZone: "America/Hermosillo", hour: "2-digit", minute: "2-digit", hour12: false });

  return (
    <Card className="w-full border-0 shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <PackageCheckIcon className="h-5 w-5" />
            <span>Detalle de inventario</span>
            <Badge variant="secondary">{TYPE_LABEL[inventory.type ?? ""] ?? "Inicial"}</Badge>
          </div>
          <div className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{inventory.subsidiary?.name ?? "N/A"}</span>
          </div>
        </CardTitle>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span>
            Fecha: <span className="font-medium text-foreground">{fmtDateTime(inventory.inventoryDate)}</span>
          </span>
          <span>
            Folio: <span className="font-mono font-medium text-foreground">{inventory.trackingNumber ?? "N/A"}</span>
          </span>
          <span>
            Paquetes: <span className="font-medium text-foreground">{packages.length}</span>
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-0">
        {/* Comparación contra el inventario anterior del mismo día */}
        {prev && (
          <div className="rounded-md border px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Contra el {TYPE_LABEL[prev.type] ?? "inventario"} de las {fmtTime(prev.inventoryDate)} ({prev.totalPackages} paquetes).
              Toca un grupo para ver esas guías.
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-medium">Ya no están:</span>
              {GONE_BUCKETS.filter((b) => (compare?.counts?.[b] ?? 0) > 0).map((b) => (
                <Button
                  key={b}
                  size="sm"
                  variant="outline"
                  aria-pressed={compareFilter === b}
                  title={GONE_BUCKET_META[b].help}
                  onClick={() => toggle(b)}
                  className={cn("h-7 gap-1 text-xs font-normal", GONE_BUCKET_META[b].className, compareFilter === b && "ring-2 ring-offset-1 ring-foreground/30")}
                >
                  <span className="font-semibold tabular-nums">{compare!.counts[b]}</span> {GONE_BUCKET_META[b].label}
                </Button>
              ))}
              {(compare?.gone.length ?? 0) === 0 && <span className="text-xs text-green-700 dark:text-green-400">ninguna, todo sigue</span>}
              <span className="mx-1 h-4 w-px bg-border" />
              <Button size="sm" variant="outline" aria-pressed={compareFilter === "appeared"} onClick={() => toggle("appeared")}
                className={cn("h-7 text-xs font-normal", compareFilter === "appeared" && "bg-muted font-medium")}>
                Nuevas <span className="ml-1 font-semibold tabular-nums">{appeared.size}</span>
              </Button>
              <Button size="sm" variant="outline" aria-pressed={compareFilter === "kept"} onClick={() => toggle("kept")}
                className={cn("h-7 text-xs font-normal", compareFilter === "kept" && "bg-muted font-medium")}>
                Siguen <span className="ml-1 font-semibold tabular-nums">{kept.size}</span>
              </Button>
            </div>
          </div>
        )}

        {isGoneBucket(compareFilter) ? (
          <GoneList
            bucket={compareFilter}
            rows={(compare?.gone ?? []).filter((g) => g.bucket === compareFilter)}
            previousDate={prev?.inventoryDate ?? null}
            currentDate={String(inventory.inventoryDate)}
            loading={!compare}
          />
        ) : (
          <>
            <InventoryPackageToolbar view={view} />
            <PackagesList
              packages={view.visible}
              showFilters={false}
              groupBy={view.groupBy}
              showRowNumbers={view.showRowNumbers}
              renderExtra={renderStatus}
              showCommitDate
              maxHeightClass="max-h-[50vh]"
              emptyTitle="Sin paquetes"
              emptyDescription="Ningún paquete coincide con la paquetería, la ciudad o la comparación elegida."
            />
          </>
        )}

        {rejected.length > 0 && !isGoneBucket(compareFilter) && (
          <div className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Guías no incluidas ({rejected.length})
            </h3>
            <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
              {rejected.map((r, i) => (
                <div key={`${r.trackingNumber}-${i}`} className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm">
                  <span className="font-mono">{r.trackingNumber}</span>
                  <span className="text-right text-muted-foreground">{r.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setConfirmResend(true)} disabled={isLoading || isResending}>
            <Forward className="h-4 w-4" />
            Reenviar correo
          </Button>
          <Button onClick={handleExcelCreate} disabled={isLoading} variant="outline" className="gap-2">
            <Sheet className="h-4 w-4" />
            Excel
          </Button>
          <Button onClick={handlePdfCreate} disabled={isLoading} className="gap-2">
            <IconPdf className="h-4 w-4" />
            PDF
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={confirmResend} onOpenChange={(o) => !o && !isResending && setConfirmResend(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reenviar correo del inventario</AlertDialogTitle>
            <AlertDialogDescription>
              Se manda otra vez el PDF y el Excel de este inventario a la sucursal {inventory.subsidiary?.name ?? ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isResending}
              onClick={(e) => {
                e.preventDefault();
                handleResend();
              }}
            >
              {isResending ? "Reenviando…" : "Reenviar correo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/** Guías que ya no están, de un grupo, con los datos del paquete y su último movimiento. */
function GoneList({
  bucket,
  rows,
  previousDate,
  currentDate,
  loading = false,
}: {
  bucket: InventoryGoneBucket;
  rows: InventoryGoneRow[];
  previousDate: string | null;
  currentDate: string;
  loading?: boolean;
}) {
  const meta = GONE_BUCKET_META[bucket];
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{meta.label}:</span> {meta.help}
      </p>
      <div className="max-h-[50vh] overflow-y-auto rounded-md border divide-y">
        {rows.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">{loading ? "Comparando con el inventario anterior…" : "No hay guías en este grupo."}</p>
        ) : (
          rows.map((g, i) => {
            const days = noDueMark(g.status) ? null : daysUntilCommit(g.commitDateTime);
            return (
              <div key={`${g.dhlUniqueId || g.trackingNumber}-${i}`} className="flex gap-3 px-3 py-1.5 text-sm">
                <span className="w-7 shrink-0 pt-0.5 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="font-mono font-medium">{g.dhlUniqueId || g.trackingNumber}</span>
                    {g.isCharge && <Pill icon={Package} className="bg-green-100 text-green-700">F2</Pill>}
                    <span className="truncate">{g.recipientName ?? ""}</span>
                    <span className="ml-auto flex items-center gap-1.5">
                      {days === 0 && <Pill icon={Clock} className="bg-red-100 text-red-700">Hoy</Pill>}
                      {days === 1 && <Pill icon={Clock} className="bg-amber-100 text-amber-700">Mañana</Pill>}
                      {g.paymentLabel && <Pill icon={BanknoteIcon} className="bg-blue-100 text-blue-700">{g.paymentLabel}</Pill>}
                      {g.recipientZip && <Pill className="bg-slate-100 font-mono text-slate-700">{g.recipientZip}</Pill>}
                      <StatusPill status={g.status} title="Estatus de hoy" />
                    </span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {[
                      g.recipientAddress,
                      g.recipientCity,
                      g.commitDateTime
                        ? `Vence ${new Date(g.commitDateTime).toLocaleString("es-MX", { timeZone: "America/Hermosillo", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })}`
                        : "Sin fecha de vencimiento",
                    ].filter(Boolean).join(" · ")}
                  </div>
                  <div className={cn("text-xs", bucket === "sinMovimiento" ? "text-red-700 dark:text-red-400" : "text-muted-foreground")}>
                    {describeMovement(g.lastMovement, statusLabel, previousDate, currentDate)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
