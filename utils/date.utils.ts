export function parseDateFromDDMMYYYY(dateStr: string): Date {
  const [day, month, year] = dateStr.split('/');
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function formatDateWithTimeToDDMMYYYY(dateStr: string): Date {
  const date = new Date(dateStr);
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Mes empieza en 0
  const year = date.getUTCFullYear();
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function formatDateToShortDate(dateStr: string): string {
  if (!dateStr) return '';

  // 1️⃣ Crear el objeto Date desde el string UTC
  const utcDate = new Date(dateStr);

  // 2️⃣ Convertir a zona horaria de Hermosillo
  // Intl.DateTimeFormat maneja la conversión automática
  const formatter = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Hermosillo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  // 3️⃣ Retornar la fecha corta (DD/MM/YYYY)
  return formatter.format(utcDate);
}


export function getLastWeekRange(): { fromDate: string; toDate: string } {
  const today = new Date()
  const day = today.getDay()

  // Calcular lunes anterior
  const diffToLastMonday = day === 0 ? 6 + 7 : (day - 1) + 7
  const lastMonday = new Date(today)
  lastMonday.setDate(today.getDate() - diffToLastMonday)
  lastMonday.setHours(0, 0, 0, 0)

  // Calcular domingo siguiente
  const lastSunday = new Date(lastMonday)
  lastSunday.setDate(lastMonday.getDate() + 6)
  lastSunday.setHours(23, 59, 59, 999)

  return {
    fromDate: lastMonday.toISOString().slice(0, 10),
    toDate: lastSunday.toISOString().slice(0, 10)
  }
}