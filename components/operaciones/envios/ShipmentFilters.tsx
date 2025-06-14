import { useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Shipment } from "@/lib/types"
import { MobileShipmentCard } from "./MobileShipmentCard"

interface Props {
  shipments: Shipment[]
}

export default function ShipmentFilters({ shipments }: Props) {
  const [shipmentType, setShipmentType] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [priority, setPriority] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const filtered = shipments.filter((s) => {
    const matchesSearch = [
      s.recipientName,
      s.recipientAddress,
      s.recipientCity,
      s.trackingNumber,
    ].some((field) => field.toLowerCase().includes(search.toLowerCase()))

    return (
      (!shipmentType || s.shipmentType === shipmentType) &&
      (!status || s.status === status) &&
      (!priority || s.priority === priority) &&
      matchesSearch
    )
  })

  return (
    <div className="space-y-4 p-4">
      <Input
        placeholder="Buscar por nombre, dirección, ciudad o tracking"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="flex flex-wrap gap-4">
        <Select onValueChange={setShipmentType} value={shipmentType || undefined}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Tipo de envío" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fedex">FedEx</SelectItem>
            <SelectItem value="dhl">DHL</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={setStatus} value={status || undefined}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Estatus" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recoleccion">Recolección</SelectItem>
            <SelectItem value="en_ruta">En Ruta</SelectItem>
            <SelectItem value="entregado">Entregado</SelectItem>
            <SelectItem value="no_entregado">No Entregado</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={setPriority} value={priority || undefined}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Media</SelectItem>
            <SelectItem value="baja">Baja</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filtered.map((shipment) => (
          <MobileShipmentCard key={shipment.trackingNumber} shipment={shipment} />
        ))}
      </div>
    </div>
  )
}
