import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Package, Clock, Check, X } from "lucide-react";
import { SelectStatus } from "./select-status";

interface DevolutionItem {
  trackingNumber: string;
  status: string;
  hasIncome: boolean;
  subsidiaryName: string;
  lastStatus?: {
    type?: string;
    exceptionCode?: string;
  };
  reason?: string;
}

interface DevolutionRowProps {
  item: DevolutionItem;
  index: number;
  isLoading: boolean;
  handleChangeStatus: (index: number, status: string) => void;
  handleReasonChange: (index: number, reason: string) => void;
  handleRemove: (trackingNumber: string) => void;
}

export function DevolutionRow({
  item,
  index,
  isLoading,
  handleChangeStatus,
  handleReasonChange,
  handleRemove,
}: DevolutionRowProps) {
  const getStatusInfo = (status: string) => {
    switch(status) {
      case "ENTREGADO":
        return { color: "bg-green-100 text-green-800", icon: <Check className="h-4 w-4" />, text: "Entregado" };
      case "PENDIENTE":
        return { color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-4 w-4" />, text: "Pendiente" };
      case "NO_ENTREGADO":
      case "RECHAZADO":
        return { color: "bg-red-100 text-red-800", icon: <X className="h-4 w-4" />, text: status === "NO_ENTREGADO" ? "No entregado" : "Rechazado" };
      default:
        return { color: "bg-gray-100 text-gray-800", icon: <Package className="h-4 w-4" />, text: "En proceso" };
    }
  };

  const statusInfo = getStatusInfo(item.status);

  return (
    <div className="grid grid-cols-12 items-center gap-4 p-4 border-b">
      {/* Tracking Number */}
      <div className="col-span-2 flex items-center space-x-2">
        {statusInfo.icon}
        <span className="font-medium">#{item.trackingNumber}</span>
      </div>
      
      {/* Subsidiary */}
      <div className="col-span-2">
        <p className="text-sm">{item.subsidiaryName}</p>
      </div>
      
      {/* Status */}
      <div className="col-span-2">
        <Badge className={`${statusInfo.color} px-2 py-1 text-xs`}>
          {statusInfo.text}
        </Badge>
      </div>
      
      {/* Current Status */}
      <div className="col-span-2">
        <span className="text-sm">{item.lastStatus?.type || "No especificado"}</span>
      </div>
      
      {/* Exception Code */}
      <div className="col-span-1">
        {item.lastStatus?.exceptionCode && (
          <span className="text-sm text-red-600">{item.lastStatus.exceptionCode}</span>
        )}
      </div>
      
      {/* Income */}
      <div className="col-span-1">
        <span className={`text-sm ${item.hasIncome ? "text-green-600" : "text-gray-500"}`}>
          {item.hasIncome ? "Sí" : "No"}
        </span>
      </div>
      
      {/* Status Selector */}
      <div className="col-span-1">
        <SelectStatus
          value={item.status}
          exceptionCode={item.lastStatus?.exceptionCode}
          reason={item.reason}
          onChange={(value) => handleChangeStatus(index, value)}
          onReasonChange={(reason) => handleReasonChange(index, reason)}
          disabled={isLoading}
          compact
        />
      </div>
      
      {/* Actions */}
      <div className="col-span-1 flex justify-end">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => handleRemove(item.trackingNumber)}
          disabled={isLoading}
          className="text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}