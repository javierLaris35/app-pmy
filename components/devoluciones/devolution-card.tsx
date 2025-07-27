import { FC } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Package, Clock, Check, X } from "lucide-react";
import { SelectStatus } from "./select-status";
import { ReturnValidaton } from "@/lib/types";

interface DevolutionCardProps {
  item: ReturnValidaton;
  index: number;
  isLoading: boolean;
  handleChangeStatus: (index: number, status: string) => void;
  handleReasonChange: (index: number, reason: string) => void;
  handleRemove: (trackingNumber: string) => void;
}

interface StatusInfo {
  color: string;
  icon: JSX.Element;
  text: string;
}

export const DevolutionCard: FC<DevolutionCardProps> = ({
  item,
  index,
  isLoading,
  handleChangeStatus,
  handleReasonChange,
  handleRemove,
}) => {

  return (
    <Card className="rounded-md border border-gray-200 shadow-xs bg-white hover:shadow-sm transition-shadow max-w-[250px]">
      <CardContent className="p-2 text-[12px] relative">
        {/* Remove Button (Top-Right Corner) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleRemove(item.trackingNumber)}
          disabled={isLoading}
          className="absolute top-0 right-1 text-red-500 hover:text-red-600 hover:bg-red-50 h-4 w-4 p-0"
          aria-label={`Eliminar envío ${item.trackingNumber}`}
          data-testid={`remove-button-${item.trackingNumber}`}
        >
          <Trash2 className="h-3 w-3" />
        </Button>

        {/* Header: Tracking, Status */}
        <div className="flex items-center gap-2 mb-1 mt-3 pr-6">
          <span className="font-semibold text-gray-800" title={item.trackingNumber}>
            {item.trackingNumber}
          </span>
          <Badge
            className={`px-1 py-0.5 text-[11px] font-medium flex-shrink-0`}
            data-testid={`status-badge-${item.status}`}
          >
            {item.isCharge}
          </Badge>
        </div>

        {/* Details: Subsidiary, Status, Income, Exception */}
        <div className="space-y-0.5 mb-1 text-gray-700">
          <div className="flex justify-between">
            <span className="text-gray-700 font-semibold">Sucursal:</span>
            <span className="truncate max-w-[120px] text-right" title={item.subsidiaryName}>
              {item.subsidiaryName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700 font-semibold">Estado:</span>
            <span className="truncate max-w-[120px] text-right">{item.lastStatus?.type ?? "N/A"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-700 font-semibold">Ingreso:</span>
            <span className={`text-right ${item.hasIncome ? "text-green-600" : "text-gray-500"}`}>
              {item.hasIncome ? "Sí" : "No"}
            </span>
          </div>
          {item.lastStatus?.exceptionCode && (
            <div className="flex justify-between">
              <span className="text-gray-700 font-semibold">Código:</span>
              <span className="text-red-600 truncate max-w-[120px] text-right" title={item.lastStatus.exceptionCode}>
                {item.lastStatus.exceptionCode}
              </span>
            </div>
          )}
        </div>

        {/* Status Selector */}
        <SelectStatus
          value={item.status}
          exceptionCode={item.lastStatus?.exceptionCode}
          reason={item.reason ?? ""}
          onChange={(value) => handleChangeStatus(index, value)}
          onReasonChange={(reason) => handleReasonChange(index, reason)}
          disabled={isLoading}
          placeholder="Estado"
        />
      </CardContent>
    </Card>
  );
};