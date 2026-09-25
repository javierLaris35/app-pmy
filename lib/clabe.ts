/**
 * CLABE interbancaria: 18 dígitos, el último es dígito verificador (pesos 3,7,1).
 * ESPEJO de pmy-api `src/maintenance/utils/clabe.util.ts` — mantener en sync.
 */
const WEIGHTS = [3, 7, 1];

export function clabeCheckDigit(first17: string): number {
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += (Number(first17[i]) * WEIGHTS[i % 3]) % 10;
  return (10 - (sum % 10)) % 10;
}

export function isValidClabe(raw: string | null | undefined): boolean {
  const d = String(raw ?? "").replace(/\s/g, "");
  if (!/^\d{18}$/.test(d)) return false;
  return clabeCheckDigit(d.slice(0, 17)) === Number(d[17]);
}

/** Bancos más comunes por los 3 primeros dígitos de la CLABE (para autollenar el banco). */
export const CLABE_BANKS: Record<string, string> = {
  "002": "Banamex", "012": "BBVA", "014": "Santander", "021": "HSBC", "030": "Bajío", "036": "Inbursa",
  "044": "Scotiabank", "058": "Banregio", "072": "Banorte", "127": "Azteca", "137": "BanCoppel", "638": "Nu México",
  "646": "STP", "722": "Mercado Pago",
};

export const bankFromClabe = (clabe?: string | null) => CLABE_BANKS[String(clabe ?? "").replace(/\s/g, "").slice(0, 3)];
