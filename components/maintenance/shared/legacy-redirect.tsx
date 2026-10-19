"use client";

import { PmyLoader } from "@/components/ui/pmy-loader";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
    <PmyLoader size="sm" text="Abriendo…" className="p-10" />
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
