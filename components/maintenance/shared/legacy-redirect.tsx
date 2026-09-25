"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AppLayout } from "@/components/app-layout";

/**
 * Redirección de las rutas de la v2 (`/mtto/...`) a las actuales. Las notificaciones guardadas en producción
 * y los favoritos siguen funcionando. Conserva el `?id=` si viene.
 */
function Redirector({ to, keepId }: { to: string; keepId?: boolean }) {
  const router = useRouter();
  const id = useSearchParams().get("id");
  useEffect(() => {
    router.replace(keepId && id ? `${to}?id=${encodeURIComponent(id)}` : to);
  }, [router, to, keepId, id]);
  return (
    <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Abriendo…
    </div>
  );
}

export function LegacyRedirect({ to, keepId }: { to: string; keepId?: boolean }) {
  return (
    <AppLayout>
      <Suspense fallback={null}>
        <Redirector to={to} keepId={keepId} />
      </Suspense>
    </AppLayout>
  );
}
