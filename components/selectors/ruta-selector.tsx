"use client"

import { useState, useEffect, useRef } from "react"
import { Check, ChevronsUpDown, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { useAuthStore } from "@/store/auth.store"
import { getRoutesBySucursalId } from "@/lib/services/routes"
import { Route } from "@/lib/types"

interface RutaSelectorProps {
  selectedRutas: Route[]
  onSelectionChange: (rutas: Route[]) => void
  disabled?: boolean
  subsidiaryId?: string | null,
  isInsideModal?: boolean
}

export function RutaSelector({ 
  selectedRutas = [], 
  onSelectionChange, 
  disabled = false,
  subsidiaryId,
  isInsideModal = false
}: RutaSelectorProps) {
  const [open, setOpen] = useState(false)
  const [rutas, setRutas] = useState<Route[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const user = useAuthStore((s) => s.user)
  
  // Para evitar ciclos infinitos
  const prevSubsidiaryIdRef = useRef<string | null>(null)

  // Usar la subsidiaryId de la prop o la del usuario
  const effectiveSubsidiaryId = subsidiaryId || user?.subsidiary?.id || null

  useEffect(() => {
    if (!effectiveSubsidiaryId) {
      setRutas([]);
      return;
    }

    const fetchRoutes = async () => {
      try {
        setIsLoading(true);
        const routes = await getRoutesBySucursalId(effectiveSubsidiaryId);
        setRutas(routes);
        
        // Solo limpiar selecciones si cambió la sucursal (no en la carga inicial)
        if (prevSubsidiaryIdRef.current !== null && 
            prevSubsidiaryIdRef.current !== effectiveSubsidiaryId && 
            selectedRutas.length > 0) {
          
          // Verificar si las rutas seleccionadas pertenecen a esta sucursal
          const validSelections = selectedRutas.filter(selected => 
            routes.some(r => r.id === selected.id)
          );
          
          if (validSelections.length !== selectedRutas.length) {
            onSelectionChange(validSelections);
          }
        }
        
        // Actualizar la referencia
        prevSubsidiaryIdRef.current = effectiveSubsidiaryId;
        
      } catch (error) {
        console.error("[RutaSelector] Error fetching routes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoutes();
  }, [effectiveSubsidiaryId]);

  const handleSelect = (rutaId: string) => {
    const ruta = rutas.find((r) => r.id === rutaId);

    if (!ruta) {
      return;
    }

    const isSelected = selectedRutas.some((r) => r.id === rutaId);
    const newSelection = isSelected
      ? selectedRutas.filter((r) => r.id !== rutaId)
      : [...selectedRutas, ruta];

    onSelectionChange(newSelection);
  };

  const getSelectedNames = () => {
    return selectedRutas
      .filter(selected => rutas.some(r => r.id === selected.id)) // Solo rutas que existen en la lista actual
      .map(selected => selected.name);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen} modal={isInsideModal}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between bg-transparent"
            disabled={disabled || isLoading || !effectiveSubsidiaryId}
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {!effectiveSubsidiaryId
                ? "Selecciona una sucursal primero"
                : selectedRutas.length === 0 
                ? "Seleccionar rutas..." 
                : `${selectedRutas.length} ruta(s) seleccionada(s)`}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput placeholder="Buscar ruta..." />
            {/* ✅ CORRECCIÓN AQUÍ: El max-h va en el CommandList, SIN overflow-y-auto manual */}
            <CommandList className="max-h-64">
              <CommandEmpty>
                {!effectiveSubsidiaryId 
                  ? "Selecciona una sucursal primero" 
                  : isLoading
                  ? "Cargando rutas..."
                  : "No se encontraron rutas."}
              </CommandEmpty>
              {/* ✅ CORRECCIÓN AQUÍ: CommandGroup totalmente limpio */}
              <CommandGroup>
                {rutas.map((ruta) => (
                  <CommandItem 
                    key={ruta.id} 
                    value={ruta.name} 
                    onSelect={() => handleSelect(ruta.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4", 
                        selectedRutas.some(r => r.id === ruta.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{ruta.name}</span>
                      {ruta.code && (
                        <span className="text-sm text-muted-foreground">
                          {ruta.code}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedRutas.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {getSelectedNames().map((name, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}