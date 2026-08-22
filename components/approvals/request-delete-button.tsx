"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DeleteRequestDialog } from "./delete-request-dialog";
import { ApprovalType } from "@/lib/services/approvals";

/** Botón de "solicitar eliminación" reutilizable (consolidado / salida a ruta). */
export function RequestDeleteButton({
  type,
  targetId,
  onRequested,
}: {
  type: ApprovalType;
  targetId: string;
  onRequested?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
            aria-label="Solicitar eliminación"
            onClick={() => setOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Solicitar eliminación (requiere autorización)</TooltipContent>
      </Tooltip>
      {open && (
        <DeleteRequestDialog
          open={open}
          onOpenChange={setOpen}
          type={type}
          targetId={targetId}
          onRequested={onRequested}
        />
      )}
    </>
  );
}
