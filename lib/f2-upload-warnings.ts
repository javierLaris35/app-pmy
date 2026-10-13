/**
 * Avisos de la subida F2 (wizard y Pegar FedEx). El backend reporta:
 * - guías que FedEx no reconoce: nunca se van a actualizar solas (caso 677930734188, La Paz);
 * - guías que el master de este consolidado traía como paquete y NO se quitaron porque ya
 *   salieron a ruta o ya cobraron: quedan como paquete y como carga, hay que revisarlas.
 */
export function f2UploadWarnings(res: any): string[] {
  const notFound: string[] = res?.details?.notFoundInFedex ?? res?.notFoundInFedex ?? [];
  const kept: { tracking: string; reason: string }[] = res?.details?.keptInMaster ?? [];
  const out: string[] = [];
  if (notFound.length) {
    out.push(`FedEx no reconoce ${notFound.length === 1 ? "esta guía" : `estas ${notFound.length} guías`}; revisa que el número esté bien: ${notFound.join(", ")}`);
  }
  if (kept.length) {
    out.push(`No se quitaron de paquetes porque ya se trabajaron (revísalas): ${kept.map((k) => `${k.tracking} (${k.reason})`).join(", ")}`);
  }
  return out;
}
