import { MonitoringInfo, PackageStats } from "./monitoring-types"

// Estatus que NO cuentan para los indicadores operativos (los maneja FedEx directo).
export const STATUS_IGNORADOS = [
  "entregado_por_fedex",
  "estacion_fedex",
  "recoleccion",
  "retorno_abandono_fedex",
  "acargo_de_fedex",
]

// Estatus considerados "no entregados" (DEX).
export const STATUS_NO_ENTREGADOS = [
  "no_entregado",
  "rechazado",
  "cliente_no_disponible",
  "cambio_fecha_solicitado",
  "direccion_incorrecta",
  "cliente_no_encontrado",
  "devuelto_a_fedex",
]

export const calculateStats = (packages: MonitoringInfo[]): PackageStats => {
  const statusIgnorados = STATUS_IGNORADOS
  const statusNoEntregados = STATUS_NO_ENTREGADOS

  const packagesFiltrados = packages.filter((p) => !statusIgnorados.includes(p.shipmentData?.shipmentStatus?.toLowerCase().trim() || ""));
  const total = packagesFiltrados.length;

  const enRuta = packagesFiltrados.filter(p => p.shipmentData?.shipmentStatus?.toLowerCase().trim() === "en_ruta").length;
  const entregados = packagesFiltrados.filter(p => p.shipmentData?.shipmentStatus?.toLowerCase().trim() === "entregado").length;
  const enBodega = packagesFiltrados.filter(p => ["en_bodega", "pendiente"].includes(p.shipmentData?.shipmentStatus?.toLowerCase().trim())).length;
  const noEntregados = packagesFiltrados.filter((p) => statusNoEntregados.includes(p.shipmentData?.shipmentStatus?.toLowerCase().trim() || "")).length;

  const porcentajeEntrega = total > 0 ? (entregados / total) * 100 : 0;
  const porcentajeNoEntrega = total > 0 ? (noEntregados / total) * 100 : 0;

  const totalIntentos = entregados + noEntregados;
  const rendimientoReal = totalIntentos > 0 ? (entregados / totalIntentos) * 100 : 0;
  const tasaDex = totalIntentos > 0 ? (noEntregados / totalIntentos) * 100 : 0;

  const packagesToSettle = packagesFiltrados.filter(p => p.shipmentData?.shipmentStatus?.toLowerCase().trim() === "entregado" && (p.shipmentData?.payment?.amount ?? 0) > 0);
  const totalAmountToSettle = packagesToSettle.reduce((sum, p) => sum + (Number(p.shipmentData.payment?.amount) || 0), 0);

  return {
    total, enRuta, enBodega, entregados, noEntregados, porcentajeEntrega, porcentajeNoEntrega, eficiencia: porcentajeEntrega,
    packagesWithPayment: packagesFiltrados.filter(p => (p.shipmentData?.payment?.amount ?? 0) > 0).length,
    totalPaymentAmount: packagesFiltrados.reduce((sum, p) => sum + (Number(p.shipmentData?.payment?.amount) || 0), 0),
    packagesToSettle: packagesToSettle.length, totalAmountToSettle, rendimientoReal, entregasEfectivas: entregados, dex: noEntregados, sinIntento: enBodega, tasaDex
  };
};

export const buildStatusData = (stats: PackageStats) => [
  { name: "En Ruta", value: stats.enRuta, color: "#3b82f6" },
  { name: "En Bodega", value: stats.enBodega, color: "#eab308" },
  { name: "Entregados", value: stats.entregados, color: "#10b981" },
  { name: "DEX", value: stats.dex, color: "#f43f5e" },
];

export const buildDestinationData = (packages: MonitoringInfo[]) =>
  packages.reduce((acc, pkg) => {
    const dest = pkg.shipmentData?.destination || "Sin destino"
    const existing = acc.find((item) => item.name === dest)
    if (existing) existing.value += 1; else acc.push({ name: dest, value: 1 })
    return acc
  }, [] as { name: string; value: number }[]).sort((a, b) => b.value - a.value).slice(0, 10);

export const buildRoutePerformanceData = (packages: MonitoringInfo[]) => {
  const routeMap = new Map<string, any>();
  const statusIgnorados = STATUS_IGNORADOS;
  const statusNoEntregados = STATUS_NO_ENTREGADOS;

  packages.forEach((pkg) => {
    const status = pkg.shipmentData?.shipmentStatus?.toLowerCase().trim() || "";
    if (statusIgnorados.includes(status)) return;
    const routeId = pkg.packageDispatch?.id || "unassigned";

    if (!routeMap.has(routeId)) {
      const driverName = (pkg.packageDispatch?.driver as any)?.name || pkg.packageDispatch?.driver || (pkg.packageDispatch?.id ? `Chofer (${pkg.packageDispatch.id.slice(0,4)})` : "Sin chofer asignado");
      routeMap.set(routeId, {
        id: routeId,
        routeName: typeof driverName === 'string' ? driverName : "Chofer",
        dispatchTrackingNumber: pkg.packageDispatch?.trackingNumber || "N/A",
        driver: typeof driverName === 'string' ? driverName : "Chofer",
        route: pkg.packageDispatch?.route || "-",
        vehicle: pkg.packageDispatch?.vehicle?.name || "N/A",
        plates: pkg.packageDispatch?.vehicle?.plateNumber || "N/A",
        total: 0, entregado: 0, pendiente: 0, devuelto: 0, enRuta: 0,
        cobrosALiquidar: 0 // Campo para el PDF
      });
    }

    const routeStats = routeMap.get(routeId)!;
    routeStats.total += 1;

    if (status === "entregado") {
      routeStats.entregado += 1;
      if (pkg.shipmentData?.payment?.amount) {
        routeStats.cobrosALiquidar += Number(pkg.shipmentData.payment.amount);
      }
    }
    else if (statusNoEntregados.includes(status)) routeStats.devuelto += 1;
    else if (status === "en_ruta") routeStats.enRuta += 1;
    else routeStats.pendiente += 1;
  });

  return Array.from(routeMap.values()).map(r => {
    const totalIntentos = r.entregado + r.devuelto;
    return {
      ...r,
      efectividad: totalIntentos > 0 ? parseFloat(((r.entregado / totalIntentos) * 100).toFixed(1)) : 0,
      pctEntregado: r.total > 0 ? ((r.entregado / r.total) * 100).toFixed(1) : "0.0",
      pctDevuelto: r.total > 0 ? ((r.devuelto / r.total) * 100).toFixed(1) : "0.0"
    };
  }).sort((a, b) => a.driver.localeCompare(b.driver));
};
