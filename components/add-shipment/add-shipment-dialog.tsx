"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Plus, Package, FileText, User, DollarSign, AlertCircle } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"

type ShipmentFormType = "shipment" | "chargeshipment"

// Enums basados en las entidades
const ShipmentType = {
  FEDEX: "FEDEX",
  DHL: "DHL",
}

const Priority = {
  BAJA: "BAJA",
  MEDIA: "MEDIA",
  ALTA: "ALTA",
  URGENTE: "URGENTE",
}

const ShipmentStatusType = {
  PENDIENTE: "PENDIENTE",
  EN_TRANSITO: "EN_TRANSITO",
  ENTREGADO: "ENTREGADO",
  CANCELADO: "CANCELADO",
}

interface ShipmentFormData {
  trackingNumber: string
  shipmentType: string
  recipientName: string
  recipientAddress: string
  recipientCity: string
  recipientZip: string
  recipientPhone: string
  commitDateTime: string
  priority: string
  status: string
  consNumber: string
  consolidatedId: string
  isHighValue: boolean
  exceptionCode?: string // Solo para ChargeShipment
}

export function AddShipmentDialog() {
  const [open, setOpen] = useState(false)
  const [formType, setFormType] = useState<ShipmentFormType>("shipment")
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<ShipmentFormData>({
    trackingNumber: "",
    shipmentType: ShipmentType.FEDEX,
    recipientName: "",
    recipientAddress: "",
    recipientCity: "",
    recipientZip: "",
    recipientPhone: "",
    commitDateTime: "",
    priority: Priority.MEDIA,
    status: ShipmentStatusType.EN_TRANSITO,
    consNumber: "",
    consolidatedId: "",
    isHighValue: false,
    exceptionCode: "",
  })

  // Keyboard shortcut to open (Ctrl/Cmd + Shift + N)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "n" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        trackingNumber: "",
        shipmentType: ShipmentType.FEDEX,
        recipientName: "",
        recipientAddress: "",
        recipientCity: "",
        recipientZip: "",
        recipientPhone: "",
        commitDateTime: "",
        priority: Priority.MEDIA,
        status: ShipmentStatusType.EN_TRANSITO,
        consNumber: "",
        consolidatedId: "",
        isHighValue: false,
        exceptionCode: "",
      })
      setFormType("shipment")
    }
  }, [open])

  useEffect(() => {
    if (formData.commitDateTime) {
      const commitDate = new Date(formData.commitDateTime)
      const today = new Date()
      const diffTime = commitDate.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      let calculatedPriority = Priority.MEDIA

      if (diffDays <= 1) {
        calculatedPriority = Priority.URGENTE
      } else if (diffDays <= 3) {
        calculatedPriority = Priority.ALTA
      } else if (diffDays <= 7) {
        calculatedPriority = Priority.MEDIA
      } else {
        calculatedPriority = Priority.BAJA
      }

      setFormData((prev) => ({ ...prev, priority: calculatedPriority }))
    }
  }, [formData.commitDateTime])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Aquí debes reemplazar con tu llamada API real
      const endpoint = formType === "shipment" ? "/api/shipments" : "/api/charge-shipments"

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        console.log(`${formType} created successfully`)
        setOpen(false)
        // Aquí puedes agregar una notificación de éxito
      } else {
        console.error("Error creating shipment")
        // Aquí puedes agregar una notificación de error
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (field: keyof ShipmentFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-110 hover:shadow-xl"
        aria-label="Agregar envío"
      >
        <Plus className="h-6 w-6" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Envío</DialogTitle>
            <DialogDescription>Completa el formulario para crear un nuevo shipment o charge shipment</DialogDescription>
          </DialogHeader>

          <Tabs value={formType} onValueChange={(value) => setFormType(value as ShipmentFormType)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="shipment" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Shipment
              </TabsTrigger>
              <TabsTrigger value="chargeshipment" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Charge Shipment
              </TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              {/* Información Básica */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Información Básica
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="trackingNumber">Número de Tracking *</Label>
                    <Input
                      id="trackingNumber"
                      value={formData.trackingNumber}
                      onChange={(e) => updateFormData("trackingNumber", e.target.value)}
                      placeholder="Ej: 1234567890"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shipmentType">Tipo de Envío *</Label>
                    <Select
                      value={formData.shipmentType}
                      onValueChange={(value) => updateFormData("shipmentType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ShipmentType).map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Prioridad *</Label>
                    <Select value={formData.priority} onValueChange={(value) => updateFormData("priority", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(Priority).map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {priority}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Estado *</Label>
                    <Select value={formData.status} onValueChange={(value) => updateFormData("status", value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ShipmentStatusType).map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="commitDateTime">Fecha y Hora de Compromiso *</Label>
                  <Input
                    id="commitDateTime"
                    type="datetime-local"
                    value={formData.commitDateTime}
                    onChange={(e) => updateFormData("commitDateTime", e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Información del Destinatario */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Información del Destinatario
                </h3>

                <div className="space-y-2">
                  <Label htmlFor="recipientName">Nombre Completo *</Label>
                  <Input
                    id="recipientName"
                    value={formData.recipientName}
                    onChange={(e) => updateFormData("recipientName", e.target.value)}
                    placeholder="Nombre del destinatario"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipientAddress">Dirección *</Label>
                  <Input
                    id="recipientAddress"
                    value={formData.recipientAddress}
                    onChange={(e) => updateFormData("recipientAddress", e.target.value)}
                    placeholder="Calle, número, colonia"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recipientCity">Ciudad *</Label>
                    <Input
                      id="recipientCity"
                      value={formData.recipientCity}
                      onChange={(e) => updateFormData("recipientCity", e.target.value)}
                      placeholder="Ciudad"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recipientZip">Código Postal *</Label>
                    <Input
                      id="recipientZip"
                      value={formData.recipientZip}
                      onChange={(e) => updateFormData("recipientZip", e.target.value)}
                      placeholder="12345"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipientPhone">Teléfono *</Label>
                  <Input
                    id="recipientPhone"
                    type="tel"
                    value={formData.recipientPhone}
                    onChange={(e) => updateFormData("recipientPhone", e.target.value)}
                    placeholder="+52 123 456 7890"
                    required
                  />
                </div>
              </div>

              {/* Información Adicional */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Información Adicional
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="consNumber">Número de Consolidado</Label>
                    <Input
                      id="consNumber"
                      value={formData.consNumber}
                      onChange={(e) => updateFormData("consNumber", e.target.value)}
                      placeholder="Opcional"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="consolidatedId">ID de Consolidado</Label>
                    <Input
                      id="consolidatedId"
                      value={formData.consolidatedId}
                      onChange={(e) => updateFormData("consolidatedId", e.target.value)}
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                {formType === "chargeshipment" && (
                  <div className="space-y-2">
                    <Label htmlFor="exceptionCode">Código de Excepción</Label>
                    <Input
                      id="exceptionCode"
                      value={formData.exceptionCode}
                      onChange={(e) => updateFormData("exceptionCode", e.target.value)}
                      placeholder="Código de excepción (opcional)"
                    />
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isHighValue"
                    checked={formData.isHighValue}
                    onCheckedChange={(checked) => updateFormData("isHighValue", checked as boolean)}
                  />
                  <Label htmlFor="isHighValue" className="font-normal cursor-pointer">
                    Paquete de alto valor
                  </Label>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Guardando..." : `Crear ${formType === "shipment" ? "Shipment" : "Charge Shipment"}`}
                </Button>
              </div>
            </form>
          </Tabs>

          {/* Footer con atajos */}
          <div className="border-t pt-3 text-sm text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              Los campos marcados con * son obligatorios
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-muted border rounded text-xs">
                {typeof navigator !== "undefined" && navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl"}
                +Shift+N
              </kbd>
              Toggle
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
