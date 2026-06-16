import * as React from "react";
import {
  AlertCircle,
  ArrowRightLeft,
  BanknoteIcon,
  Check,
  ChevronsUpDown,
  CircleAlertIcon,
  Clock,
  GemIcon,
  Loader2,
  MapPin,
  Package,
  Phone,
  Trash2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { PackageInfo } from "@/lib/types";

/** Días hasta el vencimiento (fecha local). null si no hay fecha. */
export const daysUntilCommit = (commitDateTime?: string | null): number | null => {
  if (!commitDateTime) return null;
  const d = new Date(commitDateTime);
  const t = new Date();
  const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const tOnly = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  return Math.round((dOnly.getTime() - tOnly.getTime()) / 86_400_000);
};

const formatMexicanPhoneNumber = (phone?: string | null) => {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) return `+52 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  if (cleaned.length === 12 && cleaned.startsWith("52")) return `+52 (${cleaned.slice(2, 5)}) ${cleaned.slice(5, 8)}-${cleaned.slice(8)}`;
  return phone;
};

/** Chip compacto con icono + tooltip para indicadores especiales. */
const FlagChip = ({
  icon: Icon,
  label,
  tooltip,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label?: string;
  tooltip: string;
  className?: string;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold leading-none cursor-default",
          className
        )}
      >
        <Icon className="h-3 w-3" />
        {label}
      </span>
    </TooltipTrigger>
    <TooltipContent>{tooltip}</TooltipContent>
  </Tooltip>
);

/** Selector de "Motivo" para guías inválidas (opcional, p. ej. inventario). */
export interface ReasonPicker {
  options: { key: string; label: string }[];
  selected?: string;
  onSelect: (id: string, value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface PackageListItemProps {
  pkg: PackageInfo;
  onRemove: (identifier: string) => void;
  isLoading?: boolean;
  /** Si se pasa, las guías inválidas muestran el selector de motivo. */
  reasonPicker?: ReasonPicker;
  /** Si se pasa, las guías válidas con datos incompletos muestran "Completar datos" (desembarque). */
  onCompleteData?: (pkg: PackageInfo) => void;
  /** Si se pasa, las guías que "no pertenecen a la sucursal" muestran "Traspasar" (subadmin+). */
  onTransfer?: (pkg: PackageInfo) => void;
}

/**
 * Item estandarizado de la lista de paquetes (mismo diseño en inventario,
 * salidas a ruta y desembarque): borde de acento por urgencia, pill de carrier,
 * ID prominente, chips de indicadores y datos del destinatario.
 */
export function PackageListItem({ pkg, onRemove, isLoading, reasonPicker, onCompleteData, onTransfer }: PackageListItemProps) {
  const pkgId = pkg.dhlUniqueId || pkg.trackingNumber;
  const needsData = pkg.isValid && (!pkg.recipientName || !pkg.recipientAddress || !pkg.recipientPhone);
  const isDhl = pkg.shipmentType === "dhl";
  const hasPayment = !!pkg.payment;
  const days = pkg.isValid ? daysUntilCommit(pkg.commitDateTime) : null;
  const expiresToday = days === 0;
  const expiresTomorrow = days === 1;

  const accent = !pkg.isValid && !pkg.isPendingValidation
    ? "border-l-destructive"
    : expiresToday
    ? "border-l-red-500"
    : expiresTomorrow
    ? "border-l-amber-400"
    : hasPayment
    ? "border-l-blue-400"
    : "border-l-transparent";

  const hasFlags =
    expiresToday || expiresTomorrow || hasPayment || pkg.isCharge ||
    pkg.isHighValue || pkg.priority === "alta";

  return (
    <div className={cn("p-3 border-l-4 hover:bg-muted/30 transition-colors border-b", accent)}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Línea principal */}
          <div className="flex items-center flex-wrap gap-2">
            {pkg.shipmentType && (
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                  isDhl ? "bg-[#ffcc00] text-[#d40511]" : "bg-[#4d148c] text-white"
                )}
              >
                {isDhl ? "DHL" : "FedEx"}
              </span>
            )}

            <span className="font-bold text-sm tracking-tight text-slate-900 truncate">{pkgId}</span>
            {pkg.dhlUniqueId && (
              <span className="text-[12px] text-slate-400 font-medium truncate hidden sm:inline">
                {pkg.trackingNumber}
              </span>
            )}

            {pkg.isPendingValidation && (
              <span className="inline-flex items-center gap-1 rounded-md bg-cyan-100 text-cyan-700 px-1.5 py-0.5 text-[10px] font-semibold">
                <Loader2 className="h-3 w-3 animate-spin" /> Validando
              </span>
            )}
            {(pkg as any).isOffline && (
              <span className="inline-flex items-center gap-1 rounded-md bg-yellow-100 text-yellow-800 px-1.5 py-0.5 text-[10px] font-semibold">
                ⚡ Offline
              </span>
            )}

            {pkg.isValid && pkg.recipientZip && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-mono font-semibold text-slate-700 shrink-0">
                <MapPin className="h-3 w-3" />
                {pkg.recipientZip}
              </span>
            )}
          </div>

          {/* Indicadores */}
          {hasFlags && (
            <TooltipProvider delayDuration={100}>
              <div className="flex items-center gap-1.5 flex-wrap">
                {expiresToday && <FlagChip icon={Clock} label="Hoy" tooltip="Vence hoy" className="bg-red-100 text-red-700" />}
                {expiresTomorrow && <FlagChip icon={Clock} label="Mañana" tooltip="Vence mañana" className="bg-amber-100 text-amber-700" />}
                {hasPayment && (
                  <FlagChip
                    icon={BanknoteIcon}
                    label={`${pkg.payment?.type} $${pkg.payment?.amount}`}
                    tooltip="A cobrar"
                    className="bg-blue-100 text-blue-700"
                  />
                )}
                {pkg.isCharge && <FlagChip icon={Package} label="F2" tooltip="Carga / F2 / 31.5" className="bg-green-100 text-green-700" />}
                {pkg.isHighValue && <FlagChip icon={GemIcon} tooltip="Alto valor" className="bg-violet-100 text-violet-700" />}
                {pkg.priority === "alta" && <FlagChip icon={CircleAlertIcon} label="ALTA" tooltip="Prioridad alta" className="bg-orange-100 text-orange-700" />}
              </div>
            </TooltipProvider>
          )}

          {/* Destinatario / motivo */}
          {pkg.isValid ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {pkg.recipientName && (
                <span className="inline-flex items-center gap-1 min-w-0">
                  <User className="h-3 w-3 shrink-0" />
                  <span className="truncate">{pkg.recipientName}</span>
                </span>
              )}
              {pkg.recipientAddress && (
                <span className="inline-flex items-center gap-1 min-w-0">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate max-w-[240px]">{pkg.recipientAddress}</span>
                </span>
              )}
              {pkg.recipientPhone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span>{formatMexicanPhoneNumber(pkg.recipientPhone)}</span>
                </span>
              )}
            </div>
          ) : (
            !pkg.isPendingValidation && pkg.reason && (
              <div className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>{pkg.reason}</span>
              </div>
            )
          )}
        </div>

        {/* Acciones */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {onCompleteData && needsData && !pkg.isPendingValidation && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCompleteData(pkg)}
              disabled={isLoading}
              className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100"
            >
              Completar datos
            </Button>
          )}

          {onTransfer &&
            !pkg.isValid &&
            !pkg.isPendingValidation &&
            (pkg.reason || "").toLowerCase().includes("sucursal") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onTransfer(pkg)}
                disabled={isLoading}
                className="gap-1 text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
              >
                <ArrowRightLeft className="h-3 w-3" />
                Traspasar
              </Button>
            )}

          {reasonPicker && !pkg.isValid && !pkg.isPendingValidation && (
            <Popover open={reasonPicker.open} onOpenChange={reasonPicker.onOpenChange}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-28 sm:w-32 justify-between text-xs" disabled={isLoading}>
                  <span className="truncate">{reasonPicker.selected || "Motivo"}</span>
                  <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-0">
                <Command>
                  <CommandInput placeholder="Buscar motivo..." className="h-9" />
                  <CommandList>
                    <CommandEmpty>No se encontraron motivos.</CommandEmpty>
                    <CommandGroup>
                      {reasonPicker.options.map((opt) => (
                        <CommandItem
                          key={opt.key}
                          value={opt.label}
                          onSelect={() => reasonPicker.onSelect(pkgId, opt.label)}
                          className="text-xs"
                        >
                          <Check className={cn("mr-2 h-4 w-4", reasonPicker.selected === opt.label ? "opacity-100" : "opacity-0")} />
                          {opt.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}

          {!pkg.isPendingValidation && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRemove(pkgId)}
              disabled={isLoading}
              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
