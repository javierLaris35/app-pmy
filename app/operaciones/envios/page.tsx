"use client"

import { useState, useCallback } from "react"
import { DataTable } from "@/components/data-table/data-table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Eye, FileText, Upload, Send } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { OperationHeader } from "@/components/shared/operation-header"
import { columns } from "./columns"
import { ShipmentTimeline } from "@/components/shipment-timeline"
import { Shipment, UserRoleEnum } from "@/lib/types"
import { AppLayout } from "@/components/app-layout"
import { useShipments } from "@/hooks/services/shipments/use-shipments"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsMobile } from "@/hooks/use-mobile"
import ShipmentFilters from "@/components/operaciones/envios/ShipmentFilters"
import { filters } from "./filters"
import KPIShipmentCards from "@/components/operaciones/envios/KpiCards"
import { NewShipmentDialog } from "@/components/modals/new-shipment-modal"
import { toast } from "@/lib/toast"
import { ShipmentWizardModal } from "@/components/modals/import-shipment-wizard"
import { withAuth } from "@/hoc/withAuth";
import { useAuthStore } from "@/store/auth.store"
import { SucursalSelector } from "@/components/sucursal-selector"
import { updateFromDHL, uploadShipmentFileDhl } from "@/lib/services/shipments"
import { ImportDhlTextModal, ParsedDhlShipment, FinalDhlSubmission } from "@/components/import-components/import-dhl-text-modal" // <-- Importamos FinalDhlSubmission

function ShipmentsPage() {
  const user = useAuthStore((s) => s.user)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [selectedSubsidiaryId, setSelectedSubsidiaryId] = useState<string | null>(null)

  // DHL MODALS (Limpiamos los estados viejos que ya no se usan)
  const [isDhlTextModalOpen, setIsDhlTextModalOpen] = useState(false)

  // ✅ Determinamos la sucursal actual
  const effectiveSubsidiaryId = selectedSubsidiaryId || user?.subsidiary?.id

  const { shipments, isLoading } = useShipments(effectiveSubsidiaryId)
  const isMobile = useIsMobile()

  const handleViewTimeline = useCallback((shipment: Shipment) => {
    setSelectedShipment(shipment)
  }, [])

  // Handler para el texto plano de DHL (Paso 1 del Wizard)
  const handleProcessDhlText = async (text: string): Promise<ParsedDhlShipment[]> => {
    try {
      // IMPORTANTE: Asegúrate de que uploadShipmentFileDhl retorne el arreglo JSON
      const responseData = await uploadShipmentFileDhl(text, (progress) => {
        console.log(`Enviando texto: ${progress}%`);
      });
      
      return responseData; // Retornamos el array para que el modal lo dibuje en el Paso 2
    } catch (error) {
      console.error("Error procesando texto plano:", error);
      toast.error("Hubo un error al procesar el texto.");
      throw error;
    }
  }

  // Handler para el guardado final (Paso 3 del Wizard)
  const handleFinalSaveDhl = async (data: FinalDhlSubmission) => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('subsidiaryId', data.subsidiaryId);
    
    // Pasamos el string de la fecha tal cual (ej. "2026-04-29")
    if (data.consDate) {
      formData.append('consDate', data.consDate);
    }
    
    // Pasamos el número de consolidado si existe
    if (data.consNumber && data.consNumber.trim() !== '') {
      formData.append('consNumber', data.consNumber.trim());
    }

    try {
      await updateFromDHL(formData, (progress) => {
        console.log(`Subiendo archivo final: ${progress}%`);
      });    
      
      toast.success("Envíos importados correctamente en la base de datos.");
    } catch (error) {
      console.error("Error al guardar en BD:", error);
      toast.error("Error al importar los datos.");
      throw error;
    }
  }

  const handleUploadSuccess = () => {
    toast("La importación de los envíos se realizó correctamente.")
  }

  const updatedColumns = columns.map((col) =>
    col.id === "actions"
      ? {
          ...col,
          cell: ({ row }) => (
            <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => handleViewTimeline(row.original)}>
              <span className="sr-only">Ver timeline</span>
              <Eye className="h-4 w-4" />
            </Button>
          ),
        }
      : col,
  )

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header único + acciones */}
        <OperationHeader
          icon={Send}
          title="Envíos"
          description="Administra los paquetes a enviar de las diferentes empresas (FedEx & DHL)"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {(user?.role === UserRoleEnum.ADMIN || user?.role === UserRoleEnum.SUPERADMIN) && (
                <div className="w-full sm:w-[220px]">
                  <SucursalSelector
                    value={effectiveSubsidiaryId}
                    onValueChange={setSelectedSubsidiaryId}
                  />
                </div>
              )}

              <NewShipmentDialog />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="outline" onClick={() => setIsUploadModalOpen(true)} aria-label="Importar FedEx">
                    <Upload className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Importar FedEx</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="outline" onClick={() => setIsDhlTextModalOpen(true)} aria-label="Importar DHL">
                    <FileText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Importar DHL</TooltipContent>
              </Tooltip>
            </div>
          }
        />

        {/* Modales (se renderizan en portal; van fuera del header) */}
        <ShipmentWizardModal
          open={isUploadModalOpen}
          onOpenChange={setIsUploadModalOpen}
          onUploadSuccess={handleUploadSuccess}
        />
        <ImportDhlTextModal
          isOpen={isDhlTextModalOpen}
          onOpenChange={setIsDhlTextModalOpen}
          onProcessText={handleProcessDhlText}
          onFinalSave={handleFinalSaveDhl}
          defaultSubsidiaryId={effectiveSubsidiaryId || ""}
        />

        {/* KPI's */}
        {isLoading ? (
          <div className="flex flex-row space-x-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-[110px] w-[250px] rounded-md" />
            ))}
          </div>
        ) : (
          <KPIShipmentCards date={new Date().toDateString()} />
        )}

        {/* Tabla de envíos */}
        {isLoading ? (
          isMobile ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="p-4 flex justify-between items-center">
                <Skeleton className="h-8 w-64 rounded-md" />
                <Skeleton className="h-8 w-32 rounded-md" />
              </div>
              <div className="space-y-2 p-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
              <div className="p-4 flex justify-between items-center">
                <Skeleton className="h-8 w-32 rounded-md" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              </div>
            </div>
          )
        ) : isMobile ? (
          <ShipmentFilters shipments={shipments || []} />
        ) : (
          <DataTable
            columns={updatedColumns}
            data={shipments || []}
            searchKey="trackingNumber"
            filters={filters}
          />
        )}

        {/* Timeline */}
        {selectedShipment && (
          <Dialog open={!!selectedShipment} onOpenChange={() => setSelectedShipment(null)}>
            <DialogContent className="sm:max-w-[600px] bg-white rounded-lg">
              <DialogHeader>
                <DialogTitle>Seguimiento de Envío</DialogTitle>
              </DialogHeader>
              <ShipmentTimeline shipment={selectedShipment} />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  )
}

export default withAuth(ShipmentsPage, 'operaciones.envios')