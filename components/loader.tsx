import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils";

interface LoaderProps {
    className?: string;
    text?: string;
    overlay?: boolean;
    transparent?: boolean;
}

export function LoaderWithOverlay({ className, text = "Cargando...", overlay = false, transparent = false }: LoaderProps) {
    if (overlay) {
        return (
            <div className={cn(
                "fixed inset-0 flex items-center justify-center z-50",
                transparent ? "bg-transparent" : "bg-background/80 backdrop-blur-sm",
                className
            )}>
                <div className="flex flex-col items-center gap-3 bg-card p-5 rounded-lg border shadow-lg animate-in fade-in-90">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-sm font-medium text-foreground">{text}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center p-4">
            <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm">{text}</span>
            </div>
        </div>
    );
}

export function Loader() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex items-center space-x-3">
        <Loader2 className="h-6 w-6 animate-spin text-red-600" />
        <span className="text-lg font-medium">Cargando...</span>
      </div>
    </div>
  )
}