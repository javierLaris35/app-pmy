import { AlertCircle, Calendar, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ExpiringPackage {
    trackingNumber: string;
    recipientName?: string;
    recipientAddress?: string;
    commitDateTime?: string;
    daysUntilExpiration: number;
    priority?: string;
}

export interface ExpirationAlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    packages: ExpiringPackage[];
    currentIndex: number;
    onNext: () => void;
    onPrevious: () => void;
}

export function ExpirationAlertModal({
     isOpen,
     onClose,
     packages,
     currentIndex,
     onNext,
     onPrevious
 }: ExpirationAlertModalProps) {
    const packagesDueToday = packages.filter(pkg => pkg.daysUntilExpiration === 0);

    if (!packagesDueToday.length) return null;

    const currentPackage = packagesDueToday[currentIndex];
    const totalPackages = packagesDueToday.length;

    const handlePrint = () => {
        alert("handlePrint Test Button")
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="h-5 w-5" />
                        Paquete vence hoy
                        {totalPackages > 1 && (
                            <Badge variant="outline" className="ml-2">
                                {currentIndex + 1} de {totalPackages}
                            </Badge>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="flex items-center gap-2">
                        <span className="font-medium">Tracking:</span>
                        <span className="font-mono">{currentPackage.trackingNumber}</span>
                    </div>

                    {currentPackage.recipientName && (
                        <div className="flex items-center gap-2">
                            <span className="font-medium">Destinatario:</span>
                            <span>{currentPackage.recipientName}</span>
                        </div>
                    )}

                    {currentPackage.recipientAddress && (
                        <div className="flex items-center gap-2">
                            <span className="font-medium">Dirección:</span>
                            <span className="text-sm">{currentPackage.recipientAddress}</span>
                        </div>
                    )}

                    {currentPackage.priority && (
                        <div className="flex items-center gap-2">
                            <span className="font-medium">Prioridad:</span>
                            <Badge variant={
                                currentPackage.priority === "alta" ? "destructive" :
                                    currentPackage.priority === "media" ? "secondary" : "outline"
                            }>
                                {currentPackage.priority.toUpperCase()}
                            </Badge>
                        </div>
                    )}

                    {currentPackage.commitDateTime && (
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>Fecha de vencimiento: {new Date(currentPackage.commitDateTime).toLocaleDateString("es-MX")}</span>
                        </div>
                    )}

                    <div className={cn(
                        "border rounded-md p-3",
                        "bg-red-50 border-red-200 text-red-800"
                    )}>
                        <p className="text-sm font-medium">
                            ⚠️ ESTE PAQUETE VENCE HOY ⚠️
                        </p>
                    </div>
                </div>

                <div className="flex items-center pt-4 border-t">
                    {/* Navegación a la izquierda (solo si hay múltiples paquetes) */}
                    {totalPackages > 1 && (
                        <div className="flex gap-2 mr-4">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={onPrevious}
                                disabled={currentIndex === 0}
                                className="h-8 w-8"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={onNext}
                                disabled={currentIndex === totalPackages - 1}
                                className="h-8 w-8"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* Botones de acción siempre a la derecha */}
                    <div className="flex gap-2 ml-auto">
                        <Button
                            onClick={onClose}
                            className="gap-2"
                        >
                            {currentIndex === totalPackages - 1 ? "Entendido" : "Siguiente"}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handlePrint}
                            className="gap-2"
                        >
                            <Printer className="h-4 w-4" />
                            Imprimir
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}