/**
 * Generador de contraseñas seguras (sin caracteres ambiguos como l/I/O/0) para
 * sugerir al crear/cambiar contraseñas de usuarios. Garantiza al menos una
 * minúscula, una mayúscula, un dígito y un símbolo.
 */
const LOWER = "abcdefghijkmnpqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*?";

function pick(set: string): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return set[arr[0] % set.length];
}

export function generateSecurePassword(length = 14): string {
  const all = LOWER + UPPER + DIGITS + SYMBOLS;
  const required = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  const rest = Array.from({ length: Math.max(length, 8) - required.length }, () => pick(all));
  const chars = [...required, ...rest];
  // Shuffle (Fisher–Yates con CSPRNG) para no dejar los obligatorios al inicio.
  for (let i = chars.length - 1; i > 0; i--) {
    const r = new Uint32Array(1);
    crypto.getRandomValues(r);
    const j = r[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}
