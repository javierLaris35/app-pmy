import * as XLSX from "xlsx";

/**
 * Lee el archivo de Excel del consolidado como renglones de texto SIN perder dígitos.
 *
 * Por qué existe: con formato "General", Excel muestra todo número de más de 11 dígitos
 * en notación científica (las guías FedEx tienen 12 → 3.83961E+11) y eso es lo único que
 * viaja al copiar: el portapapeles no trae el número real. En el archivo sí está completo,
 * así que aquí se toma el VALOR de la celda (no lo que se ve) para números enteros, y las
 * fechas/horas de Excel se pasan a texto que entiende el lector de vencimientos.
 */
export function workbookToRows(wb: XLSX.WorkBook): string[][] {
  // Primera hoja con datos.
  const ws = wb.SheetNames.map((n) => wb.Sheets[n]).find((s) => s && s["!ref"]);
  if (!ws) return [];
  const range = XLSX.utils.decode_range(ws["!ref"]!);
  const rows: string[][] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const row: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      row.push(cellText(ws[XLSX.utils.encode_cell({ r, c })]));
    }
    rows.push(row);
  }
  return rows;
}

const pad = (n: number) => String(n).padStart(2, "0");

function cellText(cell: XLSX.CellObject | undefined): string {
  if (!cell || cell.v === undefined || cell.v === null) return "";
  if (cell.t === "n" && typeof cell.v === "number") {
    const v = cell.v;
    if (cell.z && XLSX.SSF.is_date(String(cell.z))) {
      const d = XLSX.SSF.parse_date_code(v);
      const time = `${pad(d.H)}:${pad(d.M)}:${pad(Math.round(d.S))}`;
      if (v < 1) return time; // solo hora (fracción del día)
      const date = `${d.y}-${pad(d.m)}-${pad(d.d)}`;
      return v % 1 ? `${date} ${time}` : date;
    }
    if (Number.isInteger(v)) return Number.isSafeInteger(v) ? String(v) : BigInt(v).toString();
    return String(v);
  }
  return String(cell.w ?? cell.v).trim();
}

/** Lee el archivo con el formato de cada celda (sin él, una fecha de Excel llega como 46302). */
export function readWorkbook(data: ArrayBuffer | Uint8Array): XLSX.WorkBook {
  return XLSX.read(data, { type: "array", cellNF: true });
}

/** Renglones → texto con tabuladores (lo que se ve en el cuadro de pegado). */
export function rowsToTsv(rows: string[][]): string {
  return rows.map((r) => r.join("\t")).join("\n");
}

/** Lee uno o varios archivos (.xlsx/.xls/.csv) y los junta; varios consolidados se separan solos. */
export async function readExcelFiles(files: File[]): Promise<string[][]> {
  const all: string[][] = [];
  for (const f of files) {
    const wb = readWorkbook(await f.arrayBuffer());
    all.push(...workbookToRows(wb));
  }
  return all;
}
