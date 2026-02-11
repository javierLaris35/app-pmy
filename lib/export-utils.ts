import * as XLSX from "xlsx";
import { NewIncome } from "@/lib/types";
import { parseCurrency } from "./utils";

export const exportIncomesToExcel = (incomes: NewIncome[]) => {
  if (!incomes?.length) return;

  const wb = XLSX.utils.book_new();

  // Hoja 1: Resumen Diario
  const dailyData = incomes.map((i) => ({
    Fecha: i.date,
    "Fedex Total": i.fedex?.total,
    "Ingreso Fedex": parseCurrency(i.fedex?.totalIncome ?? 0),
    "DHL Total": i.dhl?.total,
    "Ingreso DHL": parseCurrency(i.dhl?.totalIncome ?? 0),
    Cargas: i.cargas,
    Total: i.total,
    "Ingreso Total": parseCurrency(i.totalIncome ?? 0),
  }));

  const wsDaily = XLSX.utils.json_to_sheet(dailyData);
  XLSX.utils.book_append_sheet(wb, wsDaily, "Resumen Diario");

  // Hoja 2: Detalle por Guía (Casos Especiales)
  const itemData = incomes.flatMap(day => 
    (day.items || []).map(item => ({
      Fecha_Contable: day.date,
      Tracking: item.trackingNumber,
      Tipo: item.type,
      Courier: item.shipmentType,
      Estatus: item.status,
      Costo: item.cost,
      Fecha_Evento: item.date
    }))
  );

  const wsItems = XLSX.utils.json_to_sheet(itemData);
  XLSX.utils.book_append_sheet(wb, wsItems, "Detalle de Guías");

  XLSX.writeFile(wb, `Reporte_Ingresos_${new Date().getTime()}.xlsx`);
};