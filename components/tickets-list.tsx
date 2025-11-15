'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TicketFormData } from './support-ticket-form'
import { Search, X, User, Calendar, Tag } from 'lucide-react'

interface SavedTicket extends TicketFormData {
  id: string
  createdAt: string
  status: 'nuevo' | 'backlog' | 'en_progreso' | 'en_revision' | 'en_pruebas' | 'cerrado' | 'bloqueado'
  assignedTo?: string
}

const categoryLabels = {
  mejora: 'Mejora',
  cambio: 'Cambio',
  eliminar: 'Eliminar',
  error: 'Error del Sistema',
}

const priorityColors = {
  baja: 'bg-green-100 text-green-800 border-green-200',
  media: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  alta: 'bg-orange-100 text-orange-800 border-orange-200',
  critica: 'bg-red-100 text-red-800 border-red-200',
}

const statusColors = {
  nuevo: 'bg-blue-100 text-blue-800 border-blue-200',
  backlog: 'bg-gray-100 text-gray-800 border-gray-200',
  en_progreso: 'bg-purple-100 text-purple-800 border-purple-200',
  en_revision: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  en_pruebas: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  cerrado: 'bg-green-100 text-green-800 border-green-200',
  bloqueado: 'bg-red-100 text-red-800 border-red-200',
}

const statusLabels = {
  nuevo: 'Nuevo',
  backlog: 'Backlog',
  en_progreso: 'En Progreso',
  en_revision: 'En Revisión',
  en_pruebas: 'En Pruebas',
  cerrado: 'Cerrado',
  bloqueado: 'Bloqueado',
}

export function TicketsList() {
  const [tickets, setTickets] = useState<SavedTicket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<SavedTicket | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
  const [newAssignee, setNewAssignee] = useState('')

  useEffect(() => {
    loadTickets()
  }, [])

  useEffect(() => {
    if (tickets.length > 0 && !selectedTicket) {
      setSelectedTicket(tickets[0])
    }
  }, [tickets])

  const loadTickets = () => {
    const savedTickets = JSON.parse(localStorage.getItem('support-tickets') || '[]')
    setTickets(savedTickets.reverse())
  }

  const updateTicket = (ticketId: string, updates: Partial<SavedTicket>) => {
    const allTickets = JSON.parse(localStorage.getItem('support-tickets') || '[]')
    const updatedTickets = allTickets.map((ticket: SavedTicket) =>
      ticket.id === ticketId ? { ...ticket, ...updates } : ticket
    )
    localStorage.setItem('support-tickets', JSON.stringify(updatedTickets))
    loadTickets()
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket({ ...selectedTicket, ...updates })
    }
  }

  const deleteTicket = (ticketId: string) => {
    const updatedTickets = tickets.filter(ticket => ticket.id !== ticketId)
    localStorage.setItem('support-tickets', JSON.stringify(updatedTickets.reverse()))
    loadTickets()
    setSelectedTicket(null)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Get unique assignees for filter
  const uniqueAssignees = Array.from(
    new Set(tickets.map(t => t.assignedTo || 'Sin asignar').filter(Boolean))
  )

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch =
      ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.includes(searchQuery)

    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus
    const matchesAssignee = filterAssignee === 'all' || (ticket.assignedTo || 'Sin asignar') === filterAssignee

    return matchesSearch && matchesStatus && matchesAssignee
  })

  if (tickets.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold mb-2">No hay tickets todavía</h3>
            <p className="text-muted-foreground text-center">
              Crea tu primer ticket para empezar a hacer seguimiento de tus solicitudes
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar - Lista de tickets */}
      <div className="w-96 border-r bg-muted/20 flex flex-col">
        {/* Header con búsqueda */}
        <div className="p-4 border-b bg-background space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Tickets</h2>
            <Badge variant="secondary">{filteredTickets.length}</Badge>
          </div>

          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Filtros */}
          <div className="space-y-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="nuevo">Nuevo</SelectItem>
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="en_progreso">En Progreso</SelectItem>
                <SelectItem value="en_revision">En Revisión</SelectItem>
                <SelectItem value="en_pruebas">En Pruebas</SelectItem>
                <SelectItem value="cerrado">Cerrado</SelectItem>
                <SelectItem value="bloqueado">Bloqueado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Filtrar por asignado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {uniqueAssignees.map(assignee => (
                  <SelectItem key={assignee} value={assignee}>
                    {assignee}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lista de tickets */}
        <div className="flex-1 overflow-y-auto">
          {filteredTickets.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No se encontraron tickets
            </div>
          ) : (
            filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                  selectedTicket?.id === ticket.id ? 'bg-muted border-l-4 border-l-primary' : ''
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-sm line-clamp-2 flex-1">
                      {ticket.title}
                    </h3>
                    <Badge className={`${priorityColors[ticket.priority]} text-xs shrink-0`}>
                      {ticket.priority}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge className={`${statusColors[ticket.status]} text-xs`}>
                      {statusLabels[ticket.status]}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {categoryLabels[ticket.category]}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {ticket.assignedTo || 'Sin asignar'}
                    </span>
                    <span>#{ticket.id.slice(-6)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detalle del ticket */}
      <div className="flex-1 overflow-y-auto">
        {selectedTicket ? (
          <div className="p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    #{selectedTicket.id.slice(-6)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {categoryLabels[selectedTicket.category]}
                  </Badge>
                </div>
                <h1 className="text-3xl font-bold">{selectedTicket.title}</h1>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteTicket(selectedTicket.id)}
              >
                Eliminar
              </Button>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-1 text-xs">
                    <Tag className="h-3 w-3" />
                    Estado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select
                    value={selectedTicket.status}
                    onValueChange={(value) => updateTicket(selectedTicket.id, {
                      status: value as SavedTicket['status']
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nuevo">🆕 Nuevo</SelectItem>
                      <SelectItem value="backlog">📋 Backlog</SelectItem>
                      <SelectItem value="en_progreso">🚧 En Progreso</SelectItem>
                      <SelectItem value="en_revision">👀 En Revisión</SelectItem>
                      <SelectItem value="en_pruebas">🧪 En Pruebas</SelectItem>
                      <SelectItem value="cerrado">✅ Cerrado</SelectItem>
                      <SelectItem value="bloqueado">🚫 Bloqueado</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-1 text-xs">
                    <User className="h-3 w-3" />
                    Asignado a
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Input
                      placeholder={selectedTicket.assignedTo || 'Sin asignar'}
                      value={newAssignee}
                      onChange={(e) => setNewAssignee(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newAssignee.trim()) {
                          updateTicket(selectedTicket.id, { assignedTo: newAssignee.trim() })
                          setNewAssignee('')
                        }
                      }}
                    />
                    {newAssignee && (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          updateTicket(selectedTicket.id, { assignedTo: newAssignee.trim() })
                          setNewAssignee('')
                        }}
                      >
                        Asignar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardDescription className="flex items-center gap-1 text-xs">
                    <Calendar className="h-3 w-3" />
                    Creado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{formatDate(selectedTicket.createdAt)}</p>
                  <Badge className={`${priorityColors[selectedTicket.priority]} text-xs mt-2`}>
                    Prioridad: {selectedTicket.priority}
                  </Badge>
                </CardContent>
              </Card>
            </div>

            {/* Descripción */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Descripción</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {selectedTicket.description}
                </p>
              </CardContent>
            </Card>

            {/* Información adicional */}
            {(selectedTicket.section || selectedTicket.menu) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ubicación en el Sistema</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedTicket.section && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Sección</Label>
                      <p className="text-sm mt-1">
                        {selectedTicket.section}
                        {selectedTicket.subsection && ` > ${selectedTicket.subsection}`}
                      </p>
                    </div>
                  )}
                  {selectedTicket.menu && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Menú</Label>
                      <p className="text-sm mt-1">
                        {selectedTicket.menu}
                        {selectedTicket.submenu && ` > ${selectedTicket.submenu}`}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Pasos para replicar */}
            {selectedTicket.replicationSteps && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Pasos para Replicar</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {selectedTicket.replicationSteps}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Imágenes */}
            {selectedTicket.images && selectedTicket.images.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Capturas de Pantalla ({selectedTicket.images.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedTicket.images.map((image, index) => (
                      <img
                        key={index}
                        src={image || "/placeholder.svg"}
                        alt={`Captura ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg border hover:scale-105 transition-transform cursor-pointer"
                        onClick={() => window.open(image, '_blank')}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contacto */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información de Contacto</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{selectedTicket.contact}</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Selecciona un ticket para ver los detalles</p>
          </div>
        )}
      </div>
    </div>
  )
}
