"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface ConfirmActionProps {
  trigger: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<unknown> | unknown;
}

/** Confirmación genérica (eliminar, convertir, etc.) con estado de carga. */
export function ConfirmAction({ trigger, title, description, confirmLabel = "Confirmar", destructive, onConfirm }: ConfirmActionProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async (e: React.MouseEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={run}
            disabled={busy}
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Mensaje de error legible de una respuesta axios. */
export const apiError = (e: any, fallback: string): string => {
  const m = e?.response?.data?.message;
  return Array.isArray(m) ? m.join(". ") : m || fallback;
};
