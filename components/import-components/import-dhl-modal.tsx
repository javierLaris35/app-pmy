"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/store/auth.store"
import { SucursalSelector } from "../sucursal-selector"
import { AlertCircle } from "lucide-react" // Ícono para los errores
import { toast } from "sonner" // O ajusta según la librería de toast que uses (ej. react-hot-toast)

export interface DhlImportData {
  file: File;
  subsidiaryId: string;
  consDate?: string;
  consNumber?: string;
}

// Interfaz para mapear los errores del backend
interface BackendError {
  message: string;
  missingColumns?: string[];
  errors?: string[];
}

interface ImportDHLModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  // Hacemos que onSubmit retorne una Promesa para poder esperarla
  onSubmit: (data: DhlImportData) => Promise<void>; 
}

export function ImportDHLModal({ isOpen, onOpenChange, onSubmit }: ImportDHLModalProps) {
  const user = useAuthStore((s) => s.user)

  const [file, setFile] = useState<File | null>(null);
  const [subsidiaryId, setSubsidiaryId] = useState<string>(""); 
  const [consDate, setConsDate] = useState<string>("");
  const [consNumber, setConsNumber] = useState<string>("");

  // Nuevos estados para manejar la carga y los errores
  const [isLoading, setIsLoading] = useState(false);
  const [backendError, setBackendError] = useState<BackendError | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (user?.subsidiary?.id) {
        setSubsidiaryId(user.subsidiary.id);
      }
      setBackendError(null); // Limpiamos errores al abrir
    } else {
      setFile(null);
      setConsDate("");
      setConsNumber("");
      setBackendError(null);
      setIsLoading(false);
    }
  }, [isOpen, user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setBackendError(null); // Limpiamos el error si el usuario cambia el archivo
    }
  };

  const handleSubmit = async () => {
    if (!file || !subsidiaryId) return;

    setIsLoading(true);
    setBackendError(null);

    try {
      // Esperamos a que la petición termine
      await onSubmit({
        file,
        subsidiaryId,
        consDate: consDate.trim() !== "" ? consDate : undefined,
        consNumber: consNumber.trim() !== "" ? consNumber : undefined,
      });

      // Si todo sale bien: mostramos el Toast y cerramos el modal
      toast.success("El archivo se importó correctamente.");
      onOpenChange(false);
      
    } catch (error: any) {
      console.error("Error completo:", error); // Útil para debugear

      // 1. Obtenemos el cuerpo de la respuesta de Axios
      const responseData = error.response?.data;
      
      // 2. Buscamos el payload real (puede estar directo en 'data' o anidado en 'data.response' según tu framework)
      const errorPayload = responseData?.response || responseData || {};

      // 3. Extraemos exactamente lo que necesitamos
      const errorMessage = errorPayload.message || error.message || "Hubo un error al procesar el archivo.";
      const missingColumns = errorPayload.missingColumns || [];
      const errorsList = errorPayload.errors || [];

      // 4. Actualizamos el estado para que el cuadro rojo pinte los detalles
      if (errorPayload) {
        setBackendError({
          message: errorMessage,
          missingColumns: missingColumns,
          errors: errorsList
        });
        
        // Lanzamos el toast con el mensaje descriptivo
        toast.error(errorMessage);
      } else {
        toast.error("Ocurrió un error inesperado al conectar con el servidor.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = file !== null && subsidiaryId !== "";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && onOpenChange(open)}>
      <DialogContent className="sm:max-w-[500px] bg-white rounded-lg">
        <DialogHeader>
          <DialogTitle>Importar Excel de DHL</DialogTitle>
          <DialogDescription>
            Sube el archivo Excel con los envíos de DHL y asigna los datos del consolidado.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          
          {/* =========================================
              🔴 SECCIÓN DE ERRORES DEL BACKEND 
              ========================================= */}
          {backendError && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 text-sm max-h-48 overflow-y-auto">
              <div className="flex items-center gap-2 font-semibold mb-2 text-red-900">
                <AlertCircle className="h-4 w-4" />
                {backendError.message}
              </div>
              
              {/* Si faltan columnas */}
              {backendError.missingColumns && backendError.missingColumns.length > 0 && (
                <div className="mt-2">
                  <span className="font-medium">Columnas faltantes: </span>
                  {backendError.missingColumns.join(", ")}
                </div>
              )}

              {/* Si hay errores en las filas */}
              {backendError.errors && backendError.errors.length > 0 && (
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  {backendError.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Archivo Excel */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="file-upload">Archivo Excel (*)</Label>
            <Input 
              id="file-upload" 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </div>

          {/* Sucursal (Subsidiary) */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="subsidiary">Sucursal (*)</Label>
            <SucursalSelector
              value={subsidiaryId}
              onValueChange={setSubsidiaryId}
              // Si tu selector acepta disabled: disabled={isLoading}
            />
          </div>

          {/* Fecha del Consolidado */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="cons-date">Fecha del Consolidado (Opcional)</Label>
            <Input 
              id="cons-date" 
              type="date" 
              value={consDate}
              onChange={(e) => setConsDate(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Número de Consolidado */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="cons-number">Número de Consolidado (Opcional)</Label>
            <Input 
              id="cons-number" 
              type="text" 
              placeholder="Ej. DHL-20260429"
              value={consNumber}
              onChange={(e) => setConsNumber(e.target.value)}
              disabled={isLoading}
            />
            <span className="text-xs text-gray-500">
              Si se deja en blanco, se generará uno automáticamente con la fecha de hoy.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isFormValid || isLoading}>
            {isLoading ? "Importando..." : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}