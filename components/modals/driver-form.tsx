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
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'

const stringField = (message: string) =>
  z.string({
    required_error: message,
    invalid_type_error: message,
  }).min(1, message)

export const driverSchema = z.object({
  name: stringField('Nombre es requerido'),
  licenseNumber: stringField('Número de licencia es requerido'),
  phoneNumber: stringField('Número de teléfono es requerido'),
  status: z.nativeEnum(StatusEnum, {
    errorMap: () => ({ message: 'Estado inválido' }),
  }),
  licenseExpiration: z.union([z.date(), z.string().datetime(), z.null()]),
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

type DriverFormProps = {
  defaultValues?: Partial<Driver>
  subsidiary?: { id: string; name: string }
  onSubmit: (values: Driver) => void
}

export function DriverForm({ defaultValues, subsidiary, onSubmit }: DriverFormProps) {
  const user = useAuthStore((s) => s.user)

  // ✅ Define valores seguros
  const form = useForm<z.infer<typeof driverSchema>>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      licenseNumber: defaultValues?.licenseNumber ?? '',
      phoneNumber: defaultValues?.phoneNumber ?? '',
      status: defaultValues?.status ?? StatusEnum.ACTIVE,
      licenseExpiration: defaultValues?.licenseExpiration
        ? new Date(defaultValues.licenseExpiration)
        : null,
      subsidiary: subsidiary || user?.subsidiary || { id: '', name: '' },
    },
  })

  const { setValue, watch } = form
  const effectiveSubsidiary = watch('subsidiary')

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

        <FormField
          control={form.control}
          name="licenseNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Licencia</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="licenseExpiration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expiración de Licencia</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      {field.value
                        ? format(field.value, 'dd/MM/yyyy')
                        : 'Selecciona una fecha'}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value instanceof Date ? field.value : undefined}
                    onSelect={(date) => field.onChange(date ?? null)}
                  />
                </PopoverContent>
              </Popover>
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
                  value={field.value ?? ''}
                  maxLength={14}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\D/g, '')
                    if (value.length > 6) {
                      value = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(
                        6,
                        10
                      )}`
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
