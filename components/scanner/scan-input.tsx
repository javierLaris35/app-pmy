"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useMemo,
  type ComponentType,
} from "react";
import classNames from "classnames";
import {
  AlertCircle,
  Calendar,
  Copy,
  Check,
  HelpCircle,
  Inbox,
  Trash2,
  BanknoteIcon,
  BarcodeIcon,
  X,
  LayoutList,
  Rows3,
} from "lucide-react";
import { PackageInfo } from "@/lib/types";
import { normalizeScannedCode } from "@/lib/tracking/normalize-scan";
import { addNewCodes, matchValidatedPackage } from "@/components/scanner/scan-normalize";
import { useScanBuffer, type ScanView } from "@/components/scanner/use-scan-buffer";

/** Chip de métrica del pie del escáner (vencen hoy / mañana / no encontradas). */
const MetricChip = ({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: number;
  className?: string;
}) => (
  <span
    className={classNames(
      "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium",
      className
    )}
  >
    <Icon className="h-3.5 w-3.5" />
    {label}
    <span className="font-bold tabular-nums">{value}</span>
  </span>
);

export interface ScanInputHandle {
  focus: () => void;
  clear: () => void;
  getInputElement: () => HTMLTextAreaElement | null;
  updateValidatedPackages: (validated: PackageInfo[]) => void;
}

export interface ScanInputProps {
  /** Clave de persistencia del buffer (requerida). */
  storageKey: string;
  /** Vista inicial (rica por defecto). */
  defaultView?: ScanView;
  id?: string;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  hasErrors?: boolean;
  onPackagesChange?: (packages: PackageInfo[]) => void;
  onTrackingNumbersChange?: (trackingNumbers: string) => void;
  onHasDueTomorrow?: (has: boolean) => void;
}

export const ScanInput = forwardRef<ScanInputHandle, ScanInputProps>(function ScanInput(
  {
    storageKey,
    defaultView = "rich",
    id = "trackingNumbers",
    placeholder = "Escanea o pega los códigos de seguimiento aquí...",
    label = "Números de Seguimiento",
    disabled = false,
    hasErrors = false,
    onPackagesChange,
    onTrackingNumbersChange,
    onHasDueTomorrow,
  },
  ref
) {
  /* ===================== Estado vía hook ===================== */
  const { packages, setPackages, view, setView, clear, hydrated } = useScanBuffer(
    storageKey,
    defaultView
  );

  /* ===================== Refs / estado local ===================== */
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const packagesListRef = useRef<HTMLUListElement>(null);
  const wasPastedRef = useRef(false);
  const shownTomorrowRef = useRef<Set<string>>(new Set());
  const copyTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const [currentScan, setCurrentScan] = useState("");
  const [copied, setCopied] = useState(false);

  /* ===================== Helpers de fecha ===================== */

  const isDueToday = (date?: string | null) =>
    !!date && new Date(date).toDateString() === new Date().toDateString();

  const isDueTomorrow = (date?: string | null) => {
    if (!date) return false;
    const today = new Date();
    const tomorrow = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );
    return new Date(date).toDateString() === tomorrow.toDateString();
  };

  const formatDate = (date?: string | null) =>
    date
      ? new Date(date).toLocaleDateString("es-MX", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  /* ===================== Contadores ===================== */

  const { dueTodayCount, dueTomorrowCount, notFoundCount } = useMemo(() => {
    let today = 0;
    let tomorrow = 0;
    let notFound = 0;

    packages.forEach((p) => {
      if (!p.isPendingValidation) {
        if (isDueToday(p.commitDateTime)) today++;
        else if (isDueTomorrow(p.commitDateTime)) tomorrow++;
        else if (!p.commitDateTime && !p.payment) notFound++;
      }
    });

    return { dueTodayCount: today, dueTomorrowCount: tomorrow, notFoundCount: notFound };
  }, [packages]);

  /* ===================== Copiar ===================== */

  const copyAllTrackingNumbers = useCallback(async () => {
    if (packages.length === 0) return;

    const trackingNumbers = packages.map((p) => p.trackingNumber).join("\n");

    try {
      await navigator.clipboard.writeText(trackingNumbers);
      setCopied(true);

      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Error al copiar:", err);
      const textArea = document.createElement("textarea");
      textArea.value = trackingNumbers;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);

      setCopied(true);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    }
  }, [packages]);

  /* ===================== Imperative API ===================== */

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
    getInputElement: () => textareaRef.current,
    clear: () => {
      clear();
      setCurrentScan("");
      onTrackingNumbersChange?.("");
    },
    updateValidatedPackages: (validated: PackageInfo[]) => {
      setPackages((prev) => prev.map((p) => matchValidatedPackage(p, validated) ?? p));
    },
  }));

  /* ===================== Effects ===================== */

  // Autoscroll de la lista al final cuando cambian los paquetes.
  useEffect(() => {
    packagesListRef.current?.scrollTo({
      top: packagesListRef.current.scrollHeight,
    });
  }, [packages]);

  // Emitir cambios de paquetes / tracking numbers.
  useEffect(() => {
    onPackagesChange?.(packages);
    onTrackingNumbersChange?.(packages.map((p) => p.trackingNumber).join("\n"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packages]);

  // Emitir si hay guías que vencen mañana.
  useEffect(() => {
    const dueTomorrow = packages.filter(
      (p) => !p.isPendingValidation && isDueTomorrow(p.commitDateTime)
    );

    dueTomorrow.forEach((p) => shownTomorrowRef.current.add(p.trackingNumber));

    onHasDueTomorrow?.(dueTomorrow.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packages]);

  // Limpiar timeout de copiado al desmontar.
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  /* ===================== Entrada ===================== */

  const processTrackingLines = useCallback(
    (text: string) => {
      const normalizedLines = text
        .split("\n")
        .map((l) => normalizeScannedCode(l)?.code ?? null)
        .filter(Boolean) as string[];

      if (!normalizedLines.length) return;

      setPackages((prev) => {
        const toAdd = addNewCodes(prev, normalizedLines);
        return toAdd.length ? [...prev, ...toAdd] : prev;
      });

      setCurrentScan("");
    },
    [setPackages]
  );

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    wasPastedRef.current = true;
    processTrackingLines(e.clipboardData.getData("text"));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (wasPastedRef.current) {
        wasPastedRef.current = false;
        return;
      }
      processTrackingLines(currentScan);
    }
  };

  // Elimina por identificador (dhlUniqueId || trackingNumber), no por índice.
  const removeById = useCallback(
    (identifier: string) => {
      setPackages((prev) =>
        prev.filter((p) => (p.dhlUniqueId || p.trackingNumber) !== identifier)
      );
    },
    [setPackages]
  );

  /* ===================== Render ===================== */

  return (
    <div className="flex flex-col gap-3">
      {/* Encabezado: identidad + contador + switch de vista + copiar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground ring-1 ring-primary/20">
            <BarcodeIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">{label}</p>
            <p className="text-xs leading-tight text-muted-foreground">
              <span className="font-bold tabular-nums text-foreground">
                {packages.length}
              </span>{" "}
              {packages.length === 1 ? "guía escaneada" : "guías escaneadas"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Switch de vista */}
          <div className="inline-flex overflow-hidden rounded-md border">
            <button
              type="button"
              onClick={() => setView("rich")}
              className={classNames(
                "inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors",
                view === "rich"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
              title="Vista detallada"
            >
              <LayoutList className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Detallada</span>
            </button>
            <button
              type="button"
              onClick={() => setView("simple")}
              className={classNames(
                "inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors",
                view === "simple"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
              title="Vista simple"
            >
              <Rows3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Simple</span>
            </button>
          </div>

          {/* Copiar */}
          {packages.length > 0 && (
            <button
              type="button"
              onClick={copyAllTrackingNumbers}
              disabled={disabled}
              className={classNames(
                "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                copied
                  ? "border-green-200 bg-green-100 text-green-700"
                  : "border-primary/20 bg-primary/10 text-primary hover:bg-primary/20",
                disabled && "cursor-not-allowed opacity-50"
              )}
              title={copied ? "¡Copiado!" : "Copiar todas las guías al portapapeles"}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Zona de escaneo */}
      <div
        className={classNames(
          "rounded-xl border-2 border-dashed bg-muted/30 transition-colors focus-within:border-primary focus-within:bg-background",
          hasErrors && "border-red-500",
          disabled && "opacity-60"
        )}
      >
        <textarea
          id={id}
          ref={textareaRef}
          value={currentScan}
          onChange={(e) => setCurrentScan(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled}
          rows={2}
          className="w-full resize-none bg-transparent p-3 text-sm font-mono placeholder:font-sans placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {/* Cuerpo condicional por vista */}
      {view === "rich" ? (
        <>
          {/* Lista de tarjetas */}
          <div className="overflow-hidden rounded-xl border bg-background">
            <ul
              ref={packagesListRef}
              className="max-h-72 overflow-y-auto [&>li:last-child]:border-b-0"
            >
              {packages.length === 0 ? (
                <li className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                  <Inbox className="h-8 w-8 text-muted-foreground/40" />
                  <span className="text-sm text-muted-foreground">
                    No se han escaneado guías
                  </span>
                </li>
              ) : (
                packages.map((pkg) => {
                  const validated = !pkg.isPendingValidation;
                  const isNotFound = validated && !pkg.commitDateTime && !pkg.payment;
                  const today = validated && isDueToday(pkg.commitDateTime);
                  const tomorrow = validated && isDueTomorrow(pkg.commitDateTime);
                  const isDhl = pkg.shipmentType === "dhl";
                  const accent = !validated
                    ? "border-l-primary/60"
                    : today
                    ? "border-l-red-500"
                    : tomorrow
                    ? "border-l-amber-400"
                    : pkg.payment
                    ? "border-l-blue-400"
                    : isNotFound
                    ? "border-l-slate-300"
                    : "border-l-transparent";

                  return (
                    <li
                      key={pkg.dhlUniqueId ?? pkg.trackingNumber}
                      className={classNames(
                        "flex items-start justify-between gap-2 border-b border-l-4 px-3 py-2 transition-colors hover:bg-muted/30",
                        accent
                      )}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        {/* Línea principal: tipo + guía + estado/cobro */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {pkg.shipmentType && (
                            <span
                              className={classNames(
                                "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                                isDhl
                                  ? "bg-[#ffcc00] text-[#d40511]"
                                  : "bg-[#4d148c] text-white"
                              )}
                            >
                              {isDhl ? "DHL" : "FedEx"}
                            </span>
                          )}

                          <span className="truncate font-mono text-sm font-medium">
                            {pkg.trackingNumber}
                          </span>

                          {pkg.isPendingValidation && (
                            <span className="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                              Validando…
                            </span>
                          )}

                          {validated && pkg.payment?.amount != null && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                              <BanknoteIcon className="h-3 w-3" />
                              {pkg.payment?.type} ${pkg.payment?.amount}
                            </span>
                          )}
                        </div>

                        {/* Fecha de vencimiento */}
                        {validated && pkg.commitDateTime && (
                          <div
                            className={classNames(
                              "flex items-center gap-1 text-xs",
                              today
                                ? "font-semibold text-red-600"
                                : tomorrow
                                ? "font-semibold text-amber-600"
                                : "text-muted-foreground"
                            )}
                          >
                            <Calendar className="h-3 w-3 shrink-0" />
                            <span>{formatDate(pkg.commitDateTime)}</span>
                            {today && <span>(Vence hoy)</span>}
                            {tomorrow && <span>(Vence mañana)</span>}
                          </div>
                        )}

                        {isNotFound && (
                          <span className="text-xs italic text-slate-500">
                            Guía no encontrada
                          </span>
                        )}
                      </div>

                      {!disabled && (
                        <button
                          type="button"
                          onClick={() =>
                            removeById(pkg.dhlUniqueId || pkg.trackingNumber)
                          }
                          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          title="Eliminar guía"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          {/* Métricas */}
          {packages.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <MetricChip
                icon={AlertCircle}
                label="Hoy"
                value={dueTodayCount}
                className="border-red-200 bg-red-50 text-red-700"
              />
              <MetricChip
                icon={Calendar}
                label="Mañana"
                value={dueTomorrowCount}
                className="border-amber-200 bg-amber-50 text-amber-700"
              />
              <MetricChip
                icon={HelpCircle}
                label="No encontradas"
                value={notFoundCount}
                className="border-slate-200 bg-slate-50 text-slate-600"
              />
            </div>
          )}
        </>
      ) : (
        /* Vista simple: fila de chips horizontal con scroll */
        <div className="flex gap-1.5 overflow-x-auto rounded-xl border bg-background p-2">
          {packages.length === 0 ? (
            <span className="px-2 py-1 text-sm text-muted-foreground">Sin guías</span>
          ) : (
            packages.map((pkg) => (
              <span
                key={pkg.dhlUniqueId ?? pkg.trackingNumber}
                className="inline-flex shrink-0 items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 font-mono text-xs"
              >
                {pkg.trackingNumber}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeById(pkg.dhlUniqueId || pkg.trackingNumber)}
                    className="text-muted-foreground hover:text-destructive"
                    title="Quitar"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))
          )}
        </div>
      )}
    </div>
  );
});
