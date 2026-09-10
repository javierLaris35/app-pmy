"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Package2, Route, X, Check } from "lucide-react";

interface RouteOption {
  id: string;
  label: string;
}

interface Props {
  weekLabel: string;
  isCurrentWeek: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  consNumber: string;
  routeId: string;
  onConsChange: (value: string) => void;
  onRouteChange: (value: string) => void;
  consOptions: string[];
  routeOptions: RouteOption[];
}

function FilterPopover({
  icon: Icon,
  title,
  value,
  displayValue,
  options,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  displayValue: string;
  options: { key: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const active = value !== "";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-9 gap-2 ${active ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "bg-white border-slate-200"}`}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="text-xs">{active ? displayValue : title}</span>
          {active && (
            <X
              className="h-3.5 w-3.5 opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="px-3 py-2 border-b text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </div>
        <ScrollArea className="max-h-64">
          <div className="p-1">
            {options.length === 0 && <p className="px-3 py-4 text-xs text-slate-400">Sin opciones esta semana</p>}
            {options.map((opt) => (
              <button
                key={opt.key}
                onClick={() => onChange(opt.key === value ? "" : opt.key)}
                className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm hover:bg-slate-50"
              >
                <span className="truncate tabular-nums">{opt.label}</span>
                {opt.key === value && <Check className="h-3.5 w-3.5 text-emerald-600" />}
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function ConsolidadorToolbar(props: Props) {
  const routeLabel = props.routeOptions.find((r) => r.id === props.routeId)?.label ?? props.routeId;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Navegación de semana */}
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1 py-0.5">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={props.onPrevWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col items-center px-2 min-w-[120px]">
          <span className="text-xs font-semibold text-slate-700">{props.weekLabel}</span>
          {props.isCurrentWeek && (
            <Badge variant="outline" className="mt-0.5 h-4 px-1 text-[9px] bg-emerald-50 text-emerald-600 border-emerald-200">
              Semana actual
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={props.onNextWeek}
          disabled={props.isCurrentWeek}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <FilterPopover
          icon={Package2}
          title="Consolidado"
          value={props.consNumber}
          displayValue={props.consNumber}
          options={props.consOptions.map((c) => ({ key: c, label: c }))}
          onChange={props.onConsChange}
        />
        <FilterPopover
          icon={Route}
          title="Ruta"
          value={props.routeId}
          displayValue={routeLabel}
          options={props.routeOptions.map((r) => ({ key: r.id, label: r.label }))}
          onChange={props.onRouteChange}
        />
    </div>
  );
}
