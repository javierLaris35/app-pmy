"use client";

import { withAuth } from "@/hoc/withAuth";
import { LegacyRedirect } from "@/components/maintenance/shared/legacy-redirect";

/** Ruta de la v2: redirige a /compras/tablero (notificaciones y favoritos viejos). */
function MttoTableroRedirect() {
  return <LegacyRedirect to="/compras/tablero" />;
}

export default withAuth(MttoTableroRedirect);
