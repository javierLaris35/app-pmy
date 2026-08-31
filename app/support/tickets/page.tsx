"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertCircle,
  Bug,
  FileEdit,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
  HelpCircle,
  ChevronRight,
  CheckCircle2,
  Info,
  Loader2,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  type TicketType,
  type TicketFormData,
  type MenuPrincipal,
  TIPO_TICKET_INFO,
  SECCIONES_CONFIG,
  MENUS_INFO,
  getTicketTypeColor,
} from "@/lib/types/support-ticket"
import { SupportTicketService } from "@/lib/services/support-ticket.service"
import { AppLayout } from "@/components/app-layout"
import { OperationHeader } from "@/components/shared/operation-header"
import { LifeBuoy } from "lucide-react"
import Link from "next/link"

export default function SupportTicketsPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [formData, setFormData] = useState<TicketFormData>({
    tipo: "",
    titulo: "",
    descripcion: "",
    imagenes: [],
  })
  const [previewImages, setPreviewImages] = useState<string[]>([])

  const resetForm = () => {
    setFormData({ tipo: "", titulo: "", descripcion: "", imagenes: [] })
    setPreviewImages([])
    setCurrentStep(1)
    setSubmitSuccess(false)
    setSubmitError(null)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const newImages = [...(formData.imagenes || []), ...files]
    setFormData({ ...formData, imagenes: newImages })

    files.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewImages((prev) => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    const newImages = formData.imagenes?.filter((_, i) => i !== index) || []
    setFormData({ ...formData, imagenes: newImages })
    setPreviewImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!formData.tipo) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Preparar datos para el servicio
      const ticketData = {
        tipo: formData.tipo as TicketType,
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        seccion: formData.seccion,
        subseccion: formData.subseccion,
        menuPrincipal: formData.menuPrincipal || undefined,
        submenu: formData.submenu,
        nuevoMenu: formData.nuevoMenu,
        menuError: formData.menuError || undefined,
        submenuError: formData.submenuError,
        pasosReplicar: formData.pasosReplicar,
      }

      // Llamar al servicio
      await SupportTicketService.createTicket(ticketData, formData.imagenes)

      // Limpiar formulario y mostrar pantalla de éxito.
      setFormData({ tipo: "", titulo: "", descripcion: "", imagenes: [] })
      setPreviewImages([])
      setCurrentStep(1)
      setSubmitSuccess(true)
    } catch (error) {
      console.error("Error al crear ticket:", error)
      setSubmitError("Error al crear el ticket. Por favor intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTipoIcon = (tipo: TicketType) => {
    switch (tipo) {
      case "mejora":
        return <Sparkles className="h-4 w-4" />
      case "cambio":
        return <FileEdit className="h-4 w-4" />
      case "eliminar":
        return <Trash2 className="h-4 w-4" />
      case "error":
        return <Bug className="h-4 w-4" />
    }
  }

  const getTipoColor = (tipo: TicketType) => {
    switch (tipo) {
      case "mejora":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      case "cambio":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
      case "eliminar":
        return "bg-red-500/10 text-red-500 border-red-500/20"
      case "error":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20"
    }
  }

  const getCompletedSteps = () => {
    let steps = 0
    if (formData.tipo) steps++
    if (formData.titulo && formData.descripcion) steps++

    if (formData.tipo === "error") {
      if (formData.pasosReplicar && formData.menuError) steps++
    } else if (formData.tipo === "mejora") {
      if (formData.menuPrincipal) steps++
    } else {
      if (formData.seccion && formData.subseccion) steps++
    }

    return steps
  }

  const completedSteps = getCompletedSteps()

  // Navegación del stepper: qué paso está completo y a cuál se puede saltar.
  const step2Ok = !!(formData.titulo && formData.descripcion && (formData.tipo !== "error" || formData.pasosReplicar))
  const stepDone = (n: number) => (n === 1 ? !!formData.tipo : n === 2 ? step2Ok : completedSteps === 3)
  const canGoTo = (n: number) => n === 1 || (n === 2 && !!formData.tipo) || (n === 3 && step2Ok)
  const STEPS = [
    { title: "Tipo", subtitle: "¿Qué necesitas?" },
    { title: "Detalles", subtitle: "Cuéntanos más" },
    { title: "Ubicación", subtitle: "¿Dónde está?" },
  ]

  // Etiqueta legible de la ubicación elegida, para el resumen del paso 3.
  const cap = (s?: string) => (s ? s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "")
  const locationLabel = (() => {
    if (formData.tipo === "mejora") {
      const main = formData.menuPrincipal === "nuevo" ? `Nuevo menú: ${formData.nuevoMenu ?? ""}` : cap(formData.menuPrincipal)
      return [main, cap(formData.submenu)].filter(Boolean).join(" › ")
    }
    if (formData.tipo === "error") return [cap(formData.menuError), cap(formData.submenuError)].filter(Boolean).join(" › ")
    return [cap(formData.seccion), cap(formData.subseccion)].filter(Boolean).join(" › ")
  })()

  return (
    <AppLayout>
      <OperationHeader
        icon={LifeBuoy}
        title="Centro de Ayuda"
        description="Solicita mejoras, reporta errores o pide cambios de forma sencilla"
      />
      <div className="w-full space-y-4">
        {submitSuccess ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="rounded-full bg-green-500/10 p-3">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">¡Solicitud enviada!</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  La recibimos. Te avisaremos por correo y en la campana cuando avance.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button variant="outline" className="w-full sm:w-auto" onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" /> Crear otra
                </Button>
                <Link href="/support/my-tickets" className="w-full sm:w-auto">
                  <Button className="w-full">Ver mis solicitudes</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
        <>
          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center">
                {STEPS.map((s, i) => {
                  const num = i + 1
                  const done = stepDone(num)
                  const active = currentStep === num
                  const reachable = canGoTo(num)
                  return (
                    <div key={s.title} className={`flex items-center ${i < STEPS.length - 1 ? "flex-1" : ""}`}>
                      <button
                        type="button"
                        onClick={() => reachable && setCurrentStep(num)}
                        disabled={!reachable}
                        className={`flex items-center gap-2.5 rounded-md p-1 text-left transition ${reachable ? "cursor-pointer hover:bg-muted/60" : "cursor-default"}`}
                      >
                        {done && !active ? (
                          <CheckCircle2 className="h-8 w-8 shrink-0 text-primary" />
                        ) : (
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                            {num}
                          </span>
                        )}
                        <div className="hidden sm:block">
                          <div className={`text-sm font-medium leading-tight ${active || done ? "text-foreground" : "text-muted-foreground"}`}>{s.title}</div>
                          <div className="text-xs text-muted-foreground">{s.subtitle}</div>
                        </div>
                      </button>
                      {i < STEPS.length - 1 && (
                        <div className={`mx-2 h-0.5 flex-1 rounded-full transition-colors sm:mx-3 ${done ? "bg-primary/60" : "bg-muted"}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Paso {Math.min(currentStep, 3)}:{currentStep === 1 && " ¿Qué necesitas?"}
                {currentStep === 2 && " Cuéntanos más"}
                {currentStep === 3 && " ¿Dónde está?"}
              </CardTitle>
              <CardDescription>
                {currentStep === 1 && "Selecciona el tipo de solicitud que deseas hacer"}
                {currentStep === 2 && "Describe tu solicitud con detalles"}
                {currentStep === 3 && "Indícanos en qué parte del sistema"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* PASO 1: Selección de Tipo */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {(Object.keys(TIPO_TICKET_INFO) as TicketType[]).map((tipo) => {
                      const info = TIPO_TICKET_INFO[tipo]
                      const isSelected = formData.tipo === tipo

                      return (
                        <Card
                          key={tipo}
                          className={`group cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${
                            isSelected ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "hover:border-primary/50"
                          }`}
                          onClick={() => {
                            setFormData({ ...formData, tipo })
                          }}
                        >
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`rounded-lg p-2.5 transition-transform group-hover:scale-110 ${getTipoColor(tipo)}`}>{getTipoIcon(tipo)}</div>
                                <div>
                                  <CardTitle className="text-base">{info.titulo}</CardTitle>
                                </div>
                              </div>
                              {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                            </div>
                            <CardDescription className="text-sm mt-2">{info.descripcion}</CardDescription>
                            <div className="mt-3 p-2 bg-muted rounded text-xs text-muted-foreground">
                              <Info className="h-3 w-3 inline mr-1" />
                              {info.ejemplo}
                            </div>
                          </CardHeader>
                        </Card>
                      )
                    })}
                  </div>

                  {formData.tipo && (
                    <div className="flex justify-end pt-4">
                      <Button onClick={() => setCurrentStep(2)}>
                        Continuar
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* PASO 2: Detalles */}
              {currentStep === 2 && formData.tipo && (
                <div className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>Cuanto más claro sea, más rápido podremos ayudarte</AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="titulo">
                      Título de tu solicitud *
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-3 w-3 ml-1 inline" />
                          </TooltipTrigger>
                          <TooltipContent>Un resumen corto de lo que necesitas</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Input
                      id="titulo"
                      placeholder="Ej: Agregar botón para imprimir etiquetas"
                      value={formData.titulo}
                      maxLength={120}
                      onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                    />
                    <p className="text-right text-xs text-muted-foreground">{formData.titulo.length}/120</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="descripcion">
                      Descripción detallada *
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-3 w-3 ml-1 inline" />
                          </TooltipTrigger>
                          <TooltipContent>Explica con detalles lo que necesitas o lo que está pasando</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Textarea
                      id="descripcion"
                      placeholder="Ej: Necesito poder imprimir etiquetas de los paquetes desde la lista de consolidados. Me gustaría que el botón estuviera junto al botón de editar..."
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      rows={5}
                    />
                    <p className="text-right text-xs text-muted-foreground">{formData.descripcion.length} caracteres</p>
                  </div>

                  {/* Para errores, pedimos los pasos para replicar */}
                  {formData.tipo === "error" && (
                    <div className="space-y-2">
                      <Label htmlFor="pasosReplicar">
                        ¿Cómo podemos ver el error? *
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="h-3 w-3 ml-1 inline" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Dinos paso a paso qué hacer para que nos aparezca el mismo error
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Label>
                      <Textarea
                        id="pasosReplicar"
                        placeholder="Ej:&#10;1. Abro la pantalla de consolidados&#10;2. Hago clic en 'Agregar'&#10;3. Lleno todos los campos&#10;4. Al dar clic en 'Guardar' me sale un error"
                        value={formData.pasosReplicar}
                        onChange={(e) => setFormData({ ...formData, pasosReplicar: e.target.value })}
                        rows={6}
                      />
                    </div>
                  )}

                  {/* Adjuntos: disponibles para todos los tipos */}
                  <div className="space-y-2">
                    <Label>
                      {formData.tipo === "error" ? "Capturas del error" : "Adjuntos"}
                      <span className="ml-1 font-normal text-muted-foreground">
                        {formData.tipo === "error" ? "(opcional, pero muy útil)" : "(opcional)"}
                      </span>
                    </Label>
                    <div className="rounded-lg border-2 border-dashed p-6 text-center transition-colors hover:border-primary/50">
                      <input
                        type="file"
                        id="fileUpload"
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                      />
                      <label htmlFor="fileUpload" className="cursor-pointer">
                        <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Haz clic para subir imágenes</p>
                        <p className="mt-1 text-xs text-muted-foreground">Puedes subir varias a la vez</p>
                      </label>
                    </div>

                    {previewImages.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {previewImages.map((img, index) => (
                          <div key={index} className="group relative">
                            <img
                              src={img || "/placeholder.svg"}
                              alt={`Adjunto ${index + 1}`}
                              className="h-24 w-full rounded border object-cover"
                            />
                            <button
                              onClick={() => removeImage(index)}
                              className="absolute right-1 top-1 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setCurrentStep(1)}>
                      Atrás
                    </Button>
                    <Button
                      onClick={() => setCurrentStep(3)}
                      disabled={
                        !formData.titulo ||
                        !formData.descripcion ||
                        (formData.tipo === "error" && !formData.pasosReplicar)
                      }
                    >
                      Continuar
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* PASO 3: Ubicación */}
              {currentStep === 3 && formData.tipo && (
                <div className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Indícanos en qué parte del sistema está o debería estar tu solicitud
                    </AlertDescription>
                  </Alert>

                  {/* Para Mejora */}
                  {formData.tipo === "mejora" && (
                    <>
                      <div className="space-y-2">
                        <Label>
                          ¿En qué menú debería aparecer? *
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-3 w-3 ml-1 inline" />
                              </TooltipTrigger>
                              <TooltipContent>Selecciona el menú principal donde iría tu mejora</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {(Object.keys(MENUS_INFO) as (keyof typeof MENUS_INFO)[]).map((menu) => {
                            const info = MENUS_INFO[menu]
                            const isSelected = formData.menuPrincipal === menu

                            return (
                              <Card
                                key={menu}
                                className={`cursor-pointer transition-all hover:border-primary p-4 ${
                                  isSelected ? "border-primary bg-primary/5" : ""
                                }`}
                                onClick={() =>
                                  setFormData({ ...formData, menuPrincipal: menu as MenuPrincipal, submenu: "" })
                                }
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">{info.label}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{info.descripcion}</div>
                                  </div>
                                  {isSelected && <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />}
                                </div>
                              </Card>
                            )
                          })}
                          <Card
                            className={`cursor-pointer transition-all hover:border-primary p-4 ${
                              formData.menuPrincipal === "nuevo" ? "border-primary bg-primary/5" : ""
                            }`}
                            onClick={() => setFormData({ ...formData, menuPrincipal: "nuevo", submenu: "" })}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">Crear Nuevo Menú</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Si necesitas un menú completamente nuevo
                                </div>
                              </div>
                              {formData.menuPrincipal === "nuevo" && (
                                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                              )}
                            </div>
                          </Card>
                        </div>
                      </div>

                      {formData.menuPrincipal === "nuevo" && (
                        <div className="space-y-2">
                          <Label htmlFor="nuevoMenu">¿Cómo se debería llamar el nuevo menú? *</Label>
                          <Input
                            id="nuevoMenu"
                            placeholder="Ej: Atención al Cliente"
                            value={formData.nuevoMenu}
                            onChange={(e) => setFormData({ ...formData, nuevoMenu: e.target.value })}
                          />
                        </div>
                      )}

                      {formData.menuPrincipal && formData.menuPrincipal !== "nuevo" && (
                        <div className="space-y-2">
                          <Label>
                            ¿En qué submenú? (opcional)
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <HelpCircle className="h-3 w-3 ml-1 inline" />
                                </TooltipTrigger>
                                <TooltipContent>Si aplica a una sección específica, selecciónala</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Label>
                          <Select
                            value={formData.submenu}
                            onValueChange={(value) => setFormData({ ...formData, submenu: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Elige un submenú (opcional)" />
                            </SelectTrigger>
                            <SelectContent>
                              {MENUS_INFO[formData.menuPrincipal as keyof typeof MENUS_INFO]?.submenus.map((sub) => (
                                <SelectItem key={sub} value={sub}>
                                  {sub.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </>
                  )}

                  {/* Para Cambio/Eliminar */}
                  {(formData.tipo === "cambio" || formData.tipo === "eliminar") && (
                    <>
                      <div className="space-y-2">
                        <Label>¿A qué área pertenece? *</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {(Object.keys(SECCIONES_CONFIG) as (keyof typeof SECCIONES_CONFIG)[]).map((seccion) => {
                            const info = SECCIONES_CONFIG[seccion]
                            const isSelected = formData.seccion === seccion

                            return (
                              <Card
                                key={seccion}
                                className={`cursor-pointer transition-all hover:border-primary p-4 ${
                                  isSelected ? "border-primary bg-primary/5" : ""
                                }`}
                                onClick={() =>
                                  setFormData({
                                    ...formData,
                                    seccion: seccion as "operaciones" | "finanzas",
                                    subseccion: "",
                                  })
                                }
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">{info.label}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{info.descripcion}</div>
                                  </div>
                                  {isSelected && <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />}
                                </div>
                              </Card>
                            )
                          })}
                        </div>
                      </div>

                      {formData.seccion && (
                        <div className="space-y-2">
                          <Label>¿En qué pantalla específica? *</Label>
                          <Select
                            value={formData.subseccion}
                            onValueChange={(value) => setFormData({ ...formData, subseccion: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona la pantalla" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(SECCIONES_CONFIG[formData.seccion].subsecciones).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </>
                  )}

                  {/* Para Error */}
                  {formData.tipo === "error" && (
                    <>
                      <div className="space-y-2">
                        <Label>¿En qué menú ocurre el error? *</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {(Object.keys(MENUS_INFO) as (keyof typeof MENUS_INFO)[]).map((menu) => {
                            const info = MENUS_INFO[menu]
                            const isSelected = formData.menuError === menu

                            return (
                              <Card
                                key={menu}
                                className={`cursor-pointer transition-all hover:border-primary p-4 ${
                                  isSelected ? "border-primary bg-primary/5" : ""
                                }`}
                                onClick={() =>
                                  setFormData({ ...formData, menuError: menu as MenuPrincipal, submenuError: "" })
                                }
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">{info.label}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{info.descripcion}</div>
                                  </div>
                                  {isSelected && <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />}
                                </div>
                              </Card>
                            )
                          })}
                        </div>
                      </div>

                      {formData.menuError && (
                        <div className="space-y-2">
                          <Label>¿En qué submenú? (si aplica)</Label>
                          <Select
                            value={formData.submenuError}
                            onValueChange={(value) => setFormData({ ...formData, submenuError: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona el submenú (opcional)" />
                            </SelectTrigger>
                            <SelectContent>
                              {MENUS_INFO[formData.menuError as keyof typeof MENUS_INFO]?.submenus.map((sub) => (
                                <SelectItem key={sub} value={sub}>
                                  {sub.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </>
                  )}

                  {/* Resumen antes de enviar */}
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resumen</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-24 shrink-0 text-muted-foreground">Tipo</span>
                        {formData.tipo && (
                          <Badge variant="outline" className={getTipoColor(formData.tipo)}>
                            <span className="mr-1">{getTipoIcon(formData.tipo)}</span>
                            {TIPO_TICKET_INFO[formData.tipo].titulo}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <span className="w-24 shrink-0 text-muted-foreground">Título</span>
                        <span className="min-w-0 font-medium">{formData.titulo || "—"}</span>
                      </div>
                      {locationLabel && (
                        <div className="flex gap-2">
                          <span className="w-24 shrink-0 text-muted-foreground">Ubicación</span>
                          <span className="min-w-0 font-medium">{locationLabel}</span>
                        </div>
                      )}
                      {previewImages.length > 0 && (
                        <div className="flex gap-2">
                          <span className="w-24 shrink-0 text-muted-foreground">Adjuntos</span>
                          <span className="font-medium">{previewImages.length} imagen{previewImages.length > 1 ? "es" : ""}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setCurrentStep(2)}>
                      Atrás
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={
                        isSubmitting ||
                        (formData.tipo === "mejora" && !formData.menuPrincipal) ||
                        (formData.tipo === "mejora" && formData.menuPrincipal === "nuevo" && !formData.nuevoMenu) ||
                        ((formData.tipo === "cambio" || formData.tipo === "eliminar") &&
                          (!formData.seccion || !formData.subseccion)) ||
                        (formData.tipo === "error" && !formData.menuError)
                      }
                      className="bg-primary"
                    >
                      {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                      {isSubmitting ? "Enviando…" : "Enviar solicitud"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
        )}
      </div>
    </AppLayout>
  )
}
