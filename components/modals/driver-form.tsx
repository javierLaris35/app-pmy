'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { StatusEnum, type Driver } from '@/lib/types'
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

export const driverSchema = z.object({
  name: stringField("Nombre es requerido"),
  licenseNumber: stringField("Número de licencia es requerido"),
  phoneNumber: stringField("Número de teléfono es requerido"),

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

type DriverFormProps = {
  defaultValues?: Partial<Driver>
  onSubmit: (values: Driver) => void
}

export function DriverForm({ defaultValues, onSubmit }: DriverFormProps) {
  const user = useAuthStore((s) => s.user)

  const form = useForm<z.infer<typeof driverSchema>>({
    resolver: zodResolver(driverSchema),
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
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="licenseNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Licencia</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Número de Teléfono</FormLabel>
                <FormControl>
                    <Input
                    {...field}
                    maxLength={14} // para el formato (123) 456-7890 son 14 caracteres incluyendo espacios y paréntesis
                    onChange={(e) => {
                        // Solo números
                        let value = e.target.value.replace(/\D/g, "")

                        // Aplica formato (123) 456-7890 paso a paso
                        if (value.length > 6) {
                        value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 10)}`
                        } else if (value.length > 3) {
                        value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}`
                        } else if (value.length > 0) {
                        value = `(${value}`
                        }

                        field.onChange(value)
                    }}
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
