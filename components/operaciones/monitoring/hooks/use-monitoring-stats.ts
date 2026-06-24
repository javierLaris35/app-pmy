import { useMemo } from "react"
import { MonitoringInfo } from "../monitoring-types"
import {
  calculateStats,
  buildStatusData,
  buildDestinationData,
  buildRoutePerformanceData,
} from "../monitoring-stats"

/**
 * Calcula los indicadores derivados de la lista de paquetes.
 * Memoiza igual que los useMemo originales del god component.
 */
export function useMonitoringStats(packages: MonitoringInfo[]) {
  const statsInfo = useMemo(() => calculateStats(packages), [packages])
  const statusData = useMemo(() => buildStatusData(statsInfo), [statsInfo])
  const destinationData = useMemo(() => buildDestinationData(packages), [packages])
  const routePerformanceData = useMemo(() => buildRoutePerformanceData(packages), [packages])

  return { statsInfo, statusData, destinationData, routePerformanceData }
}
