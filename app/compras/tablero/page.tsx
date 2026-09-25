"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { withAuth } from "@/hoc/withAuth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KanbanSquare, Plus } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { hasPermission } from "@/lib/access/permissions";
import { useSubsidiaries } from "@/hooks/services/subsidiaries/use-subsidiaries";
import { useBoard } from "@/hooks/services/maintenance/use-maintenance";
import { REQUEST_TYPE_LABEL, RequestType } from "@/lib/types/maintenance";
import { RequestsBoard } from "@/components/maintenance/board/requests-board";
import { RequestFormDialog } from "@/components/maintenance/requests/request-form-dialog";
import { SucursalSelector } from "@/components/sucursal-selector";
import { Subsidiary } from "@/lib/types";

const ALL = "__all__";

/**
 * Tablero de solicitudes. Compras (Gerardo) y quien autoriza ven todas las sucursales; los administradores
 * de sucursal (permiso "solicitudes") ven solo las suyas y en consulta (como el tablero de la v2).
 */
function TableroComprasPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const role = { purchaser: hasPermission(user, "mttoVehiculos.revisar"), authorizer: hasPermission(user, "mttoVehiculos.autorizar") };
  const { subsidiaries } = useSubsidiaries();
  const seesAll = role.purchaser || role.authorizer;
  const [subsidiaryId, setSubsidiaryId] = useState(ALL);
  // Sin "Todas" para administradores: arrancan en su sucursal principal (el backend exige una de las suyas).
  useEffect(() => {
    if (!seesAll && subsidiaryId === ALL && user?.subsidiary?.id) setSubsidiaryId(user.subsidiary.id);
  }, [seesAll, subsidiaryId, user?.subsidiary?.id]);
  const [type, setType] = useState(ALL);
  const [open, setOpen] = useState(false);
  const { cards, isLoading, mutate } = useBoard(
    { subsidiaryId: subsidiaryId === ALL ? undefined : subsidiaryId, type: type === ALL ? undefined : type },
    seesAll || subsidiaryId !== ALL,
  );

  const filters = (
    <>
      {seesAll ? (
        <Select value={subsidiaryId} onValueChange={setSubsidiaryId}>
          <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value={ALL}>Todas las sucursales</SelectItem>
            {(subsidiaries ?? []).map((s) => <SelectItem key={s.id} value={s.id!}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      ) : (
        <div className="w-[220px]">
          <SucursalSelector
            value={subsidiaryId === ALL ? "" : subsidiaryId}
            onValueChange={(val) => setSubsidiaryId((typeof val === "string" ? val : (val as Subsidiary).id) || ALL)}
          />
        </div>
      )}
      <Select value={type} onValueChange={setType}>
        <SelectTrigger className="h-9 w-[210px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos los tipos</SelectItem>
          {(Object.keys(REQUEST_TYPE_LABEL) as RequestType[]).map((t) => <SelectItem key={t} value={t}>{REQUEST_TYPE_LABEL[t]}</SelectItem>)}
        </SelectContent>
      </Select>
    </>
  );

  return (
    <AppLayout>
      <div className="flex min-h-screen flex-col gap-4 p-4 md:p-5">
        <OperationHeader
          icon={KanbanSquare}
          title={seesAll ? "Tablero de compras" : "Tablero de mi sucursal"}
          description={seesAll ? "Solicitudes de todas las sucursales por etapa" : "Solicitudes de tu sucursal por etapa (consulta)"}
          actions={
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Nueva solicitud
            </Button>
          }
        />
        <RequestsBoard
          cards={cards}
          isLoading={isLoading}
          role={role}
          filters={filters}
          empty={{ title: "Sin solicitudes", text: "Cuando alguien pida algo aparecerá aquí en \"Por revisar\"." }}
        />
        <RequestFormDialog open={open} onOpenChange={setOpen} onSaved={(r) => { mutate(); router.push(`/compras/solicitud?id=${r.id}`); }} />
      </div>
    </AppLayout>
  );
}

export default withAuth(TableroComprasPage, "mttoVehiculos.solicitudes");
