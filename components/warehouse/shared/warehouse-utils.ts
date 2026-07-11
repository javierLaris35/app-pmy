// components/warehouse/shared/warehouse-utils.ts
export const isToday = (date: Date) => new Date().toDateString() === new Date(date).toDateString();

export const isTomorrow = (date: Date) => {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return t.toDateString() === new Date(date).toDateString();
};

export const checkIsWarehouse = (val: any): boolean => {
  if (val && typeof val === 'object' && 'data' in val) return val.data[0] === 1;
  return Boolean(val);
};

/** FedEx: recorta códigos numéricos de >=20 dígitos a los últimos 12. DHL (con letras) pasa intacto. */
export const trimFedexCode = (raw: string): string => {
  const code = raw.trim().toUpperCase();
  return code.length >= 20 && /^\d+$/.test(code) ? code.slice(-12) : code;
};
