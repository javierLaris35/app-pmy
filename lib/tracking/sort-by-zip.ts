/**
 * Orden por código postal del destinatario (recipientZip).
 *
 * Se usa para que la "salida a ruta" (PDF/Excel y listado en pantalla) salga
 * ordenada por CP, facilitando que el repartidor siga la ruta.
 *
 * El CP mexicano son 5 dígitos, así que el orden numérico = orden de string;
 * de todos modos comparamos numéricamente cuando ambos son numéricos y dejamos
 * los registros sin CP al final.
 */
export interface HasRecipientZip {
  recipientZip?: string | null;
}

export function compareByZip(a: HasRecipientZip, b: HasRecipientZip): number {
  const za = (a?.recipientZip ?? "").toString().trim();
  const zb = (b?.recipientZip ?? "").toString().trim();

  if (!za && !zb) return 0;
  if (!za) return 1; // sin CP -> al final
  if (!zb) return -1;

  const na = Number(za);
  const nb = Number(zb);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;

  return za.localeCompare(zb);
}

/** Devuelve una copia ordenada por CP (no muta el arreglo original). */
export function sortByZip<T extends HasRecipientZip>(items: T[]): T[] {
  return [...items].sort(compareByZip);
}
