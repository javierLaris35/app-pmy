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

const LIST_LABEL: Record<string, string> = { contacts: "Contacto", items: "Concepto", rows: "Concepto" };
/** Mensajes técnicos por defecto de class-validator (en inglés). */
const TECH_RE = /\b(must|should|property|constraint)\b/i;

/**
 * Traduce un mensaje de validación del servidor a lenguaje simple:
 * "contacts.0.Correo no válido" → "Contacto 1: Correo no válido". Mensajes técnicos en inglés
 * (class-validator por defecto) se reemplazan por uno genérico entendible.
 */
export function humanizeApiMessage(msg: string): string {
  let m = String(msg ?? "").trim();
  let prefix = "";
  const list = m.match(/^(\w+)\.(\d+)\.(.*)$/);
  if (list) {
    prefix = `${LIST_LABEL[list[1]] ?? "Renglón"} ${Number(list[2]) + 1}: `;
    m = list[3];
    if (TECH_RE.test(m)) m = "revisa el dato capturado";
  }
  if (TECH_RE.test(m)) m = "revisa los datos capturados";
  return prefix + m.charAt(0).toUpperCase() + m.slice(1);
}

/** Mensaje de error legible de una respuesta axios (sin rutas técnicas ni inglés). */
export const apiError = (e: any, fallback: string): string => {
  if (!e?.response) return "No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.";
  const m = e.response.data?.message;
  if (e.response.status >= 500) return `${fallback}. Intenta de nuevo; si sigue pasando, avisa a Sistemas.`;
  const list = (Array.isArray(m) ? m : m ? [m] : []).map(humanizeApiMessage);
  return list.length ? [...new Set(list)].join(" · ") : fallback;
};
