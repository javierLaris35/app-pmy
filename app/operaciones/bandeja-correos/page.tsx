"use client";

import React, { useMemo, useState } from "react";
import { PaginationState } from "@tanstack/react-table";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { SucursalSelector } from "@/components/sucursal-selector";
import { DataTable } from "@/components/data-table/data-table";
import { withAuth } from "@/hoc/withAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/store/auth.store";
import { useInboxMessages } from "@/hooks/services/inbox/use-inbox";
import { inboxErrorText, syncInbox } from "@/lib/services/inbox";
import { InboxView } from "@/lib/types/inbox";
import { Subsidiary } from "@/lib/types";
import { toast } from "@/lib/toast";
import { getInboxColumns } from "@/components/bandeja-correos/inbox-columns";
import { InboxDetailSheet } from "@/components/bandeja-correos/inbox-detail-sheet";
import { InboxBoard } from "@/components/bandeja-correos/inbox-board";
import { VIEW_LABEL, hmoDay } from "@/components/bandeja-correos/labels";
import { Loader2, Mail, RefreshCw, Search } from "lucide-react";

const VIEWS: InboxView[] = ["revision", "detectado", "confirmado", "todos", "ignorado", "error"];

function BandejaCorreosPage() {
  const role = String(useAuthStore((s) => s.user)?.role ?? "").toLowerCase();
  const isSuper = ["superadmin", "superamin", "owner"].includes(role);

  const [tab, setTab] = useState<"correos" | "tablero">("correos");
  const [view, setView] = useState<InboxView>("revision");
  const [subsidiaryId, setSubsidiaryId] = useState("");
  const [from, setFrom] = useState(() => hmoDay(-6));
  const [to, setTo] = useState(() => hmoDay(0));
  const [q, setQ] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });
  const [openId, setOpenId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const { data, isLoading, mutate } = useInboxMessages({
    status: view,
    subsidiaryId: subsidiaryId || undefined,
    from,
    to,
    q: q.trim() || undefined,
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  });
  const columns = useMemo(() => getInboxColumns(setOpenId), []);

  async function handleSync() {
    setSyncing(true);
    try {
      const r = await syncInbox();
      if (r.skipped) toast.info(r.skipped);
      else toast.success(r.read ? `Se leyeron ${r.read} correos (${r.saved} de FedEx)` : "No hay correos nuevos");
      await mutate();
    } catch (e) {
      toast.error(inboxErrorText(e, "No se pudo leer el correo"));
    } finally {
      setSyncing(false);
    }
  }

  const changeView = (v: InboxView) => {
    setView(v);
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  };

  return (
    <AppLayout>
      <TooltipProvider delayDuration={200}>
        <div className="flex min-h-screen flex-col gap-4 p-4 md:p-5">
          <OperationHeader
            icon={Mail}
            title="Bandeja de correos"
            description="Archivos de FedEx (y pronto DHL) que llegan a sistemas@, con la sucursal detectada"
            actions={
              <div className="flex items-center gap-2">
                <div className="w-56">
                  <SucursalSelector
                    value={subsidiaryId}
                    onValueChange={(v) => {
                      setSubsidiaryId(typeof v === "string" ? v : (v as Subsidiary)?.id ?? "");
                      setPagination((p) => ({ ...p, pageIndex: 0 }));
                    }}
                  />
                </div>
                <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-9 w-36" aria-label="Desde" />
                <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-9 w-36" aria-label="Hasta" />
                {isSuper && (
                  <Button size="sm" className="gap-2 whitespace-nowrap" onClick={handleSync} disabled={syncing}>
                    {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Leer correo ahora
                  </Button>
                )}
              </div>
            }
          />

          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              <TabsTrigger value="correos">Correos</TabsTrigger>
              <TabsTrigger value="tablero">Recibido vs subido</TabsTrigger>
            </TabsList>

            <TabsContent value="correos" className="mt-4 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {VIEWS.map((v) => (
                  <Button key={v} size="sm" variant={view === v ? "default" : "outline"} className="h-8 gap-1.5 rounded-full px-3" onClick={() => changeView(v)}>
                    {VIEW_LABEL[v]}
                    <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${view === v ? "bg-white/20" : "bg-slate-100 text-slate-600"}`}>
                      {data?.counts?.[v] ?? 0}
                    </span>
                  </Button>
                ))}
                <div className="relative ml-auto w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPagination((p) => ({ ...p, pageIndex: 0 }));
                    }}
                    placeholder="Buscar asunto, remitente o consolidado"
                    className="h-9 pl-8"
                  />
                </div>
              </div>

              {isLoading && !data ? (
                <div className="flex h-32 items-center justify-center text-sm text-slate-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando correos…
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={data?.items ?? []}
                  hideToolbar
                  hideSelectionCount
                  manualPagination
                  pageCount={Math.max(1, Math.ceil((data?.total ?? 0) / pagination.pageSize))}
                  pagination={pagination}
                  onPaginationChange={setPagination}
                  autoResetPageIndex={false}
                />
              )}
            </TabsContent>

            <TabsContent value="tablero" className="mt-4">
              <InboxBoard from={from} to={to} subsidiaryId={subsidiaryId || undefined} active={tab === "tablero"} onOpenMessage={setOpenId} />
            </TabsContent>
          </Tabs>

          <InboxDetailSheet id={openId} onOpenChange={(o) => !o && setOpenId(null)} onChanged={() => mutate()} />
        </div>
      </TooltipProvider>
    </AppLayout>
  );
}

export default withAuth(BandejaCorreosPage, "correo.bandeja");
