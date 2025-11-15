'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TicketFormData } from './support-ticket-form'
import { CheckCircle } from 'lucide-react'

interface TicketPreviewProps {
  ticket: TicketFormData
  onNewTicket: () => void
}

const CATEGORY_LABELS = {
  mejora: 'Mejora',
  cambio: 'Cambio',
  eliminar: 'Eliminar',
  error: 'Error del Sistema',
}

const PRIORITY_COLORS = {
  baja: 'bg-green-100 text-green-800',
  media: 'bg-yellow-100 text-yellow-800',
  alta: 'bg-red-100 text-red-800',
}

export function TicketPreview({ ticket, onNewTicket }: TicketPreviewProps) {
  const ticketNumber = Math.random().toString(36).substring(2, 10).toUpperCase()

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <div className="text-center space-y-3">
        <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
        <h1 className="text-3xl font-bold text-foreground">¡Ticket Enviado!</h1>
        <p className="text-muted-foreground">Tu solicitud ha sido registrada correctamente</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">#{ticketNumber}</CardTitle>
              <CardDescription>Número de seguimiento</CardDescription>
            </div>
            <Badge className={PRIORITY_COLORS[ticket.priority as keyof typeof PRIORITY_COLORS]}>
              {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-1">Categoría</h3>
              <p className="text-base">
                {CATEGORY_LABELS[ticket.category as keyof typeof CATEGORY_LABELS]}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-1">Título</h3>
              <p className="text-base">{ticket.title}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-1">Sección</h3>
              <p className="text-base">{ticket.section}</p>
            </div>
            {ticket.subsection && (
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-1">
                  Sub-sección
                </h3>
                <p className="text-base">{ticket.subsection}</p>
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">Descripción</h3>
            <p className="text-sm text-foreground whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {ticket.menu && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                Ubicación en el Sistema
              </h3>
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="font-medium">Menú:</span> {ticket.menu}
                </p>
                {ticket.submenu && (
                  <p className="text-sm">
                    <span className="font-medium">Sub-menú:</span> {ticket.submenu}
                  </p>
                )}
              </div>
            </div>
          )}

          {ticket.replicationSteps && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                Pasos para Replicar
              </h3>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {ticket.replicationSteps}
              </p>
            </div>
          )}

          {ticket.images && ticket.images.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                Imágenes Adjuntas
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {ticket.images.map((image, index) => (
                  <img
                    key={index}
                    src={image || "/placeholder.svg"}
                    alt={`Adjunto ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                ))}
              </div>
            </div>
          )}

          <div className="pt-6 border-t">
            <p className="text-xs text-muted-foreground mb-3">
              Confirmación enviada a: <span className="font-medium">{ticket.contact}</span>
            </p>
            <Button onClick={onNewTicket} className="w-full">
              Crear Nuevo Ticket
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
