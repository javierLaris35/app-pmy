/**
 * Orden por código postal del destinatario y, a igual CP, por dirección.
 *
 * Se usa para que la "salida a ruta" (PDF/Excel y listado en pantalla) salga
 * ordenada por CP + dirección, facilitando que el repartidor siga la ruta.
 *
 * El CP mexicano son 5 dígitos, así que el orden numérico = orden de string;
 * de todos modos comparamos numéricamente cuando ambos son numéricos y dejamos
 * los registros sin CP al final. Dentro del mismo CP desempatamos alfabéticamente
 * por `recipientAddress` (los sin dirección van al final del grupo).
 */
export interface HasRecipientZip {
  recipientZip?: string | null;
  recipientAddress?: string | null;
}

export function compareByZip(a: HasRecipientZip, b: HasRecipientZip): number {
  const za = (a?.recipientZip ?? "").toString().trim();
  const zb = (b?.recipientZip ?? "").toString().trim();

  if (za || zb) {
    if (!za) return 1; // sin CP -> al final
    if (!zb) return -1;

    const na = Number(za);
    const nb = Number(zb);
    const zipCmp =
      !Number.isNaN(na) && !Number.isNaN(nb) ? na - nb : za.localeCompare(zb);
    if (zipCmp !== 0) return zipCmp;
  }

  // Mismo CP (o ambos sin CP): desempate por dirección.
  const aa = (a?.recipientAddress ?? "").toString().trim();
  const ab = (b?.recipientAddress ?? "").toString().trim();
  if (!aa && !ab) return 0;
  if (!aa) return 1; // sin dirección -> al final del grupo
  if (!ab) return -1;
  return aa.localeCompare(ab, "es", { numeric: true, sensitivity: "base" });
}

/** Devuelve una copia ordenada por CP (no muta el arreglo original). */
export function sortByZip<T extends HasRecipientZip>(items: T[]): T[] {
  return [...items].sort(compareByZip);
}
