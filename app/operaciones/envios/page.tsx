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
import { Eye, Upload } from "lucide-react"
import { columns } from "./columns"
import { ShipmentTimeline } from "@/components/shipment-timeline"
import { DhlImportData, Shipment, UserRoleEnum } from "@/lib/types"
import { AppLayout } from "@/components/app-layout"
import { useShipments } from "@/hooks/services/shipments/use-shipments"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsMobile } from "@/hooks/use-mobile"
import ShipmentFilters from "@/components/operaciones/envios/ShipmentFilters"
import { filters } from "./filters"
import KPIShipmentCards from "@/components/operaciones/envios/KpiCards"
import { NewShipmentDialog } from "@/components/modals/new-shipment-modal"
import { toast } from "sonner"
import { ShipmentWizardModal } from "@/components/modals/import-shipment-wizard"
import { withAuth } from "@/hoc/withAuth";
import { useAuthStore } from "@/store/auth.store"
import { SucursalSelector } from "@/components/sucursal-selector"
import { updateFromDHL } from "@/lib/services/shipments"
import { ImportDHLModal } from "@/components/import-components/import-dhl-modal"
import { format, toZonedTime } from 'date-fns-tz';

function ShipmentsPage() {
  const user = useAuthStore((s) => s.user)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null)
  const [selectedSubsidiaryId, setSelectedSubsidiaryId] = useState<string | null>(null)
  const [importFile, setImportFile] = useState<File | null>(null);
  const [consDate, setConsDate] = useState<Date | string | null>(null);
  const [isDhlModalOpen, setIsDhlModalOpen] = useState(false)

  // ✅ Determinamos la sucursal actual
  const effectiveSubsidiaryId = selectedSubsidiaryId || user?.subsidiary?.id

  const { shipments, isLoading } = useShipments(effectiveSubsidiaryId)
  const isMobile = useIsMobile()

  const handleViewTimeline = useCallback((shipment: Shipment) => {
    setSelectedShipment(shipment)
  }, [])

  const handleUpdateFromDHL = async (data: DhlImportData) => {
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
        console.log(`Subiendo archivo: ${progress}%`);
      });
      // Aquí puedes agregar tu alerta de éxito o refrescar la tabla
    } catch (error) {
      console.error(error);
      // Aquí puedes agregar tu alerta de error
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
        {/* Header + acciones */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Título y subtítulo */}
          <div>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-5 w-80" />
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold tracking-tight">Envios</h2>
                <p className="text-muted-foreground">
                  Administra las paquetes a enviar de las diferentes empresas (Fedex & DHL)
                </p>
              </>
            )}
          </div>

          {/* Botones y selector de sucursal */}
          <div className="flex flex-col sm:flex-row gap-2 items-center">
            {(user?.role === UserRoleEnum.ADMIN || user?.role === UserRoleEnum.SUPERADMIN) && (
              <div>
                <SucursalSelector
                  value={selectedSubsidiaryId}
                  onValueChange={setSelectedSubsidiaryId}
                />
              </div>
            )}

            <NewShipmentDialog />

            <Button onClick={() => setIsUploadModalOpen(true)}>
              <Upload className="h-4 w-4" />
              Importar Envíos Fedex
            </Button>

            <Button onClick={() => setIsDhlModalOpen(true)}>
              <Upload className="h-4 w-4" />
              Importar Envíos DHL
            </Button>

            <ShipmentWizardModal
              open={isUploadModalOpen}
              onOpenChange={setIsUploadModalOpen}
              onUploadSuccess={handleUploadSuccess}
            />

            <ImportDHLModal
              isOpen={isDhlModalOpen}
              onOpenChange={setIsDhlModalOpen}
              onSubmit={handleUpdateFromDHL}
            />
          </div>
        </div>

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