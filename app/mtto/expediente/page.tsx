"use client";

import { withAuth } from "@/hoc/withAuth";
import { LegacyRedirect } from "@/components/maintenance/shared/legacy-redirect";

/** Ruta de la v2: redirige a /compras/solicitud (notificaciones y favoritos viejos). */
function MttoExpedienteRedirect() {
  return <LegacyRedirect to="/compras/solicitud" keepId />;
}

export default withAuth(MttoExpedienteRedirect);
