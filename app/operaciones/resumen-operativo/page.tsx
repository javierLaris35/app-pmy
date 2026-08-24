"use client";

import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { LayoutDashboard } from "lucide-react";
import { WelcomeDashboardView } from "@/components/welcome-dashboard/WelcomeDashboardView";
import { withAuth } from "@/hoc/withAuth";

function ResumenOperativoContent() {
  const router = useRouter();

  return (
    <AppLayout>
      <div className="space-y-5 md:space-y-8">
        <OperationHeader
          icon={LayoutDashboard}
          title="Resumen operativo"
          description="Prioridades del día, comprobación FedEx y exportación por sucursal"
        />
        <WelcomeDashboardView variant="page" onNavigate={(route) => router.push(route)} />
      </div>
    </AppLayout>
  );
}

// Disponible para cualquier usuario autenticado (igual que el resumen de bienvenida).
export default withAuth(ResumenOperativoContent);
