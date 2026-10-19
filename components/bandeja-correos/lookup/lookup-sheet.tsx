"use client";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmailRef, HeadType } from "@/lib/types/inbox-lookup";
import { ConsolidatedDetail } from "./consolidated-detail";
import { GuideDetail } from "./guide-detail";
import { ArrowLeft } from "lucide-react";

export type LookupView = { kind: "cons"; query: { id?: string; cons: string; type?: HeadType } } | { kind: "guide"; tracking: string };

interface Props {
  /** Pila de lo que se ha ido abriendo (consolidado → guía → …); la última es la visible. */
  stack: LookupView[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPush: (v: LookupView) => void;
  onBack: () => void;
  onOpenEmail: (email: EmailRef, found: { text: string; label: string }) => void;
}

/** Panel lateral con el detalle de un consolidado o de una guía, con "Volver" entre ellos. */
export function LookupSheet({ stack, open, onOpenChange, onPush, onBack, onOpenEmail }: Props) {
  const view = stack[stack.length - 1];
  const prev = stack[stack.length - 2];
  return (
    <Sheet open={open && !!view} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-5xl">
        <SheetHeader className="border-b px-4 py-3 pr-12">
          <div className="flex items-center gap-2">
            {prev && (
              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2" onClick={onBack}>
                <ArrowLeft className="h-4 w-4" /> {prev.kind === "cons" ? `Consolidado ${prev.query.cons}` : `Guía ${prev.tracking}`}
              </Button>
            )}
            <SheetTitle className="text-base">{view?.kind === "guide" ? "Detalle de la guía" : "Detalle del consolidado"}</SheetTitle>
          </div>
          <SheetDescription className="sr-only">Historia completa para decidir qué hacer</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {view?.kind === "cons" && (
            <ConsolidatedDetail
              key={`${view.query.id ?? ""}-${view.query.cons}`}
              query={view.query}
              onOpenGuide={(tracking) => onPush({ kind: "guide", tracking })}
              onOpenEmail={onOpenEmail}
            />
          )}
          {view?.kind === "guide" && (
            <GuideDetail key={view.tracking} tracking={view.tracking} onOpenConsolidated={(query) => onPush({ kind: "cons", query })} onOpenEmail={onOpenEmail} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
