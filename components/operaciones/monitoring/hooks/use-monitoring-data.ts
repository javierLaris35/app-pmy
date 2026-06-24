import { useEffect, useState } from "react"
import {
  getConsolidateds,
  getInfoFromPackageDispatch,
  getPackageDispatchs,
  getUnloadings,
  getInfoFromConsolidated,
  getInfoFromUnloading,
  updateDataFromFedexByPackageDispatchId,
  updateDataFromFedexByConsolidatedId,
  updateDataFromFedexByUnloadingId,
  getPackageDispatchsByDriverAndDateRange,
  getPackageDispatchsByDateRange,
} from "@/lib/services/monitoring/monitoring"
import { useAuthStore } from "@/store/auth.store"
import { Driver } from "@/lib/types"
import { type Consolidado } from "../../consolidated/consolidated-select"
import { type Desembarque } from "../../unloading/unloading-select"
import { type Ruta } from "@/components/package-dispatch/package-dispatch-select"
import { MonitoringInfo } from "../monitoring-types"

export type DateRangeFilter = "day" | "week" | "month" | "custom"

/**
 * Encapsula TODO el estado y los flujos de datos del monitoreo:
 * selección operativa (consolidado/desembarque/ruta), búsqueda analítica
 * (chofer/fechas), carga de dropdowns y el flujo cached-first + refresh
 * en segundo plano contra FedEx (chip "Actualizando… / Actualizado HH:mm").
 */
export function useMonitoringData() {
  const user = useAuthStore((s) => s.user)

  // Estado para separar búsqueda En Vivo vs Histórica
  const [isHistoryMode, setIsHistoryMode] = useState(false)

  // Filtros Operativos (En vivo)
  const [selectedConsolidado, setSelectedConsolidado] = useState<string>("")
  const [selectedDesembarque, setSelectedDesembarque] = useState<string>("")
  const [selectedRuta, setSelectedRuta] = useState<string>("")

  // Filtros Históricos (Analítica)
  const [selectedRepartidores, setSelectedRepartidores] = useState<Driver[]>([])
  const [dateRangeFilter, setDateRangeFilter] = useState<DateRangeFilter>("day")
  const [manualStartDate, setManualStartDate] = useState<string>("")
  const [manualEndDate, setManualEndDate] = useState<string>("")

  const [consolidateds, setConsolidateds] = useState<Consolidado[]>([])
  const [unloadings, setUnloadings] = useState<Desembarque[]>([])
  const [packageDispatchs, setPackageDispatchs] = useState<Ruta[]>([])
  const [packages, setPackages] = useState<MonitoringInfo[]>([])

  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  // Marca de la última actualización contra FedEx (para mostrar "actualizado hace…").
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [selectedSubsidiaryId, setSelectedSubsidiaryId] = useState<string | null>(null)

  const effectiveSubsidiaryId = selectedSubsidiaryId || user?.subsidiary?.id

  const fetchInitialData = async () => {
    setIsLoading(true)
    try {
      const [consolidatedData, unloadingsData, packageDispathData] = await Promise.all([
        getConsolidateds(effectiveSubsidiaryId),
        getUnloadings(effectiveSubsidiaryId),
        getPackageDispatchs(effectiveSubsidiaryId),
      ])
      setConsolidateds(consolidatedData || [])
      setUnloadings(unloadingsData || [])
      setPackageDispatchs(packageDispathData || [])
    } catch (error) { console.error("Error fetching initial data:", error) } finally { setIsLoading(false) }
  }

  /** Trae la info del grupo seleccionado (rápido, datos ya guardados). */
  const fetchGroupInfo = async (): Promise<MonitoringInfo[]> => {
    if (selectedRuta) return await getInfoFromPackageDispatch(selectedRuta)
    if (selectedConsolidado) return await getInfoFromConsolidated(selectedConsolidado)
    if (selectedDesembarque) return await getInfoFromUnloading(selectedDesembarque)
    return []
  }

  /** Dispara la actualización contra FedEx del grupo seleccionado. */
  const refreshGroupFromFedex = async (): Promise<void> => {
    if (selectedRuta) await updateDataFromFedexByPackageDispatchId(selectedRuta)
    else if (selectedConsolidado) await updateDataFromFedexByConsolidatedId(selectedConsolidado)
    else if (selectedDesembarque) await updateDataFromFedexByUnloadingId(selectedDesembarque)
  }

  // Fetch para Filtros Operativos (En Vivo).
  // Estrategia: mostrar de inmediato lo ya guardado (sin pantalla en blanco) y
  // LUEGO refrescar contra FedEx en segundo plano para ver lo más nuevo.
  const fetchPackagesData = async () => {
    // Si estamos en modo historia o no hay filtros vivos, limpiar y salir.
    if (isHistoryMode || (!selectedRuta && !selectedConsolidado && !selectedDesembarque)) {
      if (!isHistoryMode) setPackages([]);
      return
    }

    // 1. Pintar de inmediato lo que ya hay (datos de la última hora).
    setIsLoading(true)
    try {
      setPackages(await fetchGroupInfo())
    } catch (error) {
      console.error("Error obteniendo paquetes:", error); setPackages([])
    } finally { setIsLoading(false) }

    // 2. Refrescar contra FedEx en segundo plano y re-pintar (no bloquea la vista).
    setIsRefreshing(true)
    try {
      await refreshGroupFromFedex()
      setPackages(await fetchGroupInfo())
      setLastUpdatedAt(new Date())
    } catch (error) {
      console.error("Error actualizando desde FedEx:", error)
    } finally { setIsRefreshing(false) }
  }

  // Motor Unificado Analítico (Chofer y/o Fecha)
  const handleHistorySearch = async () => {
    setIsHistoryMode(true);
    setSelectedConsolidado("");
    setSelectedDesembarque("");
    setSelectedRuta("");

    setIsLoading(true);

    try {
      let start = new Date();
      let end = new Date();
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      if (dateRangeFilter === 'week') {
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
      } else if (dateRangeFilter === 'month') {
        start = new Date(start.getFullYear(), start.getMonth(), 1);
        end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (dateRangeFilter === 'custom') {
        if (!manualStartDate || !manualEndDate) return;
        start = new Date(manualStartDate + "T00:00:00");
        end = new Date(manualEndDate + "T23:59:59");
      }

      // 1. Determinar qué API usar dependiendo de si hay Chofer o no
      let rawResponse: any;
      if (selectedRepartidores.length > 0) {
        rawResponse = await getPackageDispatchsByDriverAndDateRange(selectedRepartidores[0].id, effectiveSubsidiaryId, start.toISOString(), end.toISOString());
      } else {
        rawResponse = await getPackageDispatchsByDateRange(effectiveSubsidiaryId, start.toISOString(), end.toISOString());
      }

      setPackages(rawResponse || []);

    } catch (error) {
      console.error("Error crítico en búsqueda histórica:", error);
      setPackages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchInitialData();
    if (isHistoryMode) await handleHistorySearch(); else await fetchPackagesData();
    setIsRefreshing(false)
  }

  const handleFilterChange = (type: 'consolidado' | 'desembarque' | 'ruta', value: string) => {
    setIsHistoryMode(false);
    setSelectedConsolidado(type === 'consolidado' ? value : '');
    setSelectedDesembarque(type === 'desembarque' ? value : '');
    setSelectedRuta(type === 'ruta' ? value : '');
    setSelectedRepartidores([]);
  }

  const clearAllFilters = () => {
    setIsHistoryMode(false);
    setSelectedConsolidado(""); setSelectedDesembarque(""); setSelectedRuta(""); setSelectedRepartidores([]); setPackages([])
  }

  // Carga de dropdowns: una sola vez por sucursal efectiva (selectedSubsidiaryId
  // o la del usuario). Antes había DOS effects que disparaban fetchInitialData en
  // paralelo al montar (doble carga); se unificó en este.
  useEffect(() => { if (effectiveSubsidiaryId) fetchInitialData() }, [effectiveSubsidiaryId])
  useEffect(() => { if (!isHistoryMode) fetchPackagesData() }, [selectedRuta, selectedConsolidado, selectedDesembarque, isHistoryMode])

  return {
    // sucursal
    selectedSubsidiaryId,
    setSelectedSubsidiaryId,
    effectiveSubsidiaryId,
    // selección operativa
    selectedConsolidado,
    selectedDesembarque,
    selectedRuta,
    // selección histórica
    isHistoryMode,
    selectedRepartidores,
    setSelectedRepartidores,
    dateRangeFilter,
    setDateRangeFilter,
    manualStartDate,
    setManualStartDate,
    manualEndDate,
    setManualEndDate,
    // dropdowns
    consolidateds,
    unloadings,
    packageDispatchs,
    // paquetes
    packages,
    // estado de carga
    isLoading,
    setIsLoading,
    isRefreshing,
    lastUpdatedAt,
    // handlers
    handleRefresh,
    handleFilterChange,
    clearAllFilters,
    handleHistorySearch,
  }
}
