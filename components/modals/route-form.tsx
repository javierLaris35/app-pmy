'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { StatusEnum, type Route } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select'
import * as z from 'zod'
import { useAuthStore } from '@/store/auth.store'

const stringField = (message: string) =>
  z.string({
    required_error: message,
    invalid_type_error: message,
  }).min(1, message)

export const routeSchema = z.object({
  name: stringField('Nombre es requerido'),
  code: z.string().optional(),
  status: z.nativeEnum(StatusEnum, {
    errorMap: () => ({ message: 'Estado inválido' }),
  }),
  subsidiary: z.object({
    id: z.string({
      required_error: 'ID de sucursal es requerido',
      invalid_type_error: 'ID de sucursal inválido',
    }),
    name: z.string({
      invalid_type_error: 'Nombre de sucursal inválido',
    }).optional(),
  }),
})

type RouteFormProps = {
  defaultValues?: Partial<Route>
  subsidiary?: { id: string; name: string }
  onSubmit: (values: Route) => void
}

export function RouteForm({ defaultValues, subsidiary, onSubmit }: RouteFormProps) {
  const user = useAuthStore((s) => s.user)

  // ✅ Inicialización segura de valores
  const form = useForm<z.infer<typeof routeSchema>>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      code: defaultValues?.code ?? '',
      status: defaultValues?.status ?? StatusEnum.ACTIVE,
      subsidiary: subsidiary || user?.subsidiary || { id: '', name: '' },
    },
  })

  const { setValue, watch } = form
  const effectiveSubsidiary = watch('subsidiary')

  // ✅ Establece la sucursal activa del usuario si aplica
  useEffect(() => {
    if (subsidiary || user?.subsidiary) {
      setValue('subsidiary', subsidiary || user?.subsidiary)
    }
  }, [subsidiary, user, setValue])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Sucursal de solo lectura */}
        {effectiveSubsidiary && (
          <div>
            <FormLabel className="text-sm font-medium text-muted-foreground">
              Sucursal
            </FormLabel>
            <div className="border rounded-md px-3 py-2 text-sm bg-muted">
              {effectiveSubsidiary.name}
            </div>
          </div>
        )}

        {/* Nombre */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Código */}
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código (Fedex)</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Estatus */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estatus</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value ?? StatusEnum.ACTIVE}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estatus" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={StatusEnum.ACTIVE}>Activo</SelectItem>
                  <SelectItem value={StatusEnum.INACTIVE}>Inactivo</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Guardar</Button>
      </form>
    </Form>
  )
}
