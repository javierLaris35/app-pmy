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
  }).min(1, message);

export const routeSchema = z.object({
  name: stringField("Nombre es requerido"),

  status: z.nativeEnum(StatusEnum, {
    errorMap: () => ({ message: "Estado inválido" }),
  }),

  subsidiary: z.object({
    id: z.string({
      required_error: "ID de sucursal es requerido",
      invalid_type_error: "ID de sucursal inválido",
    }),

    name: z.string({
      invalid_type_error: "Nombre de sucursal inválido",
    }).optional(),
  }),
});

type RouteFormProps = {
  defaultValues?: Partial<Route>
  onSubmit: (values: Route) => void
}

export function RouteForm({ defaultValues, onSubmit }: RouteFormProps) {
  const user = useAuthStore((s) => s.user)

  const form = useForm<z.infer<typeof routeSchema>>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      ...defaultValues,
      subsidiary: defaultValues?.subsidiary || user?.subsidiary
    }
  })

  const { setValue } = form

  useEffect(() => {
    if (user?.subsidiary) {
      setValue('subsidiary', user.subsidiary)
    }
  }, [user, setValue])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Sucursal mostrada como campo de solo lectura */}
        {user?.subsidiary && (
          <div>
            <FormLabel className="text-sm font-medium text-muted-foreground">Sucursal</FormLabel>
            <div className="border rounded-md px-3 py-2 text-sm bg-muted">
              {user.subsidiary.name}
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estatus</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
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
