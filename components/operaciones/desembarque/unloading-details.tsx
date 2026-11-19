"use client";

import { useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { IconPdf } from "@tabler/icons-react";
import { AlertCircle, AlertTriangle, ArrowRight, Forward, MapPin, PackageX, Sheet, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/components/ui/use-toast";
import { cn, mapToPackageInfo } from "@/lib/utils";
import type { PackageInfo, Unloading } from "@/lib/types";
import { UnloadingPDFReport } from "@/lib/services/unloading/unloading-pdf-generator";
import { generateUnloadingExcelClient } from "@/lib/services/unloading/unloading-excel-generator";
import { uploadPDFile } from "@/lib/services/unloadings";
import { downloadBlob } from "@/lib/inventory-files";
import { apiError } from "@/components/maintenance/shared/confirm-action";
import { PackagesList } from "@/components/shared/packages-list";
import { StatusPill } from "@/components/shared/status-pill";
import { InventoryPackageToolbar, useInventoryPackageView } from "@/components/operaciones/inventory/inventory-package-view";

interface Props {
  unloading: Unloading;
  onClose: () => void;
}

type Group = "valid" | "missing" | "surplus";

/** Al desembarcar, toda guía queda "En bodega": es el estatus de partida para comparar con hoy. */
const STATUS_AT_UNLOADING = "en_bodega";

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

/** Nombre base de los archivos: Desembarque-<sucursal>-<folio>. */
const fileBase = (u: Unloading) =>
  `Desembarque-${(u.subsidiary?.name ?? "Sucursal").replace(/[^\p{L}\p{N} _-]/gu, "").trim().replace(/\s+/g, "_")}-${u.trackingNumber ?? u.id}`;

/**
 * Detalle de desembarque, con el mismo formato que el detalle de inventario: datos arriba, grupos
 * que filtran (Válidos / Faltantes / Sobrantes), la barra de paquetería/ciudad/orden, la lista con
 * el estatus (y su cambio desde el desembarque) y las acciones (reenviar correo, Excel, PDF).
 */
export default function UnloadingDetails({ unloading, onClose }: Props) {
  const { toast } = useToast();
  const [group, setGroup] = useState<Group>("valid");
  const [busy, setBusy] = useState(false);
  const [confirmResend, setConfirmResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const packages = useMemo(
    () => mapToPackageInfo(unloading.shipments ?? [], unloading.chargeShipments ?? []),
    [unloading.shipments, unloading.chargeShipments],
  );
  const missing = unloading.missingTrackings ?? [];
  const surplus = unloading.unScannedTrackings ?? [];
  const view = useInventoryPackageView(packages);
  const createdBy = unloading.createdBy?.name;

  const buildPdf = () =>
    pdf(
      <UnloadingPDFReport
        key={Date.now()}
        vehicle={unloading.vehicle ?? null}
        packages={(unloading.shipments ?? []) as any}
        missingPackages={missing as any}
        unScannedPackages={surplus}
        subsidiaryName={unloading.subsidiary?.name ?? "N/A"}
        unloadingTrackigNumber={unloading.trackingNumber ?? "N/A"}
      />,
    ).toBlob();

  const handlePdf = async () => {
    setBusy(true);
    try {
      downloadBlob(await buildPdf(), `${fileBase(unloading)}.pdf`);
    } catch {
      toast({ title: "No se generó el PDF", description: "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleExcel = async () => {
    setBusy(true);
    try {
      await generateUnloadingExcelClient(unloading, true);
    } catch {
      toast({ title: "No se generó el Excel", description: "Intenta de nuevo.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // Vuelve a mandar el PDF y el Excel a la sucursal (los destinatarios salen del servidor).
  const handleResend = async () => {
    setIsResending(true);
    try {
      const base = fileBase(unloading);
      const pdfFile = new File([await buildPdf()], `${base}.pdf`, { type: "application/pdf" });
      const buffer = await generateUnloadingExcelClient(unloading, false);
      const excelFile = new File([buffer], `${base}.xlsx`, {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      await uploadPDFile(pdfFile, excelFile, unloading.subsidiary?.name ?? "", unloading.id);
      toast({ title: "Correo reenviado", description: `Se mandó a la sucursal ${unloading.subsidiary?.name ?? ""}.` });
      setConfirmResend(false);
    } catch (error) {
      toast({ title: "No se reenvió el correo", description: apiError(error, "Intenta de nuevo."), variant: "destructive" });
    } finally {
      setIsResending(false);
    }
  };

  // Estatus con el semáforo de la app; "En bodega → Entregado" si cambió después del desembarque.
  const renderStatus = (pkg: PackageInfo) => {
    const now = pkg.status ?? null;
    if (!now || now === STATUS_AT_UNLOADING) {
      return <StatusPill status={STATUS_AT_UNLOADING} title="Sigue en bodega desde el desembarque" />;
    }
    return (
      <span className="inline-flex items-center gap-1" title="Al desembarcar → estatus de hoy">
        <StatusPill status={STATUS_AT_UNLOADING} />
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <StatusPill status={now} />
      </span>
    );
  };

  const groups: { key: Group; label: string; value: number; tone: string }[] = [
    { key: "valid", label: "Válidos", value: packages.length, tone: "text-green-700 dark:text-green-400" },
    { key: "missing", label: "Faltantes", value: missing.length, tone: missing.length ? "text-red-600" : "" },
    { key: "surplus", label: "Sobrantes", value: surplus.length, tone: surplus.length ? "text-amber-600" : "" },
  ];

  return (
    <div className="w-full space-y-3">
      {/* Encabezado */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <Truck className="h-5 w-5" />
            <span>Detalle de desembarque</span>
            {unloading.vehicle?.name && <Badge variant="secondary">{unloading.vehicle.name}</Badge>}
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{unloading.subsidiary?.name ?? "N/A"}</span>
          </div>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span>
            Fecha: <span className="font-medium text-foreground">{fmtDateTime(unloading.date || unloading.createdAt)}</span>
          </span>
          <span>
            Folio: <span className="font-mono font-medium text-foreground">{unloading.trackingNumber ?? "N/A"}</span>
          </span>
          <span>
            Paquetes: <span className="font-medium text-foreground">{packages.length}</span>
          </span>
          {createdBy && (
            <span>
              Hecho por: <span className="font-medium text-foreground">{createdBy}</span>
            </span>
          )}
        </div>
      </div>

      {/* Grupos que filtran */}
      <div className="rounded-md border px-3 py-2">
        <p className="text-xs text-muted-foreground">Toca un grupo para ver esas guías.</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {groups.map((g) => (
            <Button
              key={g.key}
              size="sm"
              variant="outline"
              aria-pressed={group === g.key}
              onClick={() => setGroup(g.key)}
              className={cn("h-7 gap-1 text-xs font-normal", group === g.key && "bg-muted font-medium")}
            >
              {g.label} <span className={cn("font-semibold tabular-nums", g.tone)}>{g.value}</span>
            </Button>
          ))}
        </div>
      </div>

      {group === "valid" && (
        <>
          <InventoryPackageToolbar view={view} />
          <PackagesList
            packages={view.visible}
            showFilters={false}
            groupBy={view.groupBy}
            showRowNumbers={view.showRowNumbers}
            renderExtra={renderStatus}
            maxHeightClass="max-h-[50vh]"
            emptyTitle="Sin paquetes"
            emptyDescription="Ningún paquete coincide con la paquetería o la ciudad elegida."
          />
        </>
      )}

      {group === "missing" && (
        <TrackingList
          items={missing}
          icon={<PackageX className="h-4 w-4 shrink-0 text-red-600" />}
          note="Venían en la carga y no se escanearon"
          empty="Sin faltantes: llegó todo lo de la carga."
        />
      )}

      {group === "surplus" && (
        <TrackingList
          items={surplus}
          icon={<AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />}
          note="Se escanearon y no venían en la carga"
          empty="Sin sobrantes: todo lo escaneado venía en la carga."
        />
      )}

      {/* Acciones */}
      <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cerrar
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => setConfirmResend(true)} disabled={busy || isResending}>
          <Forward className="h-4 w-4" />
          Reenviar correo
        </Button>
        <Button onClick={handleExcel} disabled={busy} variant="outline" className="gap-2">
          <Sheet className="h-4 w-4" />
          Excel
        </Button>
        <Button onClick={handlePdf} disabled={busy} className="gap-2">
          <IconPdf className="h-4 w-4" />
          PDF
        </Button>
      </div>

      <AlertDialog open={confirmResend} onOpenChange={(o) => !o && !isResending && setConfirmResend(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reenviar correo del desembarque</AlertDialogTitle>
            <AlertDialogDescription>
              Se manda otra vez el PDF y el Excel de este desembarque a la sucursal {unloading.subsidiary?.name ?? ""}.
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
    </div>
  );
}

/** Faltantes / sobrantes: solo se guardó la guía, una por renglón. */
function TrackingList({ items, icon, note, empty }: { items: string[]; icon: React.ReactNode; note: string; empty: string }) {
  if (items.length === 0) {
    return <p className="rounded-md border px-3 py-6 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <AlertCircle className="h-3.5 w-3.5" /> {note}.
      </p>
      <div className="max-h-[50vh] divide-y overflow-y-auto rounded-md border">
        {items.map((t, i) => (
          <div key={`${t}-${i}`} className="flex items-center gap-3 px-3 py-1.5 text-sm">
            <span className="w-7 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{i + 1}</span>
            {icon}
            <span className="font-mono">{t}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
