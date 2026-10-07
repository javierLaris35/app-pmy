"use client";

import { useState } from "react";
import { ArrowLeftRight, Building2, CalendarDays, History, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConsolidatedActionType } from "@/lib/services/approvals";
import { ConsolidatedActionDialog } from "./consolidated-action-dialog";
import { ConsolidatedHistoryDialog } from "./consolidated-history-dialog";
import { ConsolidatedTypeDialog } from "./consolidated-type-dialog";

type ConsolidatedRef = {
  id: string;
  consNumber: string;
  subsidiaryId?: string;
  subsidiary?: { id: string; name: string };
  date?: string;
};

/** "Más acciones" de un consolidado: eliminar, cambiar sucursal, fecha o tipo (con autorización) e historial. */
export function ConsolidatedActionsMenu({ consolidated, onRequested }: { consolidated: ConsolidatedRef; onRequested?: () => void }) {
  const [action, setAction] = useState<ConsolidatedActionType | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const subsidiaryId = consolidated.subsidiary?.id ?? consolidated.subsidiaryId ?? "";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Más acciones">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Requieren autorización</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => setAction("change_subsidiary_consolidado")}>
            <Building2 className="mr-2 h-4 w-4" /> Cambiar sucursal
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setAction("change_date_consolidado")}>
            <CalendarDays className="mr-2 h-4 w-4" /> Cambiar fecha
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setTypeOpen(true)}>
            <ArrowLeftRight className="mr-2 h-4 w-4" /> Cambiar tipo (paquete ↔ carga)
          </DropdownMenuItem>
          <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onSelect={() => setAction("delete_consolidado")}>
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setHistoryOpen(true)} disabled={!subsidiaryId}>
            <History className="mr-2 h-4 w-4" /> Historial
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {action && (
        <ConsolidatedActionDialog
          open={!!action}
          onOpenChange={(o) => !o && setAction(null)}
          type={action}
          consolidated={consolidated}
          onRequested={onRequested}
        />
      )}
      {typeOpen && (
        <ConsolidatedTypeDialog
          open={typeOpen}
          onOpenChange={setTypeOpen}
          consolidated={consolidated}
          onRequested={onRequested}
        />
      )}
      {historyOpen && subsidiaryId && (
        <ConsolidatedHistoryDialog
          open={historyOpen}
          onOpenChange={setHistoryOpen}
          consNumber={consolidated.consNumber}
          subsidiaryId={subsidiaryId}
        />
      )}
    </>
  );
}
