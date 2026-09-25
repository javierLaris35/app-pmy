"use client";

import { withAuth } from "@/hoc/withAuth";
import { LegacyRedirect } from "@/components/maintenance/shared/legacy-redirect";

/** Ruta de la v2: redirige a /compras/catalogos (notificaciones y favoritos viejos). */
function MttoProveedoresRedirect() {
  return <LegacyRedirect to="/compras/catalogos" />;
}

export default withAuth(MttoProveedoresRedirect);
