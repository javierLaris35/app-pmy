'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField
} from '@/components/ui/form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { TicketFormFields } from './ticket-form-fields'
import { TicketPreview } from './ticket-preview'
import { Button } from '@/components/ui/button'

const ticketFormSchema = z.object({
  title: z.string().min(5, 'El título debe tener al menos 5 caracteres'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  category: z.enum(['mejora', 'cambio', 'eliminar', 'error']),
  section: z.string().min(1, 'Debes seleccionar una sección'),
  subsection: z.string().optional(),
  menu: z.string().optional(),
  submenu: z.string().optional(),
  replicationSteps: z.string().optional(),
  images: z.array(z.string()).optional(),
  priority: z.enum(['baja', 'media', 'alta', 'critica']),
  contact: z.string().email('Debes ingresar un email válido'),
  assignedTo: z.string().optional(),
})

export type TicketFormData = z.infer<typeof ticketFormSchema>

export function SupportTicketForm() {
  const [submittedTicket, setSubmittedTicket] = useState<TicketFormData | null>(null)
  const [imageCount, setImageCount] = useState(0)

  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'mejora',
      section: '',
      priority: 'media',
      contact: '',
      images: [],
      replicationSteps: '',
    },
  })

  const onSubmit = (data: TicketFormData) => {
    // Guardar en localStorage
    const existingTickets = JSON.parse(localStorage.getItem('support-tickets') || '[]')
    const newTicket = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: 'nuevo' as const,
      assignedTo: data.assignedTo || 'Sin asignar'
    }
    existingTickets.push(newTicket)
    localStorage.setItem('support-tickets', JSON.stringify(existingTickets))

    setSubmittedTicket(data)
    console.log('Ticket guardado:', newTicket)
  }

  const handleReset = () => {
    form.reset()
    setSubmittedTicket(null)
    setImageCount(0)
  }

  if (submittedTicket) {
    return (
      <TicketPreview ticket={submittedTicket} onNewTicket={handleReset} />
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Sistema de Tickets de Soporte</h1>
        <p className="text-muted-foreground mt-2">Completa el formulario para reportar un problema o solicitar una mejora</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo Ticket de Soporte</CardTitle>
          <CardDescription>Proporciona detalles sobre tu solicitud</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <TicketFormFields 
                form={form} 
                imageCount={imageCount}
                setImageCount={setImageCount}
              />

              <div className="flex gap-4 pt-6 border-t">
                <Button type="submit" className="flex-1">
                  Enviar Ticket
                </Button>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1"
                >
                  Limpiar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
