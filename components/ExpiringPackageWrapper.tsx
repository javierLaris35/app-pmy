import {Shipment} from "@/lib/types";
import {cn} from "@/lib/utils";
import {Badge} from "lucide-react";

interface ExpiringPackageWrapperProps {
    pkg: Shipment & { daysUntilExpiration?: number };
    children: React.ReactNode;
}

const ExpiringPackageWrapper = ({ pkg, children }: ExpiringPackageWrapperProps) => {
    // Determinar si el paquete está próximo a vencer
    const isExpiringSoon = pkg.daysUntilExpiration !== undefined && pkg.daysUntilExpiration <= 3;
    const isExpiringToday = pkg.daysUntilExpiration === 0;

    if (!isExpiringSoon) {
        return <>{children}</>;
    }

    return (
        <div className={cn(
            "relative",
            isExpiringToday ? "bg-red-50 border-l-4 border-l-red-400" : "bg-amber-50 border-l-4 border-l-amber-400"
        )}>
            {/* Badge indicador de vencimiento */}
            <div className="absolute top-2 right-2">
                <Badge variant={isExpiringToday ? "destructive" : "secondary"} className="text-xs">
                    {isExpiringToday ? "VENCE HOY" : `VENCE EN ${pkg.daysUntilExpiration} DÍAS`}
                </Badge>
            </div>
            {children}
        </div>
    );
};