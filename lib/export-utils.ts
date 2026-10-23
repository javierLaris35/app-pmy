import * as XLSX from "xlsx";
import { NewIncome } from "@/lib/types";
import { parseCurrency } from "./utils";

export const exportIncomesToExcel = (incomes: NewIncome[]) => {
  if (!incomes?.length) return;

  const wb = XLSX.utils.book_new();

  // Hoja 1: Resumen Diario
  const dailyData = incomes.map((i) => ({
    Fecha: i.date,
    "FedEx POD": i.fedex?.pod ?? 0,
    "FedEx DEX07": i.fedex?.dex07 ?? 0,
    "FedEx DEX08": i.fedex?.dex08 ?? 0,
    "Fedex Total": i.fedex?.total,
    "Ingreso Fedex": parseCurrency(i.fedex?.totalIncome ?? 0),
    "DHL BA": i.dhl?.ba ?? 0,
    "DHL NE": i.dhl?.ne ?? 0,
    "DHL Total": i.dhl?.total,
    "Ingreso DHL": parseCurrency(i.dhl?.totalIncome ?? 0),
    "Traslados (Tyco/Aero/Esp)": `${i.transfers?.tyco ?? 0}/${i.transfers?.aeropuerto ?? 0}/${i.transfers?.especial ?? 0}`,
    "Ingreso Traslados": parseCurrency(i.transfers?.totalIncome ?? 0),
    Recolecciones: i.collections,
    Cargas: i.cargas,
    "Otros (Consolidador)": parseCurrency(i.otros?.totalIncome ?? 0),
    Total: i.total,
    "Ingreso Total": parseCurrency(i.totalIncome ?? 0),
    Correcciones: i.corrections?.count ?? 0,
    "Monto de correcciones": parseCurrency(i.corrections?.totalIncome ?? 0),
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
      Fecha_Evento: item.date,
      Cuenta: item.countable === false ? "No" : "Sí",
      Correccion: item.correction
        ? `${item.correction.kind === "editado" ? "Editado" : "Agregado"}${item.correction.by ? ` por ${item.correction.by}` : ""}${item.correction.reason ? `: ${item.correction.reason}` : ""}`
        : "",
    }))
  );

  const wsItems = XLSX.utils.json_to_sheet(itemData);
  XLSX.utils.book_append_sheet(wb, wsItems, "Detalle de Guías");

  XLSX.writeFile(wb, `Reporte_Ingresos_${new Date().getTime()}.xlsx`);
};