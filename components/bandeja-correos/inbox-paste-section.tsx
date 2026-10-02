"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PasteImportModal, PastePrefill } from "@/components/import-components/paste-import-modal";
import { getInboxPastePlan, inboxErrorText, markInboxPasted } from "@/lib/services/inbox";
import { PasteBatch } from "@/lib/types/inbox";
import { toast } from "@/lib/toast";
import { CheckCircle2, ClipboardPaste, Loader2, Lock } from "lucide-react";

const BATCH_LABEL: Record<PasteBatch["kind"], string> = { master: "Master", aereo: "Aéreo", f2: "F2 / carga" };

interface Props {
  messageId: string;
  subject: string;
  /** Sucursal elegida en el selector del panel. */
  selectedSubsidiaryId: string;
  /**
   * Confirma la sucursal elegida si hace falta (correo en revisión o sucursal cambiada).
   * Devuelve false si no se pudo.
   */
  ensureConfirmed: () => Promise<boolean>;
  needsConfirm: boolean;
  onChanged: () => void;
}

/** Lotes del correo para abrir el "Pegar FedEx" ya lleno (master → aéreo → F2). */
export function InboxPasteSection({ messageId, subject, selectedSubsidiaryId, ensureConfirmed, needsConfirm, onChanged }: Props) {
  const { data: plan, isLoading, mutate } = useSWR(["/inbox/paste-plan", messageId], () => getInboxPastePlan(messageId));
  const [prefill, setPrefill] = useState<(PastePrefill & { batch: PasteBatch }) | null>(null);
  const [opening, setOpening] = useState<string | null>(null);

  async function open(b: PasteBatch) {
    if (!selectedSubsidiaryId) {
      toast.error("Elige la sucursal antes de mandar al pegado");
      return;
    }
    setOpening(b.key);
    try {
      if (needsConfirm && !(await ensureConfirmed())) return;
      // Recarga el plan por si la sucursal cambió (master del día, etc.).
      const fresh = needsConfirm ? await mutate() : plan;
      const batch = fresh?.batches.find((x) => x.key === b.key) ?? b;
      if (batch.blockedReason) {
        toast.error(batch.blockedReason);
        return;
      }
      setPrefill({
        key: `${batch.key}:${Date.now()}`,
        kind: batch.kind === "f2" ? "f2" : "master",
        subsidiaryId: batch.subsidiaryId ?? selectedSubsidiaryId,
        consNumber: batch.consNumber,
        consDate: batch.consDate,
        isAereo: batch.isAereo,
        raw: batch.raw,
        paymentsRaw: batch.paymentsRaw,
        hvRaw: batch.hvRaw,
        sourceLabel: `${BATCH_LABEL[batch.kind]} · ${batch.filename} (correo "${subject}")`,
        batch,
      });
    } finally {
      setOpening(null);
    }
  }

  async function handleImported(r: { consNumber: string }) {
    if (!prefill) return;
    try {
      await markInboxPasted(messageId, { attachmentId: prefill.batch.attachmentId, kind: prefill.batch.kind, consNumber: r.consNumber });
      await mutate();
      onChanged();
    } catch (e) {
      toast.error(inboxErrorText(e, "Se importó, pero no se pudo registrar en la bandeja"));
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparando lotes para el pegado…
      </div>
    );
  }
  if (!plan?.batches.length) return null;

  return (
    <section className="rounded-md border border-violet-200 bg-violet-50/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <ClipboardPaste className="h-4 w-4 text-violet-700" />
        <h3 className="text-sm font-semibold">Mandar al pegado</h3>
        {needsConfirm && <span className="text-xs text-amber-700">Al mandar se confirma la sucursal elegida.</span>}
      </div>
      <ul className="divide-y rounded-md border bg-white">
        {plan.batches.map((b) => (
          <li key={b.key} className="flex items-center gap-2 px-2 py-1.5 text-xs">
            <Badge variant="secondary" className="w-20 justify-center px-1.5 py-0 text-[11px]">
              {BATCH_LABEL[b.kind]}
            </Badge>
            <span className="min-w-0 flex-1 truncate" title={b.filename}>
              {b.filename}
            </span>
            <span className="text-slate-500">{b.rows} guías</span>
            <span className="w-28 truncate font-mono text-slate-600" title="Consolidado">
              {b.consNumber || "sin número"}
            </span>
            {b.done ? (
              <span className="flex w-36 items-center justify-end gap-1 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Ya se mandó
              </span>
            ) : b.blockedReason && !needsConfirm ? (
              <span className="flex w-36 items-center justify-end gap-1 text-slate-500" title={b.blockedReason}>
                <Lock className="h-3.5 w-3.5" /> <span className="truncate">{b.blockedReason}</span>
              </span>
            ) : (
              <Button size="sm" className="h-7 w-36 gap-1.5" onClick={() => open(b)} disabled={opening !== null || !selectedSubsidiaryId}>
                {opening === b.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardPaste className="h-3.5 w-3.5" />}
                Mandar al pegado
              </Button>
            )}
          </li>
        ))}
      </ul>
      {plan.batches.some((b) => !b.consNumber && b.kind === "master") && (
        <p className="mt-1 text-xs text-slate-500">Los lotes "sin número" piden capturar el consolidado en el pegado.</p>
      )}

      <PasteImportModal
        open={!!prefill}
        onOpenChange={(o) => !o && setPrefill(null)}
        subsidiaryId={prefill?.subsidiaryId}
        prefill={prefill}
        onImported={handleImported}
      />
    </section>
  );
}
