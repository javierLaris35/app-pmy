import { Badge } from "@/components/ui/badge";
import {
  PO_STATUS_LABEL,
  PoStatus,
  PRIORITY_LABEL,
  REQUEST_STATUS_LABEL,
  RequestPriority,
  RequestStatus,
} from "@/lib/types/maintenance";

const REQUEST_CLASS: Record<RequestStatus, string> = {
  abierta: "border-sky-200 bg-sky-50 text-sky-700",
  en_cotizacion: "border-violet-200 bg-violet-50 text-violet-700",
  orden_generada: "border-amber-200 bg-amber-50 text-amber-700",
  completada: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelada: "border-slate-200 bg-slate-50 text-slate-500",
};

const PRIORITY_CLASS: Record<RequestPriority, string> = {
  baja: "border-slate-200 bg-slate-50 text-slate-600",
  media: "border-sky-200 bg-sky-50 text-sky-700",
  alta: "border-rose-200 bg-rose-50 text-rose-700",
};

export const PO_CLASS: Record<PoStatus, string> = {
  borrador: "border-slate-200 bg-slate-50 text-slate-600",
  pendiente: "border-amber-200 bg-amber-50 text-amber-700",
  autorizada: "border-sky-200 bg-sky-50 text-sky-700",
  rechazada: "border-rose-200 bg-rose-50 text-rose-700",
  enviada: "border-violet-200 bg-violet-50 text-violet-700",
  completada: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelada: "border-slate-200 bg-slate-100 text-slate-500 line-through",
};

export const RequestStatusBadge = ({ status }: { status: RequestStatus }) => (
  <Badge variant="outline" className={REQUEST_CLASS[status]}>{REQUEST_STATUS_LABEL[status]}</Badge>
);

export const PriorityBadge = ({ priority }: { priority: RequestPriority }) => (
  <Badge variant="outline" className={PRIORITY_CLASS[priority]}>{PRIORITY_LABEL[priority]}</Badge>
);

export const PoStatusBadge = ({ status }: { status: PoStatus }) => (
  <Badge variant="outline" className={PO_CLASS[status]}>{PO_STATUS_LABEL[status]}</Badge>
);
