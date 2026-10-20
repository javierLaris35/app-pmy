"use client";

import React from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SearchPackageView } from "@/components/consolidador/search-package-view";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sucursal a la que "Mover aquí" reasigna un ingreso (la elegida o la del foco). */
  subsidiaryId: string;
  onFixed: () => void;
  onAddIncome: (tracking: string) => void;
}

/** Buscar guía o consolidado desde el header (Ctrl K), sin salir de la pestaña. */
export function SearchSheet({ open, onOpenChange, subsidiaryId, onFixed, onAddIncome }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>Buscar guía</SheetTitle>
          <SheetDescription>Pega hasta 30 guías para ver su estatus, su cobro y corregirlos.</SheetDescription>
        </SheetHeader>
        <div className="mt-4">
          <SearchPackageView selectedSubsidiaryId={subsidiaryId} onFixed={onFixed} onAddIncome={onAddIncome} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
