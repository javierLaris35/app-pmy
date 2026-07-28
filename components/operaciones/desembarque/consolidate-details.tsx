import { Eye, SearchIcon, Truck, Plane, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconTruckLoading } from "@tabler/icons-react";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import useSWR from "swr";
import { getConsolidatedsToStartUnloading } from "@/lib/services/unloadings";
import { Consolidateds } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth.store";
import { NotFoundShipmentDetails } from "./not-found-details";
import { Checkbox } from "@/components/ui/checkbox"

interface ConsolidateDetailsProps {
  consolidatedData?: any;
  initialSelectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  subsidiaryId?: string | null;
  /** Recarga el universo esperado desde BD sin perder los escaneos ya hechos. */
  onReload?: () => void;
  /** Busca un consolidado por número (consulta directa a BD) y lo agrega a la lista. */
  onSearchConsNumber?: (consNumber: string) => void;
  /** Indica que hay una recarga/búsqueda en curso. */
  reloading?: boolean;
}

// Mapeo local de iconos
const typeIcons: Record<string, React.ElementType> = {
  Terrestre: Truck,
  Áereo: Plane,
  "F2/Carga/31.5": Truck,
};

// Mapeo local de colores
const typeColors: Record<string, string> = {
  Terrestre: "bg-blue-100 text-blue-700 border-blue-200",
  Áereo: "bg-green-100 text-green-700 border-green-200",
  "F2/Carga/31.5": "bg-orange-100 text-orange-700 border-orange-200",
};

// Añadir cache en memoria para consolidados por sucursal
const consolidatedCache = new Map<string, any[]>();

export default function ConsolidateDetails({
  consolidatedData,
  initialSelectedIds = [],
  onSelectionChange,
  subsidiaryId,
  onReload,
  onSearchConsNumber,
  reloading = false,
}: ConsolidateDetailsProps) {
  const user = useAuthStore((s) => s.user);
  const [consNumberInput, setConsNumberInput] = useState("");

  // Ref para poder llamar al refetch interno desde handleReload sin problemas de orden.
  const handleRefetchRef = useRef<(() => void) | null>(null);

  // Recarga: usa el handler del padre (sesión con conteo) o el refetch interno.
  const handleReload = useCallback(() => {
    if (onReload) onReload();
    else handleRefetchRef.current?.();
  }, [onReload]);

  const submitConsNumberSearch = useCallback(() => {
    const cn = consNumberInput.trim();
    if (!cn || !onSearchConsNumber) return;
    onSearchConsNumber(cn);
    setConsNumberInput("");
  }, [consNumberInput, onSearchConsNumber]);
  
  // SOLUCIÓN: Validar que initialSelectedIds sea un array antes de crear el Set
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => {
    const validInitialIds = Array.isArray(initialSelectedIds) ? initialSelectedIds : [];
    return new Set(validInitialIds);
  });
  
  const [consolidateds, setConsolidateds] = useState<Consolidateds>({
    airConsolidated: [],
    groundConsolidated: [],
    f2Consolidated: [],
  });
  
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'props' | 'database'>('database');
  const [loading, setLoading] = useState(false);

  // SOLUCIÓN: Usar una ref para controlar si ya se hizo el fetch inicial
  const hasFetchedRef = useRef(false);
  const currentSubsidiaryIdRef = useRef<string | null>(null);

  // SWR fetcher - SOLUCIÓN: Usar un fetcher condicional
  const { data: swData, error: swError, isValidating, mutate } = useSWR(
    // SOLUCIÓN: Solo pasar la key si subsidiaryId es válido
    subsidiaryId ? ['consolidateds', subsidiaryId] : null,
    async () => {
      if (!subsidiaryId) return null;
      console.log("[ConsolidateDetails] Fetching for subsidiary:", subsidiaryId);
      
      // Verificar cache en memoria primero
      if (consolidatedCache.has(subsidiaryId)) {
        console.log("[ConsolidateDetails] Using cache for:", subsidiaryId);
        return consolidatedCache.get(subsidiaryId)!;
      }

      try {
        const data = await getConsolidatedsToStartUnloading(subsidiaryId);
        console.log("[ConsolidateDetails] Fetched data:", data);
        
        // Actualizar cache en memoria
        if (data) {
          consolidatedCache.set(subsidiaryId, data);
        }
        
        return data ?? null;
      } catch (err: any) {
        console.error("[ConsolidateDetails] Fetch error:", err);
        if (err?.status === 404) return null;
        throw err;
      }
    },
    {
      revalidateOnFocus: false,
      refreshInterval: 0,
      revalidateOnReconnect: false,
      onErrorRetry: (err) => {
        if (err && (err as any).status === 404) return;
      },
      // SOLUCIÓN: No revalidar automáticamente
      revalidateIfStale: false,
      revalidateOnMount: true,
    }
  );

  // Mapear resultado de SWR al estado local
  useEffect(() => {
    console.log("[ConsolidateDetails] Effect running with:", {
      subsidiaryId,
      consolidatedData: !!consolidatedData,
      swData: !!swData,
      isValidating,
      currentSubsidiaryId: currentSubsidiaryIdRef.current
    });

    // Si tenemos datos de props, usarlos
    if (consolidatedData) {
      console.log("[ConsolidateDetails] Using data from props");
      const validatedData = consolidatedData && typeof consolidatedData === 'object' 
        ? consolidatedData 
        : { airConsolidated: [], groundConsolidated: [], f2Consolidated: [] };
      
      setConsolidateds(validatedData);
      setDataSource("props");
      setLoading(false);
      setError(null);
      return;
    }

    // Si no hay subsidiaryId, no hacer nada
    if (!subsidiaryId) {
      console.log("[ConsolidateDetails] No subsidiaryId, clearing");
      setConsolidateds({ airConsolidated: [], groundConsolidated: [], f2Consolidated: [] });
      setLoading(false);
      return;
    }

    // Solo hacer fetch si el subsidiaryId cambió
    if (currentSubsidiaryIdRef.current === subsidiaryId && hasFetchedRef.current) {
      console.log("[ConsolidateDetails] Same subsidiaryId, skipping");
      return;
    }

    // Si está cargando o no hay datos todavía
    if (swData === undefined && isValidating) {
      console.log("[ConsolidateDetails] Loading...");
      setLoading(true);
      return;
    }

    // Procesar datos de SWR
    if (swData === null) {
      console.log("[ConsolidateDetails] No data (404)");
      setConsolidateds({ airConsolidated: [], groundConsolidated: [], f2Consolidated: [] });
      setDataSource("database");
      setLoading(false);
      setError(null);
      hasFetchedRef.current = true;
      currentSubsidiaryIdRef.current = subsidiaryId;
      return;
    }

    if (swData) {
      console.log("[ConsolidateDetails] Setting data from SWR");
      const validatedData = swData && typeof swData === 'object'
        ? swData
        : { airConsolidated: [], groundConsolidated: [], f2Consolidated: [] };
      
      setConsolidateds(validatedData);
      setDataSource("database");
      setLoading(false);
      setError(null);
      hasFetchedRef.current = true;
      currentSubsidiaryIdRef.current = subsidiaryId;
    }

    if (swError) {
      console.error("[ConsolidateDetails] SWR error:", swError);
      setLoading(false);
      setError("Error al cargar los consolidados");
    }
  }, [swData, swError, isValidating, subsidiaryId, consolidatedData]);

  // SOLUCIÓN: Efecto para resetear cuando subsidiaryId cambia a null/undefined
  useEffect(() => {
    if (!subsidiaryId && hasFetchedRef.current) {
      console.log("[ConsolidateDetails] SubsidiaryId cleared, resetting");
      setConsolidateds({ airConsolidated: [], groundConsolidated: [], f2Consolidated: [] });
      setLoading(false);
      hasFetchedRef.current = false;
      currentSubsidiaryIdRef.current = null;
    }
  }, [subsidiaryId]);

  // SOLUCIÓN: Función segura para obtener los items
  const allItems = useMemo(() => {
    // Verificar que consolidateds sea un objeto válido
    if (!consolidateds || typeof consolidateds !== 'object' || Array.isArray(consolidateds)) {
      return [];
    }
    
    try {
      // Extraer valores solo si es un objeto válido
      const values = Object.values(consolidateds);
      
      // Aplanar y filtrar valores nulos
      return values.flat().filter(Boolean);
    } catch (err) {
      console.error("Error al procesar consolidateds:", err, consolidateds);
      return [];
    }
  }, [consolidateds]);

  const getItemKey = useCallback((item: any, idx: number) => {
    if (!item) return `empty-${idx}`;
    return item.id ?? item.consNumber ?? `${item.type || 'item'}-${idx}`;
  }, []);

  // Orden de la lista: sube hasta arriba lo que el usuario está trabajando —
  // primero los consolidados con paquetes AGREGADOS, luego los SELECCIONADOS
  // (manual o por búsqueda), y el resto abajo. Así no pierde el foco de lo que
  // está desembarcando. Los items tienen `id`, así que reordenar no afecta las
  // keys de React ni la selección (que va por id).
  const orderedItems = useMemo(() => {
    const scored = allItems.map((it: any, i: number) => {
      const key = getItemKey(it, i);
      const added = Array.isArray(it?.added) ? it.added.length : 0;
      const selected = selectedKeys.has(key) ? 1 : 0;
      const priority = (added > 0 ? 2 : 0) + selected;
      return { it, i, added, priority };
    });
    scored.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (b.added !== a.added) return b.added - a.added;
      return a.i - b.i;
    });
    return scored.map((s) => s.it);
  }, [allItems, selectedKeys, getItemKey]);

  const toggleKey = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      
      if (onSelectionChange) {
        onSelectionChange(Array.from(next));
      }
      return next;
    });
  }, [onSelectionChange]);

  const selectAll = useCallback((checked: boolean) => {
    if (checked && allItems.length > 0) {
      const keys = new Set(allItems.map((it, i) => getItemKey(it, i)));
      setSelectedKeys(keys);
      if (onSelectionChange) onSelectionChange(Array.from(keys));
    } else {
      setSelectedKeys(new Set());
      if (onSelectionChange) onSelectionChange([]);
    }
  }, [allItems, getItemKey, onSelectionChange]);

  // Sincronizar selección inicial desde prop
  useEffect(() => {
    const validIds = Array.isArray(initialSelectedIds) ? initialSelectedIds : [];
    if (validIds.length > 0) {
      setSelectedKeys(new Set(validIds));
    }
  }, [initialSelectedIds]);

  // Totales para la selección
  const selectedTotals = useMemo(() => {
    if (selectedKeys.size === 0 || allItems.length === 0) return null;
    
    const items = allItems.filter((it, i) => selectedKeys.has(getItemKey(it, i)));
    
    // Validar que cada item sea válido antes de calcular
    const totalPackages = items.reduce((s, it) => {
      if (!it || typeof it !== 'object') return s;
      return s + (it.numberOfPackages || 0);
    }, 0);
    
    const totalAdded = items.reduce((s, it) => {
      if (!it || typeof it !== 'object') return s;
      return s + (Array.isArray(it.added) ? it.added.length : 0);
    }, 0);
    
    const totalNotFound = items.reduce((s, it) => {
      if (!it || typeof it !== 'object') return s;
      return s + (Array.isArray(it.notFound) ? it.notFound.length : 0);
    }, 0);
    
    return { totalPackages, totalAdded, totalNotFound };
  }, [allItems, selectedKeys, getItemKey]);

  const handleRefetch = useCallback(() => {
    if (!subsidiaryId) {
      console.log("[ConsolidateDetails] No subsidiaryId for refetch");
      return;
    }
    
    console.log("[ConsolidateDetails] Manually refetching for:", subsidiaryId);
    
    // Limpiar cache y forzar revalidación
    consolidatedCache.delete(subsidiaryId);
    hasFetchedRef.current = false;
    currentSubsidiaryIdRef.current = null;
    
    // Mutate para forzar re-fetch
    mutate();
  }, [subsidiaryId, mutate]);

  // Exponer el refetch interno al handler unificado de recarga.
  useEffect(() => {
    handleRefetchRef.current = handleRefetch;
  }, [handleRefetch]);

  // Barra de acciones: recargar + buscar por número de consolidado.
  const actionsBar = (
    <div className="flex flex-col gap-2 pb-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <Input
            value={consNumberInput}
            onChange={(e) => setConsNumberInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitConsNumberSearch(); } }}
            placeholder="Buscar consolidado por número..."
            className="h-8 pl-7 text-xs"
            disabled={!subsidiaryId || reloading || !onSearchConsNumber}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={submitConsNumberSearch}
          disabled={!subsidiaryId || reloading || !consNumberInput.trim() || !onSearchConsNumber}
        >
          Buscar
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2 text-xs gap-1"
          onClick={handleReload}
          disabled={!subsidiaryId || reloading}
          title="Recargar consolidados desde la base de datos"
        >
          {reloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Recargar
        </Button>
      </div>
    </div>
  );

  // SOLUCIÓN: Si no hay subsidiaryId, mostrar mensaje
  if (!subsidiaryId) {
    return (
      <div className="space-y-2 p-3 rounded-lg border bg-white shadow-sm">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <div className="rounded-full border p-1.5 bg-red-100 text-red-700 border-red-200">
              <IconTruckLoading className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-gray-900">Comparación Consolidado</span>
          </div>
        </div>
        <div className="text-center py-6 text-gray-500">
          <p className="text-sm">Selecciona una sucursal para ver los consolidados</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-2 p-3 rounded-lg border bg-white">
        <div className="flex items-center justify-between pb-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-6 w-6 rounded-md" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-2 rounded-md bg-gray-50">
            <Skeleton className="h-3 w-24" />
            <div className="flex gap-4">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-6 w-6 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2 p-3 rounded-lg border bg-white">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <div className="rounded-full border p-1.5 bg-red-100 text-red-700 border-red-200">
              <IconTruckLoading className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-gray-900">Comparación Consolidado</span>
          </div>
        </div>
        <div className="text-center py-4 text-red-600">
          <p className="text-sm">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={handleRefetch}
          >
             Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3 rounded-lg border bg-white shadow-sm">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <div className="rounded-full border p-1.5 bg-red-100 text-red-700 border-red-200">
            <IconTruckLoading className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium text-gray-900">Comparación Consolidado</span>
          <span className="text-xs text-gray-500">
            ({dataSource === 'database' ? 'Desde BD' : 'Desde props'})
          </span>
        </div>
      </div>

      {actionsBar}

      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id="select-all-consolidated"
            checked={selectedKeys.size === allItems.length && allItems.length > 0}
            onCheckedChange={(v) => selectAll(!!v)}
            disabled={allItems.length === 0}
          />
          <label htmlFor="select-all-consolidated" className="text-xs text-gray-600">
            Seleccionar todos
          </label>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{selectedKeys.size} seleccionados</span>
        </div>
      </div>
      
      {selectedTotals && (
        <div className="flex items-center justify-between py-2 text-sm text-gray-700 border-b">
          <div className="text-xs text-gray-500">Totales para seleccionados</div>
          <div className="flex gap-4">
            <div>Total: <strong className="ml-1">{selectedTotals.totalPackages}</strong></div>
            <div>Agregados: <strong className="ml-1">{selectedTotals.totalAdded}</strong></div>
            <div>Faltantes: <strong className="ml-1">{selectedTotals.totalNotFound}</strong></div>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {orderedItems.map((item, index) => {
          if (!item || typeof item !== 'object') return null;
          
          const IconComponent = typeIcons[item.type] || Truck;
          const colorClass = typeColors[item.type] || "bg-gray-100 text-gray-700 border-gray-200";
          const key = getItemKey(item, index);
          const checked = selectedKeys.has(key);
          const itemType = item.type || "Sin tipo";
          const consNumber = item.consNumber ?? item.cons_number ?? "-";
          
          return (
            <div
              key={key}
              className="flex items-center justify-between p-2 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Checkbox checked={checked} onCheckedChange={() => toggleKey(key)} />
                <div className={`p-1.5 rounded-full border ${colorClass}`}>
                  <IconComponent className="h-3 w-3" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-gray-900 truncate" title={itemType}>
                    {itemType}
                  </div>
                  <div className="text-xs text-muted-foreground truncate" title={consNumber}>
                    {consNumber}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 flex-1 justify-center">
                <div className="text-center min-w-[60px]">
                  <span className="text-xs text-gray-600 block">Total</span>
                  {selectedKeys.size === 0 || checked ? (
                    <span className="text-sm font-semibold text-gray-900">
                      {item.numberOfPackages || 0}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
                
                <div className="text-center min-w-[70px]">
                  <span className="text-xs text-gray-600 block">Agregados</span>
                  {selectedKeys.size === 0 || checked ? (
                    <span className={`text-sm font-semibold ${(item.added?.length || 0) > 0 ? "text-green-600" : "text-gray-500"}`}>
                      {item.added?.length || 0}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
                
                <div className="text-center min-w-[70px]">
                  <span className="text-xs text-gray-600 block">Faltantes</span>
                  {selectedKeys.size === 0 || checked ? (
                    <span className={`text-sm font-semibold ${(item.notFound?.length || 0) > 0 ? "text-red-600" : "text-gray-500"}`}>
                      {item.notFound?.length || 0}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <NotFoundShipmentDetails
                  shipments={item.notFound || []}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                      title={`Ver detalles de ${itemType}`}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  }
                />
              </div>
            </div>
          );
        })}
      </div>

      {allItems.length === 0 && !loading && (
        <div className="text-center py-3 text-gray-500">
          <div className="p-2 rounded-full bg-gray-100 inline-block mb-1">
            <Truck className="h-4 w-4 opacity-50" />
          </div>
          <p className="text-xs">No hay consolidados para mostrar</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={handleReload}
            disabled={reloading}
          >
            {reloading ? "Buscando..." : "Buscar consolidados"}
          </Button>
        </div>
      )}
    </div>
  );
}