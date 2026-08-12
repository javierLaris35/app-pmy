import { FC } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { SelectStatus } from "./select-status";
import { ReturnValidaton } from "@/lib/types";
import { DEVOLUTION_REASON_MAP } from "@/lib/constants";
import classNames from "classnames";

interface DevolutionCardProps {
  item: ReturnValidaton;
  index: number;
  isLoading: boolean;
  handleChangeStatus: (index: number, status: string) => void;
  handleReasonChange: (index: number, reason: string) => void;
  handleRemove: (trackingNumber: string) => void;
}

/** Convierte un estatus snake_case del backend en una etiqueta legible. */
function prettyStatus(raw?: string | null): string {
  if (!raw) return "Sin estatus";
  const known: Record<string, string> = {
    entregado: "Entregado",
    entregado_por_fedex: "Entregado por FedEx",
    entregado_en_bodega: "Entregado en bodega",
    no_entregado: "No entregado",
    en_ruta: "En ruta",
    en_transito: "En tránsito",
    en_bodega: "En bodega",
    recibido_en_bodega: "Recibido en bodega",
    pendiente: "Pendiente",
    recoleccion: "Recolección",
    rechazado: "Rechazado",
    devuelto_a_fedex: "Devuelto a FedEx",
    retorno_abandono_fedex: "Retorno / abandono FedEx",
    acargo_de_fedex: "A cargo de FedEx",
    estacion_fedex: "Estación FedEx",
    es_ocurre: "Es ocurre",
    cliente_no_disponible: "Cliente no disponible",
    direccion_incorrecta: "Dirección incorrecta",
    cambio_fecha_solicitado: "Cambio de fecha solicitado",
    cambio_domicilio: "Cambio de domicilio",
    llegado_despues: "Llegado después",
    demora_en_entrega: "Demora en entrega",
    empresa_cerrada: "Empresa cerrada",
    no_se_pudo_recolectar_el_cobro: "No se pudo recolectar el cobro",
    restriccion_seguridad_ubicacion: "Restricción de seguridad",
    desconocido: "Desconocido",
    otro: "Otro",
  };
  return known[raw] ?? raw.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Familia de color según la naturaleza del estatus (terminal bueno / devolución / excepción / tránsito). */
function statusTone(raw?: string | null): string {
  if (!raw) return "bg-slate-100 text-slate-600";
  if (raw.startsWith("entregado")) return "bg-emerald-50 text-emerald-700";
  if (["devuelto_a_fedex", "retorno_abandono_fedex", "acargo_de_fedex", "es_ocurre", "estacion_fedex"].includes(raw))
    return "bg-amber-50 text-amber-700";
  if (["en_ruta", "en_transito", "en_bodega", "recibido_en_bodega", "pendiente", "recoleccion"].includes(raw))
    return "bg-sky-50 text-sky-700";
  // El resto son excepciones de entrega (no_entregado, cliente_no_disponible, dex…).
  return "bg-rose-50 text-rose-700";
}

export const DevolutionCard: FC<DevolutionCardProps> = ({
  item,
  index,
  isLoading,
  handleChangeStatus,
  handleReasonChange,
  handleRemove,
}) => {
  const statusRaw = item.lastStatus?.type ?? item.status;
  const exceptionCode = item.lastStatus?.exceptionCode;
  const reasonLabel = exceptionCode ? DEVOLUTION_REASON_MAP[exceptionCode] : undefined;

  return (
    <Card className="group relative flex flex-col gap-3 rounded-xl border-0 bg-muted/30 p-3.5 shadow-sm transition-shadow hover:shadow-md">
      {/* Header: tipo + guía + eliminar */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span
            className={classNames(
              "w-fit rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              item.isCharge ? "bg-[#4d148c] text-white" : "bg-[#ff6600] text-white",
            )}
          >
            {item.isCharge ? "Carga / F2" : "FedEx"}
          </span>
          <span
            className="truncate font-mono text-sm font-semibold text-slate-900"
            title={item.trackingNumber}
          >
            {item.trackingNumber}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleRemove(item.trackingNumber)}
          disabled={isLoading}
          className="h-7 w-7 shrink-0 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
          aria-label={`Eliminar envío ${item.trackingNumber}`}
          data-testid={`remove-button-${item.trackingNumber}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Estatus actual (píldora protagonista) */}
      <div
        className={classNames(
          "flex items-center justify-between rounded-lg px-2.5 py-1.5",
          statusTone(statusRaw),
        )}
        data-testid={`status-badge-${statusRaw ?? "none"}`}
      >
        <span className="truncate text-xs font-semibold" title={prettyStatus(statusRaw)}>
          {prettyStatus(statusRaw)}
        </span>
        {exceptionCode && (
          <span
            className="ml-2 shrink-0 rounded bg-white/70 px-1.5 py-0.5 font-mono text-[10px] font-bold"
            title={reasonLabel ?? `Código ${exceptionCode}`}
          >
            {exceptionCode}
          </span>
        )}
      </div>

      {/* Meta: sucursal + ingreso */}
      <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-[12px]">
        <dt className="text-slate-500">Sucursal</dt>
        <dd className="truncate text-right font-medium text-slate-800" title={item.subsidiaryName}>
          {item.subsidiaryName || "—"}
        </dd>
        <dt className="text-slate-500">Ingreso</dt>
        <dd className="text-right">
          <span
            className={classNames(
              "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold",
              item.hasIncome ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
            )}
          >
            {item.hasIncome ? "Sí" : "No"}
          </span>
        </dd>
        {reasonLabel && (
          <>
            <dt className="text-slate-500">Motivo</dt>
            <dd className="truncate text-right font-medium text-slate-800" title={reasonLabel}>
              {reasonLabel}
            </dd>
          </>
        )}
      </dl>

      {/* Selector de motivo de devolución */}
      <div className="pt-2.5">
        <label className="mb-1 block text-[11px] font-medium text-slate-500">
          Motivo de devolución
        </label>
        <SelectStatus
          value={item.status}
          exceptionCode={item.lastStatus?.exceptionCode}
          reason={item.reason ?? ""}
          onChange={(value) => handleChangeStatus(index, value)}
          onReasonChange={(reason) => handleReasonChange(index, reason)}
          disabled={isLoading}
          placeholder="Selecciona un motivo"
        />
      </div>
    </Card>
  );
};
