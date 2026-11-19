import { PmySpinner, PmyLoader } from "@/components/ui/pmy-loader";
import { Eye, SearchIcon, Truck, Plane, RefreshCw} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconTruckLoading } from "@tabler/icons-react";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import useSWR from "swr";
import { getConsolidatedsToStartUnloading } from "@/lib/services/unloadings";
import { Consolidateds } from "@/lib/types";
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
  Terrestre: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
  Áereo: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300",
  "F2/Carga/31.5": "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300",
};

// Añadir cache en memoria para consolidados por sucursal
const consolidatedCache = new Map<string, Consolidateds>();

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
  const header = (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <IconTruckLoading className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium">Consolidados</span>
        {allItems.length > 0 && (
          <span className="text-xs text-muted-foreground">{selectedKeys.size} de {allItems.length}</span>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={handleReload}
        disabled={!subsidiaryId || reloading}
        aria-label="Recargar consolidados"
        title="Recargar consolidados"
      >
        {reloading ? <PmySpinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );

  const searchBar = (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={consNumberInput}
        onChange={(e) => setConsNumberInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitConsNumberSearch(); } }}
        placeholder="Agregar por número y Enter"
        className="h-8 pl-7 text-xs"
        disabled={!subsidiaryId || reloading || !onSearchConsNumber}
      />
    </div>
  );

  if (!subsidiaryId) {
    return (
      <div className="space-y-2 rounded-xl border bg-card p-3">
        {header}
        <p className="py-4 text-center text-sm text-muted-foreground">Elige una sucursal para ver los consolidados.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border bg-card">
        <PmyLoader size="sm" text="Cargando consolidados…" className="py-6" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2 rounded-xl border bg-card p-3">
        {header}
        <div className="py-3 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={handleRefetch}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border bg-card p-3">
      {header}
      {searchBar}

      {allItems.length > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <label className="flex items-center gap-2">
            <Checkbox
              checked={selectedKeys.size === allItems.length && allItems.length > 0}
              onCheckedChange={(v) => selectAll(!!v)}
            />
            Seleccionar todos
          </label>
          {selectedTotals && (
            <span className="tabular-nums">
              {selectedTotals.totalAdded}/{selectedTotals.totalPackages}
              {selectedTotals.totalNotFound > 0 && <span className="text-red-600"> · faltan {selectedTotals.totalNotFound}</span>}
            </span>
          )}
        </div>
      )}

      <div className="space-y-1">
        {orderedItems.map((item, index) => {
          if (!item || typeof item !== 'object') return null;

          const IconComponent = typeIcons[item.type] || Truck;
          const colorClass = typeColors[item.type] || "bg-muted text-muted-foreground border-border";
          const key = getItemKey(item, index);
          const checked = selectedKeys.has(key);
          const itemType = item.type || "Sin tipo";
          const consNumber = item.consNumber ?? item.cons_number ?? "-";
          const added = item.added?.length || 0;
          const missing = item.notFound?.length || 0;
          const total = Math.max(item.numberOfPackages || 0, added + missing);
          const pct = total > 0 ? Math.min(100, Math.round((added / total) * 100)) : 0;
          const done = total > 0 && missing === 0;

          return (
            <div
              key={key}
              className={`rounded-lg border px-2 py-1.5 transition-colors ${checked ? "border-primary/40 bg-primary/5" : "border-transparent hover:bg-muted/60"}`}
            >
              <div className="flex items-center gap-2">
                <Checkbox checked={checked} onCheckedChange={() => toggleKey(key)} aria-label={`Seleccionar ${itemType} ${consNumber}`} />
                <span className={`rounded-full border p-1 ${colorClass}`}>
                  <IconComponent className="h-3 w-3" />
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-xs font-medium" title={itemType}>{itemType}</div>
                  <div className="truncate font-mono text-[11px] text-muted-foreground" title={String(consNumber)}>{consNumber}</div>
                </div>
                <span className={`text-xs font-semibold tabular-nums ${done ? "text-green-600" : ""}`}>
                  {added}/{total}
                </span>
                <NotFoundShipmentDetails
                  shipments={item.notFound || []}
                  trigger={
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" title={`Ver faltantes de ${itemType}`}>
                      <Eye className="h-3 w-3" />
                    </Button>
                  }
                />
              </div>
              <div className="ml-6 mt-1 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className={`h-1 rounded-full ${done ? "bg-green-600" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
                </div>
                {missing > 0 && <span className="text-[11px] text-red-600 tabular-nums">faltan {missing}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {allItems.length === 0 && !loading && (
        <div className="py-3 text-center text-muted-foreground">
          <Truck className="mx-auto mb-1 h-4 w-4 opacity-50" />
          <p className="text-xs">No hay consolidados por desembarcar.</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={handleReload} disabled={reloading}>
            {reloading ? "Buscando…" : "Buscar consolidados"}
          </Button>
        </div>
      )}
    </div>
  );
}
