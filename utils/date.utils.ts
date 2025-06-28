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