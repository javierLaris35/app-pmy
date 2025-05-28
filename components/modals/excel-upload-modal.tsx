"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, File, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shipment } from "@/lib/types";
import { readCSVFile } from "@/utils/readCSVFile";
import { readExcelFile } from "@/utils/readExcelFile";


interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDataLoaded: (data: Shipment[]) => void;
}

export function ExcelUploadModal({ open, onOpenChange, onDataLoaded }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [shipments, setShipments] = useState<Shipment[]>([]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    setError(null);

    if (selectedFile) {
      const fileName = selectedFile.name.toLowerCase();
      const validExtensions = [".csv", ".xlsx", ".xls"];
      const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

      if (!isValid) {
        setError("Por favor seleccione un archivo válido (.csv, .xlsx, .xls)");
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Por favor seleccione un archivo para subir");
      return;
    }

    try {
      let parsedData: Shipment[];

      if (file.name.endsWith(".csv")) {
        parsedData = await readCSVFile(file);
      } else {
        parsedData = await readExcelFile(file);
      }

      setShipments(parsedData);
      onDataLoaded(parsedData);
      console.log("🚀 ~ handleUpload ~ parsedData:", parsedData)

      onOpenChange(false);
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError("Error al subir el archivo. Por favor intente de nuevo.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Importar Archivo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Importar Envíos</DialogTitle>
          <DialogDescription>Sube un archivo CSV o Excel con la información de los envíos.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="file-upload">Archivo</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".csv,.xlsx,.xls"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
          </div>
          {file && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <File className="h-4 w-4" />
              <span>{file.name}</span>
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpload} className="">
              Subir Archivo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}