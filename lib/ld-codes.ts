/**
 * Códigos DEX de FedEx que CANCELAN el Local Delay (LD) cuando ocurren el día de
 * vencimiento: el paquete tuvo movimiento. Incluye 42 (empresa cerrada) y 05
 * (retenido por seguridad en aduana). Fuente ÚNICA para el frontend.
 */
export const LD_DEX_CODES = new Set(["03", "05", "07", "08", "17", "42"]);

/** Toma los 2 dígitos del exceptionCode de FedEx ("08D"→"08", "DEX03"→"03"). */
export const twoDigits = (c?: string) => (String(c || "").match(/\d{2}/)?.[0] ?? "");
