"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, File, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { uploadShipmentFile } from "@/lib/services/shipments"

interface CSVUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void,
  onUploadSuccess: () => void
}

export function CSVUploadModal({ open, onOpenChange, onUploadSuccess }: CSVUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    setError(null)

    if (selectedFile) {
      if (selectedFile.type !== "text/csv") {
        setError("Por favor seleccione un archivo CSV válido")
        return
      }
      setFile(selectedFile)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Por favor seleccione un archivo para subir")
      return
    }

    try {
      const newShipments = await uploadShipmentFile(file);
      
      console.log("🚀 ~ handleUpload ~ newShipments:", newShipments)

      onOpenChange(false)
      setFile(null)
      onUploadSuccess()
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (err) {
      setError("Error al subir el archivo. Por favor intente de nuevo.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Importar Envíos desde CSV</DialogTitle>
          <DialogDescription>Suba un archivo CSV con la información de los envíos.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="csv-file">Archivo CSV</Label>
            <Input id="csv-file" type="file" accept=".csv" ref={fileInputRef} onChange={handleFileChange} />
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
  )
}

