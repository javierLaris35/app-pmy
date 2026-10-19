"use client";

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { SubsidiaryGroup } from "@/components/consolidador/subsidiary-group";
import type { ZonePart } from "@/lib/types/consolidador-zone";

interface Props<T, R> {
  parts: ZonePart<T>[];
  rows: (data: T, part: ZonePart<T>) => R[];
  columns: ColumnDef<R, any>[];
  /** "6 No VAN · 2 sin cobro" para el encabezado de la sucursal. */
  subtitle: (data: T) => React.ReactNode;
  empty: string;
}

/**
 * Una tabla por sucursal (con su encabezado y subtotal) cuando hay varias; una sola tabla cuando
 * se revisa una sucursal. Las sucursales sin filas se muestran cerradas.
 */
export function ScopedTables<T, R>({ parts, rows, columns, subtitle, empty }: Props<T, R>) {
  const withData = parts.filter((p) => p.data || p.error);
  if (!withData.length || withData.every((p) => p.data && !rows(p.data, p).length)) {
    return <div className="rounded-md border bg-white py-12 text-center text-sm text-slate-500">{empty}</div>;
  }
  if (withData.length === 1 && withData[0].data) {
    return <DataTable columns={columns} data={rows(withData[0].data, withData[0])} autoResetPageIndex={false} hideSelectionCount />;
  }
  return (
    <div className="flex flex-col gap-2">
      {withData.map((p) => {
        const list = p.data ? rows(p.data, p) : [];
        return (
          <SubsidiaryGroup key={p.subsidiaryId} name={p.subsidiaryName} subtitle={p.data ? subtitle(p.data) : undefined} error={p.error} defaultOpen={list.length > 0}>
            {list.length ? (
              <DataTable columns={columns} data={list} autoResetPageIndex={false} hideSelectionCount hideToolbar={list.length < 10} />
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">Sin guías esta semana.</div>
            )}
          </SubsidiaryGroup>
        );
      })}
    </div>
  );
}
