"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SucursalSelector } from "@/components/sucursal-selector";
import { useZones } from "@/hooks/services/zones/use-zones";
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries";
import type { ConsolidadorScope, ScopeMode } from "@/lib/consolidador/scope";
import type { Subsidiary } from "@/lib/types";

interface Props {
  scope: ConsolidadorScope;
  onChange: (s: ConsolidadorScope) => void;
}

/** Header: revisar por Zona (Administración → Zonas) o por una Sucursal. */
export function ScopeSwitcher({ scope, onChange }: Props) {
  const { zones } = useZones();
  const { subsidiaries } = useSubsidiaries();
  const zoneSubs = useMemo(
    () => (subsidiaries ?? []).filter((s: any) => s.zoneId && s.zoneId === scope.zoneId),
    [subsidiaries, scope.zoneId],
  );

  const setMode = (mode: ScopeMode) => onChange({ ...scope, mode, focusSubsidiaryId: null });

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex h-8 shrink-0 items-center rounded-md border p-0.5" role="group" aria-label="Ver por">
        {([["zone", "Zona"], ["subsidiary", "Sucursal"]] as const).map(([key, label]) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={scope.mode === key ? "default" : "ghost"}
            className="h-7 px-2.5 text-xs"
            aria-pressed={scope.mode === key}
            onClick={() => setMode(key)}
          >
            {label}
          </Button>
        ))}
      </div>
      {scope.mode === "zone" ? (
        <Select value={scope.zoneId} onValueChange={(zoneId) => onChange({ ...scope, zoneId, focusSubsidiaryId: null })}>
          <SelectTrigger className="h-8 w-48 shrink-0" title={zoneSubs.map((s: any) => s.name).join(", ") || undefined}>
            <SelectValue placeholder="Elige una zona" />
          </SelectTrigger>
          <SelectContent>
            {zones.map((z: any) => (
              <SelectItem key={z.id} value={z.id}>
                {z.name}
                <span className="ml-1 text-xs text-slate-400">· {(subsidiaries ?? []).filter((s: any) => s.zoneId === z.id).length}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="w-48 shrink-0">
          <SucursalSelector
            value={scope.subsidiaryId}
            onValueChange={(val) => {
              const id = typeof val === "string" ? val : (val as Subsidiary)?.id;
              onChange({ ...scope, subsidiaryId: id ?? "" });
            }}
          />
        </div>
      )}
    </div>
  );
}
