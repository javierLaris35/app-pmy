"use client";

import { useRouter } from "next/navigation";
import { Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WelcomeDashboardView } from "./WelcomeDashboardView";

interface DashboardWelcomeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

/**
 * Diálogo de bienvenida (resumen operativo diario). Es un envoltorio delgado sobre
 * `WelcomeDashboardView`, que concentra la lógica y se comparte con la página
 * completa (`/operaciones/resumen-operativo`).
 */
export default function DashboardWelcome({ open, onOpenChange, userId }: DashboardWelcomeProps) {
  const router = useRouter();

  const goTo = (route: string) => {
    onOpenChange(false);
    router.push(route);
  };

  const openFullPage = () => {
    onOpenChange(false);
    router.push("/operaciones/resumen-operativo");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 gap-0 max-h-[92vh] flex flex-col overflow-hidden" showCloseButton={false}>
        <DialogHeader className="space-y-0 border-b p-5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20">
              <Package className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl">Resumen operativo</DialogTitle>
              <DialogDescription>Prioridades del día y estado de tus sucursales</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Solo montamos la vista (y por ende disparamos la consulta) con el diálogo abierto. */}
          {open && <WelcomeDashboardView variant="dialog" onNavigate={goTo} onOpenFullPage={openFullPage} />}
        </div>

        <div className="border-t p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <label htmlFor="dontShowAgain" className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              id="dontShowAgain"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              onChange={(e) => {
                const userPrefsKey = `dashboard_prefs_${userId}`;
                localStorage.setItem(userPrefsKey, JSON.stringify({ showDailyWelcome: !e.target.checked }));
              }}
            />
            No mostrar este resumen al iniciar sesión
          </label>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
