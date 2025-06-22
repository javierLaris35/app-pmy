"use client"

import { useState, useRef, useCallback } from "react"
import {
  Upload,
  File as FileIcon,
  AlertCircle,
  Loader2,
  ClipboardPaste,
  X
} from "lucide-react"
import {
  uploadShipmentFile,
  uploadShipmentFileDhl
} from "@/lib/services/shipments"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { SucursalSelector } from "@/components/sucursal-selector" // Asegúrate de tener esta ruta correcta

interface DualUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadSuccess: () => void
}

const ALLOWED_EXTENSIONS = ["csv", "xls", "xlsx"]
const MAX_FILE_SIZE_MB = 5
const ALLOWED_MIME_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
]

export function CSVUploadModal({
  open,
  onOpenChange,
  onUploadSuccess
}: DualUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [textInput, setTextInput] = useState("")
  const [selectedSucursalId, setSelectedSucursalId] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"file" | "text">("file")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    setError(null)

    if (!selectedFile) {
      setFile(null)
      return
    }

    const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase()
    const isValidExtension = fileExtension && ALLOWED_EXTENSIONS.includes(fileExtension)
    const isValidMimeType = ALLOWED_MIME_TYPES.includes(selectedFile.type)

    if (!isValidExtension || !isValidMimeType) {
      setError(`Formato no soportado. Use: ${ALLOWED_EXTENSIONS.join(", ")}`)
      setFile(null)
      return
    }

    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`El archivo no debe exceder ${MAX_FILE_SIZE_MB}MB`)
      setFile(null)
      return
    }

    setFile(selectedFile)
  }, [])

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextInput(e.target.value)
    setError(null)
  }, [])

  const resetForm = useCallback(() => {
    setFile(null)
    setTextInput("")
    setError(null)
    setSelectedSucursalId("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  const handleRemoveFile = useCallback(() => {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }, [])

  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open) resetForm()
    onOpenChange(open)
  }, [onOpenChange, resetForm])

  const handleUpload = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (!selectedSucursalId) {
        setError("Debe seleccionar una sucursal antes de subir los datos.")
        return
      }

      if (activeTab === "file" && file) {
        await uploadShipmentFile(file, selectedSucursalId)
      } else if (activeTab === "text" && textInput.trim()) {
        await uploadShipmentFileDhl(textInput, file) ///*, selectedSucursalId*/ aún no se ha implementado el ID de sucursal en esta función
      } else {
        setError(
          activeTab === "file"
            ? "Por favor seleccione un archivo"
            : "Por favor ingrese el texto con los envíos"
        )
        return
      }

      resetForm()
      onUploadSuccess()
      onOpenChange(false)
    } catch (err) {
      console.error("Error processing shipments:", err)
      setError(
        err instanceof Error
          ? err.message
          : "Error al procesar los envíos. Verifique el formato e intente nuevamente."
      )
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, file, textInput, selectedSucursalId, onUploadSuccess, onOpenChange, resetForm])

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Importar Envíos
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            <span>Importar Envíos</span>
          </DialogTitle>
          <DialogDescription>
            Seleccione el método para importar sus envíos.{" "}
            <strong>Debe seleccionar una sucursal</strong>.
          </DialogDescription>
        </DialogHeader>

        {/* Selector de Sucursal */}
        <div className="space-y-2">
          <Label htmlFor="sucursal">Sucursal destino</Label>
          <SucursalSelector
            value={selectedSucursalId}
            onValueChange={setSelectedSucursalId}
          />
        </div>

        {/* Tabs de subida */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "file" | "text")}
          className="mt-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file" className="gap-2">
              <FileIcon className="h-4 w-4" />
              Archivo
            </TabsTrigger>
            <TabsTrigger value="text" className="gap-2">
              <ClipboardPaste className="h-4 w-4" />
              Texto
            </TabsTrigger>
          </TabsList>

          {/* Subida por archivo */}
          <TabsContent value="file" className="mt-4 space-y-4">
            <Label htmlFor="csv-file">Seleccione su archivo</Label>
            <Input
              id="csv-file"
              type="file"
              accept={ALLOWED_EXTENSIONS.map(ext => `.${ext}`).join(",")}
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={isLoading}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Formatos: {ALLOWED_EXTENSIONS.join(", ")}</span>
              <span>Máx: {MAX_FILE_SIZE_MB}MB</span>
            </div>

            {file && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <FileIcon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleRemoveFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Subida por texto */}
          <TabsContent value="text" className="mt-4 space-y-4">
            <Label htmlFor="text-input">Ingrese el contenido del FD</Label>
            <Textarea
              id="text-input"
              placeholder={`Ejemplo:\nAWB : XXXXXXXXXX \nOrig  Dest  Shipment Time     Prod  Pcs  Kilos  Decl. Value    Description of Goods`}
              rows={6}
              value={textInput}
              onChange={handleTextChange}
              disabled={isLoading}
              className="resize-none font-mono text-sm"
            />
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Formato esperado:</p>
              <Badge variant="outline">
                AWB : XXXXXXXXXX Orig Dest Shipment Time Prod Pcs Kilos Decl. Value Description of Goods
              </Badge>
            </div>

            <Label htmlFor="extra-file">Archivo adjunto opcional</Label>
            <Input
              id="extra-file"
              type="file"
              accept={ALLOWED_EXTENSIONS.map(ext => `.${ext}`).join(",")}
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={isLoading}
              className="cursor-pointer"
            />
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleUpload}
            disabled={isLoading || !selectedSucursalId || (activeTab === "file" ? !file : !textInput.trim())}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Procesando...
              </>
            ) : (
              "Subir"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
