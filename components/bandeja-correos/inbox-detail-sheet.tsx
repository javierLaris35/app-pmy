"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { InboxDetailPanel } from "./inbox-detail-panel";

interface Props {
  id: string | null;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

/** Panel lateral derecho con el correo: ① sucursal · ② subir guías. */
export function InboxDetailSheet({ id, onOpenChange, onChanged }: Props) {
  return (
    <Sheet open={!!id} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        {/* Radix pide título; el visible es el asunto dentro del panel. */}
        <SheetHeader className="sr-only">
          <SheetTitle>Detalle del correo</SheetTitle>
          <SheetDescription>Sucursal del correo y guías para subir</SheetDescription>
        </SheetHeader>
        <InboxDetailPanel id={id} onChanged={onChanged} bare />
      </SheetContent>
    </Sheet>
  );
}
