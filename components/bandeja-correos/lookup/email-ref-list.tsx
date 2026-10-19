"use client";

import { Button } from "@/components/ui/button";
import { EmailRef } from "@/lib/types/inbox-lookup";
import { formatDateTime } from "../labels";
import { FileSpreadsheet, Mail, MailOpen } from "lucide-react";

interface Props {
  emails: EmailRef[];
  onOpen: (email: EmailRef) => void;
  empty?: string;
  /** Máximo a mostrar (el resto se resume). */
  max?: number;
}

/** Correos donde aparece lo buscado, un renglón por correo con dónde está dentro de él. */
export function EmailRefList({ emails, onOpen, empty = "No encontramos el correo donde llegó.", max }: Props) {
  if (!emails.length) return <p className="text-xs text-slate-500">{empty}</p>;
  const shown = max ? emails.slice(0, max) : emails;
  return (
    <ul className="divide-y rounded-md border bg-white">
      {shown.map((e) => (
        <li key={`${e.id}-${e.attachmentId ?? ""}-${e.sheet ?? ""}`} className="flex items-center gap-2 px-2 py-1.5">
          <Mail className="h-4 w-4 shrink-0 text-slate-400" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-slate-800" title={e.subject}>
                {e.subject || "(sin asunto)"}
              </span>
              <span className="shrink-0 rounded-full bg-slate-100 px-1.5 text-[10px] uppercase text-slate-600">{e.carrier}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="whitespace-nowrap">{formatDateTime(e.receivedAt)}</span>
              <span>·</span>
              <span className="whitespace-nowrap">{e.subsidiaryName ?? "Sin sucursal"}</span>
              <span>·</span>
              {e.filename && <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
              <span className="truncate" title={e.where}>
                {e.where}
                {e.guides && e.guides > 1 ? ` · ${e.guides} guías` : ""}
              </span>
            </div>
          </div>
          <Button size="sm" variant="outline" className="h-7 shrink-0 gap-1 px-2 text-xs" onClick={() => onOpen(e)}>
            <MailOpen className="h-3.5 w-3.5" /> Abrir correo
          </Button>
        </li>
      ))}
      {max && emails.length > max && <li className="px-2 py-1 text-xs text-slate-500">y {emails.length - max} correo(s) más</li>}
    </ul>
  );
}
