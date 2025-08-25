import { Eye, SearchIcon, Truck, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconTruckLoading } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { getConsolidatedsToStartUnloading } from "@/lib/services/unloadings";
import { Consolidateds } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth.store";

interface ConsolidateDetailsProps {
  consolidatedData?: Consolidateds;
  refreshTrigger?: number;
  onDataLoaded?: (data: Consolidateds) => void;
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

export default function ConsolidateDetails({ 
  consolidatedData, 
  refreshTrigger = 0,
  onDataLoaded 
}: ConsolidateDetailsProps) {
  const user = useAuthStore((s) => s.user);
  const [consolidateds, setConsolidateds] = useState<Consolidateds>({
    airConsolidated: [],
    groundConsolidated: [],
    f2Consolidated: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'props' | 'database'>('database');

  // Función para cargar los datos desde la base de datos
  const fetchConsolidateds = async () => {
    if (!user?.subsidiary?.id) {
      setError("No se ha seleccionado una sucursal");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setDataSource('database');
      
      const response = await getConsolidatedsToStartUnloading(user.subsidiary.id);
      setConsolidateds(response);
      
      // Notificar al componente padre si se proporcionó el callback
      if (onDataLoaded) {
        onDataLoaded(response);
      }
    } catch (err) {
      console.error("Error fetching consolidateds:", err);
      setError("Error al cargar los datos de consolidados");
    } finally {
      setLoading(false);
    }
  };

  // Efecto para cargar datos automáticamente al iniciar
  useEffect(() => {
    // Solo hacer la consulta si no se proporcionaron datos por props
    if (!consolidatedData) {
      fetchConsolidateds();
    } else {
      // Si hay datos por props, usarlos directamente
      setConsolidateds(consolidatedData);
      setDataSource('props');
      setLoading(false);
    }
  }, [user?.subsidiary?.id]);

  // Efecto para manejar cambios en los datos proporcionados por props
  useEffect(() => {
    if (consolidatedData) {
      setConsolidateds(consolidatedData);
      setDataSource('props');
      setLoading(false);
      setError(null);
    }
  }, [consolidatedData]);

  // Efecto para manejar el refresh trigger (solo funciona cuando los datos vienen de la BD)
  useEffect(() => {
    if (refreshTrigger > 0 && dataSource === 'database') {
      fetchConsolidateds();
    }
  }, [refreshTrigger]);

  const allItems = Object.values(consolidateds).flat().filter(Boolean);

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
            onClick={fetchConsolidateds}
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3 rounded-lg border bg-white shadow-sm">
      {/* Header con indicador de fuente de datos */}
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
        
        {/* Mostrar botón de recarga solo cuando los datos vienen de la BD */}
        {dataSource === 'database' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            onClick={fetchConsolidateds}
            title="Recargar datos desde la base de datos"
          >
            <SearchIcon className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Lista compacta */}
      <div className="space-y-1">
        {allItems.map((item, index) => {
          const IconComponent = typeIcons[item.type] || Truck;
          const colorClass = typeColors[item.type] || "bg-gray-100 text-gray-700 border-gray-200";
          
          return (
            <div
              key={index}
              className="flex items-center justify-between p-2 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              {/* Tipo y icono */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={`p-1.5 rounded-full border ${colorClass}`}>
                  <IconComponent className="h-3 w-3" />
                </div>
                <span className="text-xs font-medium text-gray-900 truncate">
                  {item.type}
                </span>
              </div>

              {/* Estadísticas bien separadas */}
              <div className="flex items-center gap-4 flex-1 justify-center">
                <div className="text-center min-w-[60px]">
                  <span className="text-xs text-gray-600 block">Total</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {item.numberOfPackages}
                  </span>
                </div>
                
                <div className="text-center min-w-[70px]">
                  <span className="text-xs text-gray-600 block">Agregados</span>
                  <span className={`text-sm font-semibold ${
                    item.added.length > 0 ? "text-green-600" : "text-gray-500"
                  }`}>
                    {item.added.length || 0}
                  </span>
                </div>
                
                <div className="text-center min-w-[70px]">
                  <span className="text-xs text-gray-600 block">Faltantes</span>
                  <span className={`text-sm font-semibold ${
                    item.notFound.length > 0 ? "text-red-600" : "text-gray-500"
                  }`}>
                    {item.notFound.length || 0}
                  </span>
                </div>
              </div>

              {/* Solo el botón de eye */}
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                  title={`Ver detalles de ${item.type}`}
                >
                  <Eye className="h-3 w-3" />
                </Button>
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
          {dataSource === 'database' && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={fetchConsolidateds}
            >
              Buscar consolidados
            </Button>
          )}
        </div>
      )}
    </div>
  );
}