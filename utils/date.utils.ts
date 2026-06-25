/**
 * Formatea un Date a "YYYY-MM-DD" usando la fecha LOCAL (no UTC). Úsalo SIEMPRE
 * para valores de <input type="date">. Antes se usaba `toISOString().slice(0,10)`,
 * que devuelve la fecha en UTC: en Hermosillo (UTC-7), por la tarde/noche el UTC
 * ya es el día siguiente → el input "sumaba un día".
 */
export function toDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Hoy en formato de input de fecha (local). */
export function todayInputValue(): string {
  return toDateInputValue(new Date());
}

/** Hoy ± n días en formato de input de fecha (local). */
export function addDaysInputValue(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toDateInputValue(d);
}

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

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';

  const utcDate = new Date(dateStr);

  // 🕓 Formateador de fecha y hora para Hermosillo
  const formatter = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Hermosillo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false, // usa formato 24h
  });

  // 📅 Devuelve fecha y hora (ej: 22/10/2025 13:45)
  return formatter.format(utcDate);
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  
  try {
    // Si es una fecha ISO (contiene 'T' o es un formato completo)
    if (dateStr.includes('T') || dateStr.includes('-')) {
      // Extraer directamente los componentes YYYY-MM-DD del string
      const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        return `${day}/${month}/${year}`;
      }
      
      // Si no coincide el patrón, intentar con Date pero ajustando por zona horaria
      const date = new Date(dateStr);
      
      // Validar que la fecha sea válida
      if (isNaN(date.getTime())) {
        console.warn('Fecha ISO inválida:', dateStr);
        return '';
      }
      
      // Usar UTC para evitar problemas de zona horaria
      const day = date.getUTCDate().toString().padStart(2, '0');
      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const year = date.getUTCFullYear().toString();
      
      return `${day}/${month}/${year}`;
    }
    
    // Si ya viene en formato DD/MM/YYYY, retornar tal cual
    const dateRegex = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
    if (dateRegex.test(dateStr)) {
      const [day, month, year] = dateStr.split('/');
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    
    console.warn('Formato de fecha no reconocido:', dateStr);
    return '';
    
  } catch (error) {
    console.warn('Error al formatear fecha:', dateStr, error);
    return '';
  }
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
    fromDate: toDateInputValue(lastMonday),
    toDate: toDateInputValue(lastSunday)
  }
}

/**
 * Obtiene la fecha y hora actual en zona horaria de Hermosillo
 * con una hora específica, en formato compatible con input datetime-local
 *
 * @param hour - Hora del día (0-23). Por defecto: 21 (9pm)
 * @returns Fecha en formato YYYY-MM-DDTHH:MM
 *
 * @example
 * getCurrentHermosilloDateTime() // "2025-01-16T21:00" (9pm hoy)
 * getCurrentHermosilloDateTime(14) // "2025-01-16T14:00" (2pm hoy)
 */
export function getCurrentHermosilloDateTime(hour: number = 21): string {
  const hermosillo = new Date().toLocaleString("en-US", {
    timeZone: "America/Hermosillo",
  });
  const date = new Date(hermosillo);
  date.setHours(hour, 0, 0, 0);

  // Formatear para datetime-local: YYYY-MM-DDTHH:MM
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}