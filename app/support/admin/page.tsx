"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  Clock,
  FileEdit,
  Filter,
  MessageSquare,
  Sparkles,
  Trash2,
  User,
  XCircle,
  Search,
  Calendar,
  Tag,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  type Ticket,
  type TicketStatus,
  type TicketPriority,
  type TicketType,
  getTicketTypeColor,
  getTicketStatusColor,
  getTicketPriorityColor,
  getStatusLabel,
  getPriorityLabel,
} from "@/lib/types/support-ticket"
import { SupportTicketService } from "@/lib/services/support-ticket.service"

export default function SupportAdminPage() {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>("todos")
  const [filterType, setFilterType] = useState<string>("todos")
  const [searchTerm, setSearchTerm] = useState("")
  const [newComment, setNewComment] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [developers, setDevelopers] = useState<Array<{ id: number; nombre: string; email: string }>>([])
  const [tickets, setTickets] = useState<Ticket[]>([])

  // Cargar tickets al montar el componente
  useEffect(() => {
    loadTickets()
    loadDevelopers()
  }, [])

  const loadTickets = async () => {
    setIsLoading(true)
    try {
      const response = await SupportTicketService.getAllTickets()
      setTickets(response.tickets)
    } catch (error) {
      console.error("Error al cargar tickets:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadDevelopers = async () => {
    try {
      const devs = await SupportTicketService.getDevelopers()
      setDevelopers(devs)
    } catch (error) {
      console.error("Error al cargar desarrolladores:", error)
    }
  }

  const handleRefresh = () => {
    loadTickets()
  }

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "mejora":
        return <Sparkles className="h-4 w-4" />
      case "cambio":
        return <FileEdit className="h-4 w-4" />
      case "eliminar":
        return <Trash2 className="h-4 w-4" />
      case "error":
        return <Bug className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "mejora":
        return "bg-blue-500/10 text-blue-500"
      case "cambio":
        return "bg-yellow-500/10 text-yellow-600"
      case "eliminar":
        return "bg-red-500/10 text-red-500"
      case "error":
        return "bg-orange-500/10 text-orange-500"
      default:
        return "bg-gray-500/10 text-gray-500"
    }
  }

  const getEstadoColor = (estado: TicketStatus) => {
    switch (estado) {
      case "pendiente":
        return "bg-gray-500/10 text-gray-600"
      case "en_progreso":
        return "bg-blue-500/10 text-blue-600"
      case "completado":
        return "bg-green-500/10 text-green-600"
      case "rechazado":
        return "bg-red-500/10 text-red-600"
      default:
        return "bg-gray-500/10 text-gray-600"
    }
  }

  const getEstadoIcon = (estado: TicketStatus) => {
    switch (estado) {
      case "pendiente":
        return <Clock className="h-3 w-3" />
      case "en_progreso":
        return <AlertCircle className="h-3 w-3" />
      case "completado":
        return <CheckCircle2 className="h-3 w-3" />
      case "rechazado":
        return <XCircle className="h-3 w-3" />
    }
  }

  const getPrioridadColor = (prioridad?: TicketPriority) => {
    switch (prioridad) {
      case "urgente":
        return "bg-red-500/10 text-red-600 border-red-500/20"
      case "alta":
        return "bg-orange-500/10 text-orange-600 border-orange-500/20"
      case "media":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
      case "baja":
        return "bg-green-500/10 text-green-600 border-green-500/20"
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20"
    }
  }

  const filteredTickets = tickets.filter((ticket) => {
    const matchesStatus = filterStatus === "todos" || ticket.estado === filterStatus
    const matchesType = filterType === "todos" || ticket.tipo === filterType
    const matchesSearch =
      ticket.titulo?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
      ticket.descripcion?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
      ticket.usuario?.toLowerCase()?.includes(searchTerm.toLowerCase())
    return matchesStatus && matchesType && matchesSearch
  })

  const updateTicketStatus = async (ticketId: number | string, newStatus: TicketStatus) => {
    setIsSubmitting(true)
    try {
      await SupportTicketService.updateTicket(ticketId, { estado: newStatus })
      setTickets(
        tickets.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                estado: newStatus,
              }
            : t,
        ),
      )
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, estado: newStatus })
      }
    } catch (error) {
      console.error("Error al actualizar estado:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateTicketPriority = async (ticketId: number | string, newPriority: TicketPriority) => {
    setIsSubmitting(true)
    try {
      await SupportTicketService.updateTicket(ticketId, { prioridad: newPriority })
      setTickets(
        tickets.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                prioridad: newPriority,
              }
            : t,
        ),
      )
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, prioridad: newPriority })
      }
    } catch (error) {
      console.error("Error al actualizar prioridad:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const assignTicket = async (ticketId: number | string, developerId: number | string) => {
    setIsSubmitting(true)
    try {
      await SupportTicketService.updateTicket(ticketId, { asignadoAId: developerId })
      const developer = developers.find((d) => d.id === developerId)
      setTickets(
        tickets.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                asignadoA: developer?.nombre,
                asignadoAId: developerId,
              }
            : t,
        ),
      )
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({
          ...selectedTicket,
          asignadoA: developer?.nombre,
          asignadoAId: developerId,
        })
      }
    } catch (error) {
      console.error("Error al asignar ticket:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const addComment = async () => {
    if (!selectedTicket || !newComment.trim()) return

    setIsSubmitting(true)
    try {
      const updatedTicket = await SupportTicketService.addComment({
        ticketId: selectedTicket.id,
        texto: newComment,
      })

      setTickets(
        tickets.map((t) => (t.id === selectedTicket.id ? updatedTicket : t)),
      )
      setSelectedTicket(updatedTicket)
      setNewComment("")
    } catch (error) {
      console.error("Error al agregar comentario:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const statusStats = {
    pendiente: tickets.filter((t) => t.estado === "pendiente").length,
    en_progreso: tickets.filter((t) => t.estado === "en_progreso").length,
    completado: tickets.filter((t) => t.estado === "completado").length,
    rechazado: tickets.filter((t) => t.estado === "rechazado").length,
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Panel de Administración de Tickets</h1>
          <p className="text-muted-foreground">Gestiona todas las solicitudes de soporte del sistema</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-600" />
              Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusStats.pendiente}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              En Progreso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusStats.en_progreso}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Completados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusStats.completado}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Rechazados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusStats.rechazado}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, descripción o usuario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="en_progreso">En Progreso</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="rechazado">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  <SelectItem value="error">Errores</SelectItem>
                  <SelectItem value="mejora">Mejoras</SelectItem>
                  <SelectItem value="cambio">Cambios</SelectItem>
                  <SelectItem value="eliminar">Eliminaciones</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Tickets */}
      <div className="space-y-3">
        {filteredTickets.map((ticket) => (
          <Card
            key={ticket.id}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => setSelectedTicket(ticket)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={getTipoColor(ticket.tipo)}>
                      {getTipoIcon(ticket.tipo)}
                      <span className="ml-1 capitalize">{ticket.tipo}</span>
                    </Badge>
                    <Badge variant="outline" className={getEstadoColor(ticket.estado)}>
                      {getEstadoIcon(ticket.estado)}
                      <span className="ml-1 capitalize">{ticket.estado.replace("_", " ")}</span>
                    </Badge>
                    {ticket.prioridad && (
                      <Badge variant="outline" className={getPrioridadColor(ticket.prioridad)}>
                        <Tag className="h-3 w-3 mr-1" />
                        {ticket.prioridad.toUpperCase()}
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-semibold mb-1 truncate">{ticket.titulo}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{ticket.descripcion}</p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {ticket.usuario}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(ticket.fechaCreacion).toLocaleDateString("es-MX")}
                    </div>
                    {ticket.asignadoA && (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Asignado a: {ticket.asignadoA}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredTickets.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No se encontraron tickets con los filtros seleccionados</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de Detalles del Ticket */}
      <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <div className="dialog-scroll-content space-y-6">
            <DialogHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <DialogTitle className="text-xl mb-2">{selectedTicket?.titulo}</DialogTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={getTipoColor(selectedTicket?.tipo || "")}>
                      {getTipoIcon(selectedTicket?.tipo || "")}
                      <span className="ml-1 capitalize">{selectedTicket?.tipo}</span>
                    </Badge>
                    <Badge variant="outline" className={getEstadoColor(selectedTicket?.estado || "pendiente")}>
                      {getEstadoIcon(selectedTicket?.estado || "pendiente")}
                      <span className="ml-1 capitalize">{selectedTicket?.estado.replace("_", " ")}</span>
                    </Badge>
                    {selectedTicket?.prioridad && (
                      <Badge variant="outline" className={getPrioridadColor(selectedTicket.prioridad)}>
                        <Tag className="h-3 w-3 mr-1" />
                        {selectedTicket.prioridad.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </DialogHeader>

            <Tabs defaultValue="detalles" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="detalles">Detalles</TabsTrigger>
                <TabsTrigger value="comentarios">
                  Comentarios
                  {selectedTicket?.comentarios && selectedTicket.comentarios.length > 0 && (
                    <span className="ml-1">({selectedTicket.comentarios.length})</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="gestion">Gestión</TabsTrigger>
              </TabsList>

              <TabsContent value="detalles" className="space-y-4 mt-4">
                <div>
                  <Label className="text-sm font-medium">Descripción</Label>
                  <p className="text-sm mt-1">{selectedTicket?.descripcion}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Usuario</Label>
                    <p className="text-sm mt-1">{selectedTicket?.usuario}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Fecha de Creación</Label>
                    <p className="text-sm mt-1">
                      {selectedTicket?.fechaCreacion
                        ? new Date(selectedTicket.fechaCreacion).toLocaleString("es-MX")
                        : ""}
                    </p>
                  </div>
                </div>

                {selectedTicket?.seccion && (
                  <div>
                    <Label className="text-sm font-medium">Sección</Label>
                    <p className="text-sm mt-1 capitalize">
                      {selectedTicket.seccion}
                      {selectedTicket.subseccion && ` > ${selectedTicket.subseccion}`}
                    </p>
                  </div>
                )}

                {selectedTicket?.menuPrincipal && (
                  <div>
                    <Label className="text-sm font-medium">Ubicación en Menú</Label>
                    <p className="text-sm mt-1 capitalize">
                      {selectedTicket.menuPrincipal}
                      {selectedTicket.submenu && ` > ${selectedTicket.submenu}`}
                    </p>
                  </div>
                )}

                {selectedTicket?.pasosReplicar && (
                  <div>
                    <Label className="text-sm font-medium">Pasos para Replicar</Label>
                    <pre className="text-sm mt-1 whitespace-pre-wrap bg-muted p-3 rounded">
                      {selectedTicket.pasosReplicar}
                    </pre>
                  </div>
                )}

                {selectedTicket?.imagenes && selectedTicket.imagenes.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Imágenes Adjuntas</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {selectedTicket.imagenes.map((img, index) => (
                        <img
                          key={index}
                          src={img || "/placeholder.svg"}
                          alt={`Captura ${index + 1}`}
                          className="w-full h-32 object-cover rounded border"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="comentarios" className="space-y-4 mt-4">
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {selectedTicket?.comentarios && selectedTicket.comentarios.length > 0 ? (
                    selectedTicket.comentarios.map((comment, index) => (
                      <div key={index} className="flex gap-3 p-3 bg-muted rounded-lg">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{comment.usuario.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{comment.usuario}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.fecha).toLocaleString("es-MX")}
                            </span>
                          </div>
                          <p className="text-sm">{comment.texto}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No hay comentarios aún. Sé el primero en comentar.
                    </p>
                  )}
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <Label>Agregar Comentario</Label>
                  <Textarea
                    placeholder="Escribe tu comentario..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={addComment} disabled={!newComment.trim()} size="sm" className="w-full">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Publicar Comentario
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="gestion" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Cambiar Estado</Label>
                  <Select
                    value={selectedTicket?.estado}
                    onValueChange={(value) =>
                      selectedTicket && updateTicketStatus(selectedTicket.id, value as TicketStatus)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="en_progreso">En Progreso</SelectItem>
                      <SelectItem value="completado">Completado</SelectItem>
                      <SelectItem value="rechazado">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Asignar a</Label>
                  <Select
                    value={selectedTicket?.asignadoAId ? String(selectedTicket.asignadoAId) : ""}
                    onValueChange={(value) => selectedTicket && assignTicket(selectedTicket.id, value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar responsable" />
                    </SelectTrigger>
                    <SelectContent>
                      {developers.map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>{d.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Prioridad</Label>
                  <Select
                    value={selectedTicket?.prioridad || "media"}
                    onValueChange={(value) =>
                      selectedTicket && updateTicketPriority(selectedTicket.id, value as TicketPriority)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
