import { Search, Clock, BanknoteIcon, X, Flag, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Conteos opcionales para las pastillas (si no se pasan, no se muestra el número). */
export interface PackageFilterCounts {
  today?: number;
  payment?: number;
  priority?: Partial<Record<"alta" | "media" | "baja", number>>;
  type?: Partial<Record<"special" | "normal", number>>;
  carrier?: Partial<Record<"all" | "fedex" | "dhl", number>>;
}

export interface PackageFiltersProps {
  searchTerm: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;

  carrier: string; // "all" | "fedex" | "dhl"
  onCarrierChange: (v: string) => void;
  /** false = la pantalla pinta su propio selector de paquetería (p. ej. con conteos). */
  showCarrier?: boolean;

  onlyToday: boolean;
  onToggleToday: () => void;

  onlyPayment: boolean;
  onTogglePayment: () => void;

  priority: string; // "all" | "alta" | "media" | "baja"
  onPriorityChange: (v: string) => void;

  type: string; // "all" | "special" | "normal"
  onTypeChange: (v: string) => void;

  activeFilterCount: number;
  onClear: () => void;

  counts?: PackageFilterCounts;
}

const CARRIERS = [
  { v: "all", label: "Todas", active: "bg-primary text-primary-foreground" },
  { v: "fedex", label: "FedEx", active: "bg-[#4D148C] text-white" },
  { v: "dhl", label: "DHL", active: "bg-[#FFCC00] text-[#D40511]" },
] as const;

const PRIORITY_LABEL: Record<string, string> = { alta: "Alta", media: "Media", baja: "Baja" };
const TYPE_LABEL: Record<string, string> = { special: "Especiales", normal: "Normales" };

/** Número dentro de una pastilla (mismo estilo que la bandeja de correos). */
function CountBadge({ value, active }: { value?: number; active: boolean }) {
  if (value === undefined) return null;
  return (
    <span
      className={cn(
        "rounded-full px-1.5 text-[11px] tabular-nums",
        active ? "bg-white/20" : "bg-slate-100 text-slate-600",
      )}
    >
      {value}
    </span>
  );
}

function TogglePill({
  active,
  onClick,
  icon: Icon,
  label,
  count,
  activeClassName,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  count?: number;
  activeClassName: string;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      aria-pressed={active}
      onClick={onClick}
      className={cn("h-8 gap-1.5 rounded-full px-3", active && activeClassName)}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      <CountBadge value={count} active={active} />
    </Button>
  );
}

/** Pastilla con menú (prioridad / tipo): se ve como las demás y se marca cuando hay filtro. */
function SelectPill({
  value,
  onChange,
  icon: Icon,
  allLabel,
  options,
  counts,
}: {
  value: string;
  onChange: (v: string) => void;
  icon: LucideIcon;
  allLabel: string;
  options: Record<string, string>;
  counts?: Partial<Record<string, number>>;
}) {
  const active = value !== "all";
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(
          "h-8 w-auto gap-1.5 rounded-full px-3 text-sm font-medium shadow-none",
          active && "border-primary bg-primary text-primary-foreground [&_svg]:!text-primary-foreground",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {Object.entries(options).map(([v, label]) => (
          <SelectItem key={v} value={v}>
            {label}
            {counts?.[v] !== undefined ? ` (${counts[v]})` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Barra de filtros estandarizada (pastillas estilo bandeja de correos + búsqueda). */
export function PackageFilters({
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Buscar por guía, CP, destinatario o dirección...",
  carrier,
  onCarrierChange,
  showCarrier = true,
  onlyToday,
  onToggleToday,
  onlyPayment,
  onTogglePayment,
  priority,
  onPriorityChange,
  type,
  onTypeChange,
  activeFilterCount,
  onClear,
  counts,
}: PackageFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {showCarrier && (
        <div className="mr-1 inline-flex rounded-full border bg-background p-0.5" role="tablist" aria-label="Paquetería">
          {CARRIERS.map((c) => (
            <button
              key={c.v}
              type="button"
              role="tab"
              aria-selected={carrier === c.v}
              onClick={() => onCarrierChange(c.v)}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors",
                carrier === c.v ? c.active : "text-slate-600 hover:bg-slate-100",
              )}
            >
              {c.label}
              <CountBadge value={counts?.carrier?.[c.v]} active={carrier === c.v} />
            </button>
          ))}
        </div>
      )}

      <TogglePill
        active={onlyToday}
        onClick={onToggleToday}
        icon={Clock}
        label="Vencen hoy"
        count={counts?.today}
        activeClassName="bg-red-600 text-white hover:bg-red-700"
      />
      <TogglePill
        active={onlyPayment}
        onClick={onTogglePayment}
        icon={BanknoteIcon}
        label="Con cobro"
        count={counts?.payment}
        activeClassName="bg-blue-600 text-white hover:bg-blue-700"
      />
      <SelectPill
        value={priority}
        onChange={onPriorityChange}
        icon={Flag}
        allLabel="Prioridad: todas"
        options={PRIORITY_LABEL}
        counts={counts?.priority}
      />
      <SelectPill
        value={type}
        onChange={onTypeChange}
        icon={Sparkles}
        allLabel="Tipo: todos"
        options={TYPE_LABEL}
        counts={counts?.type}
      />

      {activeFilterCount > 0 && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onClear}
          className="h-8 gap-1 rounded-full px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
          Limpiar ({activeFilterCount})
        </Button>
      )}

      <div className="relative w-full sm:ml-auto sm:w-64">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
        <Input
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 pl-8"
        />
      </div>
    </div>
  );
}

/** Conteos de las pastillas a partir de una lista de paquetes. */
export function computePackageFilterCounts(
  packages: { commitDateTime?: string | null; payment?: unknown; priority?: string | null; isCharge?: boolean; isHighValue?: boolean; shipmentType?: string | null }[],
  daysUntilCommit: (d?: string | null) => number | null,
): PackageFilterCounts {
  const c: Required<Pick<PackageFilterCounts, "priority" | "type" | "carrier">> & { today: number; payment: number } = {
    today: 0,
    payment: 0,
    priority: { alta: 0, media: 0, baja: 0 },
    type: { special: 0, normal: 0 },
    carrier: { all: packages.length, fedex: 0, dhl: 0 },
  };
  for (const p of packages) {
    if (daysUntilCommit(p.commitDateTime) === 0) c.today++;
    if (p.payment) c.payment++;
    const pr = (p.priority || "") as "alta" | "media" | "baja";
    if (pr in c.priority) c.priority[pr] = (c.priority[pr] ?? 0) + 1;
    if (p.isCharge || p.isHighValue || p.payment) c.type.special = (c.type.special ?? 0) + 1;
    else c.type.normal = (c.type.normal ?? 0) + 1;
    const t = String(p.shipmentType || "").toLowerCase();
    if (t === "dhl") c.carrier.dhl = (c.carrier.dhl ?? 0) + 1;
    else if (t === "fedex" || p.isCharge) c.carrier.fedex = (c.carrier.fedex ?? 0) + 1;
  }
  return c;
}
