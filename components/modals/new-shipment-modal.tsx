import { useState } from "react"
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select"
import { Package, MapPin, Phone, DollarSign } from "lucide-react"

export function NewShipmentDialog() {
  const [open, setOpen] = useState(false)
  const [shipment, setShipment] = useState({
    recipientName: "",
    recipientAddress: "",
    recipientCity: "",
    recipientZip: "",
    recipientPhone: "",
    amount: "",
    shipmentType: "fedex",
    priority: "media",
    status: "recoleccion"
  })

  const handleChange = (field: string, value: string) => {
    setShipment((prev) => ({ ...prev, [field]: value }))
  }

  const handleCreateShipment = () => {
    console.log("Crear envío:", shipment)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-md">
          <Package className="mr-2 h-4 w-4" />
          Nuevo Envío
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[540px] bg-white rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">📦 Crear Nuevo Envío</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-2">
          {/* Datos del destinatario */}
          <div className="space-y-4 border-b pb-4">
            <h4 className="text-sm font-medium text-muted-foreground">Datos del Destinatario</h4>
            <div className="grid gap-2">
              <Label htmlFor="recipientName">Nombre</Label>
              <Input
                id="recipientName"
                value={shipment.recipientName}
                onChange={(e) => handleChange("recipientName", e.target.value)}
                placeholder="Nombre completo"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="recipientAddress">Dirección</Label>
              <Input
                id="recipientAddress"
                value={shipment.recipientAddress}
                onChange={(e) => handleChange("recipientAddress", e.target.value)}
                placeholder="Calle y número"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="recipientCity">Ciudad</Label>
                <Input
                  id="recipientCity"
                  value={shipment.recipientCity}
                  onChange={(e) => handleChange("recipientCity", e.target.value)}
                  placeholder="Ciudad"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="recipientZip">CP</Label>
                <Input
                  id="recipientZip"
                  value={shipment.recipientZip}
                  onChange={(e) => handleChange("recipientZip", e.target.value)}
                  placeholder="Código postal"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="recipientPhone">Teléfono</Label>
              <Input
                id="recipientPhone"
                type="tel"
                value={shipment.recipientPhone}
                onChange={(e) => handleChange("recipientPhone", e.target.value)}
                placeholder="Número telefónico"
              />
            </div>
          </div>

          {/* Información del envío */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Información del Envío</h4>

            <div className="grid gap-2">
              <Label htmlFor="amount">Monto</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={shipment.amount}
                onChange={(e) => handleChange("amount", e.target.value)}
                placeholder="$0.00"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="shipmentType">Tipo de Envío</Label>
              <Select
                value={shipment.shipmentType}
                onValueChange={(value) => handleChange("shipmentType", value)}
              >
                <SelectTrigger id="shipmentType">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fedex">FedEx</SelectItem>
                  <SelectItem value="dhl">DHL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="priority">Prioridad</Label>
              <Select
                value={shipment.priority}
                onValueChange={(value) => handleChange("priority", value)}
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Seleccionar prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" className="rounded-md">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="submit"
            className="bg-brand-brown hover:bg-brand-brown/90 text-white rounded-md"
            onClick={handleCreateShipment}
          >
            Crear Envío
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
