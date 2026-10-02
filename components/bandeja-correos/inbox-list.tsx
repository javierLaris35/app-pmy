"use client";

import { KeyboardEvent, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InboxListItem } from "@/lib/types/inbox";
import { cn } from "@/lib/utils";
import { UPLOAD_STATE, formatDateTime } from "./labels";
import { ChevronLeft, ChevronRight, Inbox, Paperclip } from "lucide-react";

interface Props {
  items: InboxListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  emptyText: string;
}

/** Lista compacta de correos: clic en el renglón o flechas ↑ ↓ para ver el detalle. */
export function InboxList({ items, selectedId, onSelect, page, pageSize, total, onPage, emptyText }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const idx = items.findIndex((i) => i.id === selectedId);

  // Mantiene visible el renglón elegido al moverse con el teclado.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-id="${selectedId}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      onSelect(items[Math.min(items.length - 1, idx + 1)].id);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      onSelect(items[Math.max(0, idx - 1)].id);
    }
  }

  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex min-h-0 flex-col rounded-md border bg-white">
      <div
        ref={listRef}
        role="listbox"
        aria-label="Correos"
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="min-h-0 flex-1 divide-y overflow-y-auto outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
      >
        {!items.length ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-slate-400">
            <Inbox className="h-6 w-6" />
            {emptyText}
          </div>
        ) : (
          items.map((m) => {
            const st = UPLOAD_STATE[m.uploadState];
            const active = m.id === selectedId;
            const guides = m.attachments.filter((a) => ["master", "master_aereo", "f2", "dhl"].includes(a.kind)).length;
            return (
              <button
                key={m.id}
                data-id={m.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => onSelect(m.id)}
                className={cn(
                  "block w-full border-l-2 px-3 py-2 text-left transition-colors",
                  active ? "border-l-sky-600 bg-sky-50/70" : "border-l-transparent hover:bg-slate-50",
                )}
              >
                <div className="flex items-baseline gap-2">
                  <span className={cn("min-w-0 flex-1 truncate text-sm", active ? "font-semibold text-slate-900" : "font-medium text-slate-800")}>
                    {m.subject || "(sin asunto)"}
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-slate-500">{formatDateTime(m.receivedAt)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="min-w-0 truncate">{m.fromName || m.fromAddress}</span>
                  {guides > 0 && (
                    <span className="flex shrink-0 items-center gap-0.5" title={`${guides} archivo(s) con guías`}>
                      <Paperclip className="h-3 w-3" />
                      {guides}
                    </span>
                  )}
                  <span className="ml-auto flex shrink-0 items-center gap-1">
                    {m.subsidiaryName && <span className="max-w-[120px] truncate font-medium text-slate-700">{m.subsidiaryName}</span>}
                    <Badge variant="outline" className={cn("px-1.5 py-0 text-[10px] font-medium", st.cls)}>
                      {st.label}
                    </Badge>
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
      <div className="flex items-center justify-between border-t px-3 py-1.5 text-xs text-slate-500">
        <span className="tabular-nums">{total ? `${from}–${to} de ${total}` : "0 correos"}</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Página anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={to >= total} onClick={() => onPage(page + 1)} aria-label="Página siguiente">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
