import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Truck,
  MapPin,
  HelpCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatusHistory } from "@/lib/types";

interface Props {
  history: StatusHistory[];
}

const statusConfig: Record<
  string,
  {
    label: string;
    icon: JSX.Element;
    color: string;
    dotColor: string;
  }
> = {
  recoleccion: {
    label: "Recolectado",
    icon: <MapPin className="h-5 w-5 text-blue-600" />,
    color: "text-blue-700",
    dotColor: "bg-blue-500",
  },
  en_ruta: {
    label: "En Ruta",
    icon: <Truck className="h-5 w-5 text-purple-600" />,
    color: "text-purple-700",
    dotColor: "bg-purple-500",
  },
  entregado: {
    label: "Entregado",
    icon: <CheckCircle className="h-5 w-5 text-green-600" />,
    color: "text-green-700",
    dotColor: "bg-green-500",
  },
  pendiente: {
    label: "Pendiente",
    icon: <Clock className="h-5 w-5 text-yellow-600" />,
    color: "text-yellow-700",
    dotColor: "bg-yellow-500",
  },
  no_entregado: {
    label: "No Entregado",
    icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
    color: "text-red-700",
    dotColor: "bg-red-500",
  },
  error: {
    label: "Error",
    icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
    color: "text-red-700",
    dotColor: "bg-red-500",
  },
};

export function StatusHistoryTimeline({ history }: Props) {
  const sorted = [...history].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <ScrollArea className="h-[60vh] pr-3">
      <div className="relative border-l-2 border-slate-200 ml-4 space-y-8">
        {sorted.map((item, index) => {
          const config = statusConfig[item.status] ?? {
            label: item.status.toUpperCase(),
            icon: <HelpCircle className="h-5 w-5 text-slate-500" />,
            color: "text-slate-700",
            dotColor: "bg-slate-400",
          };

          const showException = item.exceptionCode && item.exceptionCode !== "";

          return (
            <div key={item.id} className="relative pl-8">
              {/* Dot */}
              <span
                className={`absolute left-[-0.6rem] top-1.5 h-4 w-4 rounded-full ring-4 ring-white shadow-md ${config.dotColor}`}
              ></span>

              {/* Icon + Label */}
              <div className="flex items-center gap-2 mb-1">
                {config.icon}
                <span className={`text-sm font-semibold ${config.color}`}>
                  {config.label}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-700 leading-snug">
                {item.notes}
              </p>

              {showException && (
                <p className="text-xs font-medium text-rose-600 mt-1 flex items-center gap-1">
                  <XCircle className="h-4 w-4" /> Código de Excepción: {item.exceptionCode}
                </p>
              )}

              {/* Timestamp */}
              <p className="text-xs text-slate-500 mt-1">
                {format(new Date(item.timestamp), "dd/MM/yyyy, HH:mm a", { locale: es })}
              </p>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}