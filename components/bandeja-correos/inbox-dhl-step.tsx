"use client";

import { useState } from "react";
import { CalendarCheck, CalendarX, FileText, Loader2, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { DhlPrefill, ImportDhlTextModal } from "@/components/import-components/import-dhl-text-modal";
import { dhlFinalSave, dhlParseFile, dhlProcessText } from "@/lib/services/dhl-import";
import { getInboxAttachmentFile, inboxErrorText } from "@/lib/services/inbox";
import type { InboxDetail } from "@/lib/types/inbox";

interface Props {
  detail: InboxDetail;
  /** La sucursal ya está decidida (confirmada o detectada). */
  ready: boolean;
  canUpload: boolean;
  onChanged: () => void;
}

/**
 * Paso ② de un correo DHL: el cuerpo del correo (bloques "AWB :") se lleva al mismo
 * asistente "Importar DHL" de Envíos, ya pegado, con la sucursal y los vencimientos del
 * Excel del correo. Si el cuerpo no trae guías pero sí el Excel DHL de 3 hojas, se abre con él.
 */
export function InboxDhlStep({ detail, ready, canUpload, onChanged }: Props) {
  const [prefill, setPrefill] = useState<DhlPrefill | null>(null);
  const [opening, setOpening] = useState(false);
  const dhl = detail.dhl;
  const m = detail.message;
  if (!dhl) return null;

  const awbCount = (dhl.pasteText?.match(/^AWB\s*:/gm) ?? []).length;
  const hasDueDates = Object.keys(dhl.dueDates).length > 0;
  const excel = detail.attachments.find((a) => a.id === dhl.excelAttachmentId) ?? null;
  const canImport = ready && canUpload && (awbCount > 0 || !!excel);

  async function open() {
    const base = { key: `${m.id}-${Date.now()}`, subsidiaryId: m.subsidiaryId ?? undefined, sourceLabel: `Tomado del correo «${m.subject}».` };
    if (awbCount > 0) {
      setPrefill({ ...base, text: dhl!.pasteText, dueDates: dhl!.dueDates });
      return;
    }
    if (!excel) return;
    setOpening(true);
    try {
      setPrefill({ ...base, file: await getInboxAttachmentFile(excel.id, excel.filename) });
    } catch (e) {
      toast.error(inboxErrorText(e, "No se pudo abrir el Excel del correo"));
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-1.5 text-sm">
        <li className="flex items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-slate-400" />
          {awbCount > 0 ? (
            <span>
              El cuerpo trae <b>{awbCount}</b> guía(s) DHL listas para pegar.
            </span>
          ) : (
            <span className="text-slate-500">El cuerpo no trae guías (bloques “AWB :”).</span>
          )}
        </li>
        <li className="flex items-center gap-2">
          {hasDueDates ? (
            <>
              <CalendarCheck className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                Vencimientos del Excel <b>{excel?.filename}</b>: se ponen solos.
              </span>
            </>
          ) : (
            <>
              <CalendarX className="h-4 w-4 shrink-0 text-amber-600" />
              <span className="text-slate-600">El Excel no trae vencimientos: se capturan en la tabla.</span>
            </>
          )}
        </li>
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={open} disabled={!canImport || opening} className="bg-[#D40511] text-white hover:bg-[#b0040e]">
          {opening ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <PackageOpen className="mr-1.5 h-4 w-4" />}
          Importar en DHL
        </Button>
        {!ready && <span className="text-xs text-slate-500">Primero confirma la sucursal.</span>}
        {ready && !canUpload && <span className="text-xs text-slate-500">Necesitas permiso para subir guías.</span>}
        {ready && canUpload && awbCount === 0 && !excel && <span className="text-xs text-slate-500">Este correo no trae guías DHL para importar.</span>}
      </div>

      <ImportDhlTextModal
        isOpen={!!prefill}
        onOpenChange={(o) => !o && setPrefill(null)}
        onProcessText={dhlProcessText}
        onParseFile={dhlParseFile}
        onFinalSave={dhlFinalSave}
        defaultSubsidiaryId={m.subsidiaryId ?? ""}
        prefill={prefill}
        onImported={onChanged}
      />
    </div>
  );
}
