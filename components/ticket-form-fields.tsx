'use client'

import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UseFormReturn } from 'react-hook-form'
import { TicketFormData } from './support-ticket-form'
import { useState } from 'react'

const SECTIONS = {
  operaciones: {
    label: 'Operaciones',
    subsections: ['Cargas', 'Consolidados', 'Desembarques', 'Envíos', 'Inventarios', 'Monitoreo', 'Salidas a ruta'],
  },
  finanzas: {
    label: 'Finanzas',
    subsections: ['Ingresos', 'Gastos'],
  },
}

const MENUS = {
  admin: {
    label: 'Administración',
    submenus: ['Usuarios', 'Roles', 'Permisos', 'Configuración'],
  },
  operaciones: {
    label: 'Operaciones',
    submenus: ['Envíos', 'Recepciones', 'Inventario', 'Reportes'],
  },
  mantenimiento: {
    label: 'Mantenimiento',
    submenus: ['Backups', 'Logs', 'Base de datos'],
  },
  finanzas: {
    label: 'Finanzas',
    submenus: ['Ingresos', 'Gastos', 'Reportes'],
  },
  reportes: {
    label: 'Reportes',
    submenus: ['Ventas', 'Operaciones', 'Finanzas'],
  },
  nominas: {
    label: 'Nóminas',
    submenus: ['Empleados', 'Pagos', 'Deducciones'],
  },
}

interface TicketFormFieldsProps {
  form: UseFormReturn<TicketFormData>
  imageCount: number
  setImageCount: (count: number) => void
}

export function TicketFormFields({
  form,
  imageCount,
  setImageCount,
}: TicketFormFieldsProps) {
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const category = form.watch('category')
  const section = form.watch('section')
  const selectedMenu = form.watch('menu')

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (!files) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        setUploadedImages((prev) => [...prev, base64])
        setImageCount(imageCount + 1)
        form.setValue('images', [...(form.getValues('images') || []), base64])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index))
    const images = form.getValues('images') || []
    form.setValue(
      'images',
      images.filter((_, i) => i !== index)
    )
    setImageCount(imageCount - 1)
  }

  return (
    <div className="space-y-8">
      {/* Información General */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Información General</h3>

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría*</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="mejora">Mejora</SelectItem>
                  <SelectItem value="cambio">Cambio</SelectItem>
                  <SelectItem value="eliminar">Eliminar</SelectItem>
                  <SelectItem value="error">Error del Sistema</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título del Ticket*</FormLabel>
              <FormControl>
                <Input
                  placeholder="Breve descripción del problema o solicitud"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción Detallada*</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe en detalle el problema o la solicitud"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prioridad*</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona la prioridad" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Sección */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Sección del Sistema</h3>

        <FormField
          control={form.control}
          name="section"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sección*</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una sección" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(SECTIONS).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {section && SECTIONS[section as keyof typeof SECTIONS] && (
          <FormField
            control={form.control}
            name="subsection"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Sub-sección de {SECTIONS[section as keyof typeof SECTIONS].label}
                </FormLabel>
                <Select value={field.value || ''} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una sub-sección" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SECTIONS[section as keyof typeof SECTIONS].subsections.map(
                      (subsection) => (
                        <SelectItem key={subsection} value={subsection}>
                          {subsection}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        )}
      </div>

      {/* Menú y Submenú (para Mejora, Cambio, Eliminar) */}
      {(category === 'mejora' || category === 'cambio' || category === 'eliminar') && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Ubicación en el Sistema</h3>

          <FormField
            control={form.control}
            name="menu"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Menú Principal</FormLabel>
                <Select value={field.value || ''} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un menú" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(MENUS).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="nuevo">+ Solicitar menú nuevo</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />

          {selectedMenu && selectedMenu !== 'nuevo' && (
            <FormField
              control={form.control}
              name="submenu"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sub-menú</FormLabel>
                  <Select value={field.value || ''} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un sub-menú" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MENUS[selectedMenu as keyof typeof MENUS]?.submenus.map(
                        (submenu) => (
                          <SelectItem key={submenu} value={submenu}>
                            {submenu}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          )}

          {selectedMenu === 'nuevo' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Se ha solicitado la creación de un nuevo menú. Por favor describe el menú y sub-menús que necesitas en la descripción general.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pasos para Replicar (para Errores) */}
      {category === 'error' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Información del Error</h3>

          <FormField
            control={form.control}
            name="replicationSteps"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pasos para Replicar el Error*</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe los pasos exactos para reproducir el error. Ej: 1. Ir a Operaciones, 2. Seleccionar Cargas, 3. Hacer clic en..."
                    className="min-h-[120px]"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Sé lo más específico posible para que nuestro equipo pueda reproducir el error
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      {/* Imágenes (para Errores) */}
      {category === 'error' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Apoyo Visual</h3>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition cursor-pointer">
            <label className="cursor-pointer">
              <div className="space-y-2">
                <div className="text-2xl">📷</div>
                <p className="text-sm font-medium">Arrastra imágenes aquí o haz clic para seleccionar</p>
                <p className="text-xs text-gray-500">PNG, JPG, GIF hasta 5MB</p>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          </div>

          {uploadedImages.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-3">Imágenes cargadas ({uploadedImages.length})</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {uploadedImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image || "/placeholder.svg"}
                      alt={`Captura ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contacto */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Información de Contacto</h3>

        <FormField
          control={form.control}
          name="contact"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email de Contacto*</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="tu.email@ejemplo.com"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Usaremos este email para contactarte sobre el estado del ticket
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="assignedTo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Asignar a</FormLabel>
              <FormControl>
                <Input
                  placeholder="Nombre del desarrollador o equipo (opcional)"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Puedes asignar este ticket a un desarrollador o equipo específico
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
