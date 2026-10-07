"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { SucursalSelector } from "@/components/sucursal-selector";
import { withAuth } from "@/hoc/withAuth";
import { Input } from "@/components/ui/input";
import { Subsidiary } from "@/lib/types";
import { InboxBoard } from "@/components/bandeja-correos/inbox-board";
import { InboxDetailSheet } from "@/components/bandeja-correos/inbox-detail-sheet";
import { hmoDay } from "@/components/bandeja-correos/labels";
import { ListChecks } from "lucide-react";

/** Seguimiento de lo que llegó por correo: rutas locales y recorrido de cada consolidado. */
function SeguimientoCorreosPage() {
  const [subsidiaryId, setSubsidiaryId] = useState("");
  const [from, setFrom] = useState(() => hmoDay(-6));
  const [to, setTo] = useState(() => hmoDay(0));
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <AppLayout>
      <div className="flex min-h-screen flex-col gap-4 p-4 md:p-5">
        <OperationHeader
          icon={ListChecks}
          title="Seguimiento de correos"
          description="Qué llegó por correo, si se subió y en qué paso va (desembarque, ruta, cierre)"
          actions={
            <div className="flex items-center gap-2">
              <div className="w-56">
                <SucursalSelector value={subsidiaryId} onValueChange={(v) => setSubsidiaryId(typeof v === "string" ? v : (v as Subsidiary)?.id ?? "")} />
              </div>
              <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-9 w-36" aria-label="Desde" />
              <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-9 w-36" aria-label="Hasta" />
            </div>
          }
        />

        <InboxBoard from={from} to={to} subsidiaryId={subsidiaryId || undefined} active onOpenMessage={setOpenId} />

        <InboxDetailSheet id={openId} onOpenChange={(o) => !o && setOpenId(null)} onChanged={() => undefined} />
      </div>
    </AppLayout>
  );
}

export default withAuth(SeguimientoCorreosPage, "correo.bandeja");
