"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { ClipboardPaste, ArrowLeft, HelpCircle } from "lucide-react";
import { AppLayout } from "@/components/app-layout";
import { withAuth } from "@/hoc/withAuth";
import { OperationHeader } from "@/components/shared/operation-header";
import { Button } from "@/components/ui/button";
import { PasteImportModal } from "@/components/import-components/paste-import-modal";
import { useAuthStore } from "@/store/auth.store";

/**
 * Página dedicada del flujo "Pegar datos FedEx" (antes solo modal).
 * Reutiliza el MISMO componente (`PasteImportModal`) en modo `asPage`, así que la
 * lógica y la UI son idénticas al modal; aquí solo cambia el envoltorio (AppLayout +
 * OperationHeader en vez de Dialog). Rollback: ver el flag PASTE_AS_PAGE en `envios`.
 */
function PasteImportPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const subsidiaryId = user?.subsidiary?.id;
  const helpRef = useRef<(() => void) | undefined>(undefined);

  return (
    <AppLayout>
      <div className="space-y-6">
        <OperationHeader
          icon={ClipboardPaste}
          title="Pegar datos FedEx"
          description="Copia desde Excel (con encabezados) y pega aquí. Mismo mapeo y validaciones que el import por archivo."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="gap-1.5 text-muted-foreground hover:text-foreground" onClick={() => helpRef.current?.()}>
                <HelpCircle className="h-4 w-4" /> Cómo funciona
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" /> Volver
              </Button>
            </div>
          }
        />

        <PasteImportModal asPage subsidiaryId={subsidiaryId} onClose={() => router.back()} helpHandleRef={helpRef} />
      </div>
    </AppLayout>
  );
}

export default withAuth(PasteImportPage, "operaciones.envios");
