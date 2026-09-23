"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { SucursalSelector } from "@/components/sucursal-selector";
import { withAuth } from "@/hoc/withAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { KanbanSquare, List, Loader2, Plus, Search } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/access/permissions";
import { useBoard } from "@/hooks/services/maintenance/use-maintenance";
import { BoardCard, vehicleLabel } from "@/lib/types/maintenance";
import { Subsidiary } from "@/lib/types";
import { BOARD_VIEWS, BoardEmpty, BoardKanban, BoardList, BoardView, BoardViewsRail } from "@/components/maintenance/board/board-views";
import { RequestFormDialog } from "@/components/maintenance/requests/request-form-dialog";

function TableroContent() {
  const router = useRouter();
  const params = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const canAuthorize = hasPermission(user, "mttoVehiculos.autorizar");
  const [subsidiaryId, setSubsidiaryId] = useState(params.get("subsidiaryId") ?? "");
  const [view, setView] = useState<BoardView>("activos");
  const [layout, setLayout] = useState<"kanban" | "lista">("kanban");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [defaultVehicleId, setDefaultVehicleId] = useState<string | undefined>();
  const { cards, isLoading, mutate } = useBoard(subsidiaryId);

  // Atajo desde Unidades: ?nuevo=1&vehicleId=…
  useEffect(() => {
    if (params.get("nuevo") === "1" && subsidiaryId) {
      setDefaultVehicleId(params.get("vehicleId") ?? undefined);
      setOpen(true);
    }
  }, [params, subsidiaryId]);

  const filtered = useMemo(() => {
    const test = BOARD_VIEWS.find((v) => v.key === view)!.test;
    const term = q.trim().toLowerCase();
    return cards.filter((c) => test(c, canAuthorize) && (!term || `${c.folio} ${vehicleLabel(c.vehicle)} ${c.description}`.toLowerCase().includes(term)));
  }, [cards, view, q, canAuthorize]);

  const openCard = (c: BoardCard) => router.push(`/mtto/expediente?id=${c.id}`);

  return (
    <div className="flex min-h-screen flex-col gap-4 p-4 md:p-5">
      <OperationHeader
        icon={KanbanSquare}
        title="Tablero de mantenimiento"
        description="Cada tarjeta es un mantenimiento: avanza de izquierda a derecha"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SucursalSelector
              value={subsidiaryId}
              onValueChange={(val) => setSubsidiaryId((typeof val === "string" ? val : (val as Subsidiary).id) ?? "")}
            />
            <Button onClick={() => { setDefaultVehicleId(undefined); setOpen(true); }} disabled={!subsidiaryId} className="gap-2">
              <Plus className="h-4 w-4" /> Nuevo mantenimiento
            </Button>
          </div>
        }
      />

      {!subsidiaryId ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Elige una sucursal para ver su tablero.</CardContent></Card>
      ) : (
        <div className="flex flex-col gap-4 md:flex-row">
          <BoardViewsRail cards={cards} active={view} canAuthorize={canAuthorize} onChange={setView} />
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar folio, unidad o necesidad" className="pl-8" />
              </div>
              <ToggleGroup type="single" value={layout} onValueChange={(v) => v && setLayout(v as "kanban" | "lista")} size="sm" variant="outline">
                <ToggleGroupItem value="kanban" className="h-8 gap-1.5 px-2.5 text-xs"><KanbanSquare className="h-4 w-4" />Kanban</ToggleGroupItem>
                <ToggleGroupItem value="lista" className="h-8 gap-1.5 px-2.5 text-xs"><List className="h-4 w-4" />Lista</ToggleGroupItem>
              </ToggleGroup>
            </div>
            {isLoading && !cards.length ? (
              <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : cards.length === 0 ? (
              <BoardEmpty onCreate={() => setOpen(true)} />
            ) : layout === "kanban" ? (
              <BoardKanban cards={filtered} onOpen={openCard} />
            ) : (
              <BoardList cards={filtered} onOpen={openCard} />
            )}
          </div>
        </div>
      )}

      <RequestFormDialog
        open={open}
        onOpenChange={setOpen}
        subsidiaryId={subsidiaryId}
        defaultVehicleId={defaultVehicleId}
        onSaved={(r) => {
          mutate();
          router.push(`/mtto/expediente?id=${r.id}`);
        }}
      />
    </div>
  );
}

function TableroMttoPage() {
  return (
    <AppLayout>
      <Suspense fallback={null}>
        <TableroContent />
      </Suspense>
    </AppLayout>
  );
}

export default withAuth(TableroMttoPage, "mttoVehiculos.solicitudes");
