"use client";

import { PmySpinner } from "@/components/ui/pmy-loader";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInboxSearch } from "@/hooks/services/inbox/use-inbox";
import { inboxErrorText } from "@/lib/services/inbox";
import { ConsolidationHit, EmailRef, GuideHit, HeadType } from "@/lib/types/inbox-lookup";
import { cn } from "@/lib/utils";
import { EmailRefList } from "./email-ref-list";
import { BUCKET, TYPE_LABEL, dayText, statusText } from "./lookup-labels";
import { Boxes, ChevronRight, Mail, Package, Search, X } from "lucide-react";

export interface SearchActions {
  /** Abre el correo señalando dónde está lo buscado. */
  onOpenEmail: (email: EmailRef, found: { text: string; label: string }) => void;
  onOpenConsolidated: (p: { id?: string; cons: string; type: HeadType }) => void;
  onOpenGuide: (tracking: string) => void;
}

/**
 * Buscador de la Bandeja: un solo campo para consolidado, guía o texto del correo.
 * Un número se busca como consolidado Y como guía (los dos son de 10–12 dígitos);
 * se muestra lo que exista.
 */
export function InboxSearch({ onOpenEmail, onOpenConsolidated, onOpenGuide }: SearchActions) {
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 400);
    return () => clearTimeout(t);
  }, [text]);
  const { data, isLoading, error } = useInboxSearch(q);
  const active = q.length >= 3;
  const nothing = active && data && !data.consolidations.length && !data.guides.length && !data.messages.length;

  return (
    <section className="rounded-lg border bg-white p-3 shadow-sm">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && setQ(text.trim())}
          placeholder="Busca un consolidado, una guía (FedEx o DHL) o texto del asunto…"
          className="h-11 pl-10 pr-10 text-base"
          aria-label="Buscar en los correos"
        />
        {isLoading && active ? (
          <PmySpinner className="absolute right-3 top-3 h-5 w-5 text-slate-400" />
        ) : text ? (
          <button type="button" aria-label="Limpiar búsqueda" className="absolute right-3 top-3 text-slate-400 hover:text-slate-700" onClick={() => { setText(""); setQ(""); }}>
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>
      {!active && text.trim().length > 0 && <p className="mt-1.5 text-xs text-slate-500">Escribe al menos 3 caracteres.</p>}

      {active && error && <p className="mt-2 text-sm text-red-600">{inboxErrorText(error, "No se pudo buscar. Intenta de nuevo.")}</p>}
      {nothing && <p className="mt-2 text-sm text-slate-500">No encontramos nada con “{q}”. Revisa el número o prueba con otra parte del asunto.</p>}

      {active && data && !nothing && (
        <div className="mt-3 space-y-3">
          {data.consolidations.map((c) => (
            <ConsolidationCard key={`${c.id ?? "x"}-${c.consNumber}-${c.type}`} hit={c} onOpenEmail={onOpenEmail} onOpenConsolidated={onOpenConsolidated} />
          ))}
          {data.guides.map((g) => (
            <GuideCard key={g.trackingNumber} hit={g} onOpenEmail={onOpenEmail} onOpenConsolidated={onOpenConsolidated} onOpenGuide={onOpenGuide} />
          ))}
          {data.messages.length > 0 && (
            <div>
              <h3 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <Mail className="h-4 w-4 text-slate-500" /> Correos con “{data.query}” en el asunto o remitente
              </h3>
              <EmailRefList emails={data.messages} max={8} onOpen={(e) => onOpenEmail(e, { text: data.query, label: "el texto buscado" })} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ConsolidationCard({ hit, onOpenEmail, onOpenConsolidated }: { hit: ConsolidationHit } & Pick<SearchActions, "onOpenEmail" | "onOpenConsolidated">) {
  return (
    <div className="rounded-md border border-sky-200 bg-sky-50/40 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Boxes className="h-5 w-5 text-sky-700" />
        <span className="text-sm text-slate-600">Consolidado</span>
        <span className="font-mono text-base font-semibold text-slate-900">{hit.consNumber}</span>
        <Badge variant="outline" className="bg-white">{TYPE_LABEL[hit.type]}</Badge>
        <span className="text-sm text-slate-700">{hit.subsidiaryName ?? "Sin sucursal"}</span>
        {hit.day && <span className="text-sm text-slate-500">· {dayText(hit.day)}</span>}
        {hit.inSystem ? (
          <span className="text-sm text-slate-500">· {hit.total} guías{hit.declared != null && hit.declared !== hit.total ? ` (declaradas ${hit.declared})` : ""}</span>
        ) : (
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">Llegó por correo, no se ha subido</Badge>
        )}
        {hit.inSystem && (
          <Button size="sm" className="ml-auto h-8 gap-1" onClick={() => onOpenConsolidated({ id: hit.id ?? undefined, cons: hit.consNumber, type: hit.type })}>
            Ver detalles del consolidado <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="mt-2">
        <EmailRefList emails={hit.emails} max={4} onOpen={(e) => onOpenEmail(e, { text: hit.consNumber, label: `el consolidado ${hit.consNumber}` })} />
      </div>
    </div>
  );
}

function GuideCard({ hit, onOpenEmail, onOpenConsolidated, onOpenGuide }: { hit: GuideHit } & SearchActions) {
  return (
    <div className="rounded-md border border-violet-200 bg-violet-50/40 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Package className="h-5 w-5 text-violet-700" />
        <span className="text-sm text-slate-600">Guía</span>
        <span className="font-mono text-base font-semibold text-slate-900">{hit.trackingNumber}</span>
        {!hit.records.length && (
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">Llegó por correo, no está en el sistema</Badge>
        )}
        {hit.records.length > 0 && (
          <Button size="sm" className="ml-auto h-8 gap-1" onClick={() => onOpenGuide(hit.trackingNumber)}>
            Ver detalles de la guía <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
      {hit.records.length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {hit.records.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className={cn("rounded-full border px-2 text-xs", BUCKET[r.bucket].cls)}>{statusText(r.status)}</span>
              <span className="text-slate-700">{r.subsidiaryName}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-600">{r.type === "carga" ? "Carga" : "Paquete"}</span>
              {r.consNumber && (
                <>
                  <span className="text-slate-400">· consolidado</span>
                  <Button variant="link" className="h-auto p-0 font-mono text-sm" onClick={() => onOpenConsolidated({ cons: r.consNumber!, type: r.type })}>
                    {r.consNumber}
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-2">
        <EmailRefList emails={hit.emails} max={4} onOpen={(e) => onOpenEmail(e, { text: hit.trackingNumber, label: `la guía ${hit.trackingNumber}` })} />
      </div>
    </div>
  );
}
