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


export interface DhlImportData {
  file: File;
  subsidiaryId: string;
  consDate?: string;
  consNumber?: string;
}

interface ImportDHLModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DhlImportData) => void;
  // Eliminamos 'subsidiaries' de aquí, ya que SucursalSelector se encarga de eso
}

export function ImportDHLModal({ isOpen, onOpenChange, onSubmit }: ImportDHLModalProps) {
  const user = useAuthStore((s) => s.user)

  const [file, setFile] = useState<File | null>(null);
  // Inicializamos vacío, pero lo llenaremos con useEffect
  const [subsidiaryId, setSubsidiaryId] = useState<string>(""); 
  const [consDate, setConsDate] = useState<string>("");
  const [consNumber, setConsNumber] = useState<string>("");

  // Efecto para pre-seleccionar la sucursal del usuario cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      if (user?.subsidiary?.id) {
        setSubsidiaryId(user.subsidiary.id);
      }
    } else {
      // Limpiamos el estado cuando se cierra el modal (opcional, pero buena práctica)
      setFile(null);
      setConsDate("");
      setConsNumber("");
      // La sucursal la dejamos como estaba o la reseteamos al default en el próximo open
    }
  }, [isOpen, user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = () => {
    if (!file || !subsidiaryId) return;

    onSubmit({
      file,
      subsidiaryId,
      consDate: consDate.trim() !== "" ? consDate : undefined,
      consNumber: consNumber.trim() !== "" ? consNumber : undefined,
    });

    onOpenChange(false);
  };

  const isFormValid = file !== null && subsidiaryId !== "";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white rounded-lg">
        <DialogHeader>
          <DialogTitle>Importar Excel de DHL</DialogTitle>
          <DialogDescription>
            Sube el archivo Excel con los envíos de DHL y asigna los datos del consolidado.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Archivo Excel */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="file-upload">Archivo Excel (*)</Label>
            <Input 
              id="file-upload" 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleFileChange} 
            />
          </div>

          {/* Sucursal (Subsidiary) con tu componente */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="subsidiary">Sucursal (*)</Label>
            <SucursalSelector
              value={subsidiaryId}
              onValueChange={setSubsidiaryId}
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
            />
            <span className="text-xs text-gray-500">
              Si se deja en blanco, se generará uno automáticamente con la fecha de hoy.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isFormValid}>
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}