"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { KanbanSquare, List, Loader2, Search } from "lucide-react";
import { BoardCard, vehicleLabel } from "@/lib/types/maintenance";
import { BOARD_VIEWS, BoardEmpty, BoardKanban, BoardList, BoardView, BoardViewsRail, ViewerRole } from "./board-views";

interface Props {
  cards: BoardCard[];
  isLoading: boolean;
  role: ViewerRole;
  views?: typeof BOARD_VIEWS;
  /** Filtros de consulta extra (sucursal, tipo…), se pintan junto al buscador. */
  filters?: React.ReactNode;
  empty: { title: string; text: string; onCreate?: () => void };
}

/** Tablero de solicitudes (Kanban/Lista + rail de vistas + buscador). Lo usan "Mis solicitudes" y "Tablero de compras". */
export function RequestsBoard({ cards, isLoading, role, views = BOARD_VIEWS, filters, empty }: Props) {
  const router = useRouter();
  const [view, setView] = useState<BoardView>(views[0].key);
  const [layout, setLayout] = useState<"kanban" | "lista">("kanban");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const test = (views.find((v) => v.key === view) ?? views[0]).test;
    const term = q.trim().toLowerCase();
    return cards.filter((c) => test(c, role) && (!term || `${c.folio} ${vehicleLabel(c.vehicle)} ${c.description} ${c.subsidiary?.name ?? ""}`.toLowerCase().includes(term)));
  }, [cards, view, q, role, views]);

  const open = (c: BoardCard) => router.push(`/compras/solicitud?id=${c.id}`);

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <BoardViewsRail cards={cards} active={view} role={role} onChange={setView} views={views} />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar folio, unidad o descripción" className="h-9 pl-8" />
            </div>
            {filters}
          </div>
          <ToggleGroup type="single" value={layout} onValueChange={(v) => v && setLayout(v as "kanban" | "lista")} size="sm" variant="outline">
            <ToggleGroupItem value="kanban" className="h-8 gap-1.5 px-2.5 text-xs"><KanbanSquare className="h-4 w-4" />Kanban</ToggleGroupItem>
            <ToggleGroupItem value="lista" className="h-8 gap-1.5 px-2.5 text-xs"><List className="h-4 w-4" />Lista</ToggleGroupItem>
          </ToggleGroup>
        </div>
        {isLoading && !cards.length ? (
          <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : cards.length === 0 ? (
          <BoardEmpty title={empty.title} text={empty.text} onCreate={empty.onCreate} />
        ) : layout === "kanban" ? (
          <BoardKanban cards={filtered} onOpen={open} />
        ) : (
          <BoardList cards={filtered} onOpen={open} />
        )}
      </div>
    </div>
  );
}
