'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Vehicles, VehicleStatus, VehicleTypeEnum } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import * as z from 'zod'
import { format } from 'date-fns'
import { useAuthStore } from '@/store/auth.store'

const stringField = (message: string) =>
  z.string({ required_error: message, invalid_type_error: message }).min(1, message)

export const vehicleSchema = z.object({
  plateNumber: stringField("Número de placa es requerido").regex(/^[A-Z0-9]{1,3}-[A-Z0-9]{1,5}$/, "Formato de placa inválido"),
  plateNumber2: z.string().regex(/^[A-Z0-9]{1,3}-[A-Z0-9]{1,5}$/, "Formato de placa inválido").optional(),
  model: stringField("Modelo es requerido"),
  brand: stringField("Marca es requerida"),
  policyNumber: stringField("Número de Poliza es requerida"),
  code: stringField("Código es requerido").regex(/^[A-Z0-9]{1,3}-[A-Z0-9]{1,3}$/, "Formato de código inválido"),
  name: z.string().optional(),
  capacity: z.number({ required_error: "Capacidad es requerida" }).min(1, "Capacidad debe ser mayor a 0"),
  type: z.nativeEnum(VehicleTypeEnum),
  status: z.nativeEnum(VehicleStatus),
  kms: z.number().min(0, "Kilometraje debe ser mayor o igual a 0").optional(),
  policyExpirationDate: z.union([z.date(), z.string().datetime(), z.null()]).optional(),
  lastMaintenance: z.union([z.date(), z.string().datetime(), z.null()]).optional(),
  nextMaintenance: z.union([z.date(), z.string().datetime(), z.null()]).optional(),
  subsidiary: z.object({ id: z.string(), name: z.string().optional() }).optional(),
})

type VehicleFormProps = {
  defaultValues?: Partial<Vehicles>
  subsidiary?: { id: string; name: string }
  onSubmit: (values: Vehicles) => void
}

export function VehicleForm({ defaultValues, subsidiary, onSubmit }: VehicleFormProps) {
  const user = useAuthStore((s) => s.user)

  const form = useForm<z.infer<typeof vehicleSchema>>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plateNumber: defaultValues?.plateNumber ?? '',
      plateNumber2: defaultValues?.plateNumber2 ?? '',
      model: defaultValues?.model ?? '',
      brand: defaultValues?.brand ?? '',
      code: defaultValues?.code ?? '',
      name: defaultValues?.name ?? '',
      capacity: defaultValues?.capacity ?? 0,
      kms: defaultValues?.kms ?? 0,
      type: defaultValues?.type ?? undefined,
      status: defaultValues?.status ?? undefined,
      policyNumber: defaultValues?.policyNumber ?? '',
      policyExpirationDate: defaultValues?.policyExpirationDate ? new Date(defaultValues.policyExpirationDate) : null,
      lastMaintenance: defaultValues?.lastMaintenance ? new Date(defaultValues.lastMaintenance) : null,
      nextMaintenance: defaultValues?.nextMaintenance ? new Date(defaultValues.nextMaintenance) : null,
      subsidiary: subsidiary || user?.subsidiary || { id: '', name: '' },
    },
  })

  const { setValue, watch } = form
  const effectiveSubsidiary = watch('subsidiary')

  useEffect(() => {
    setValue('subsidiary', subsidiary || user?.subsidiary || defaultValues?.subsidiary || { id: '', name: '' })
  }, [subsidiary, user, defaultValues, setValue])

  const handleSubmit = (values: z.infer<typeof vehicleSchema>) => {
    onSubmit({
      ...values,
      lastMaintenance: values.lastMaintenance ? new Date(values.lastMaintenance).toISOString() : null,
      nextMaintenance: values.nextMaintenance ? new Date(values.nextMaintenance).toISOString() : null,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Text Inputs */}
        {['plateNumber','plateNumber2','model','brand','code','name','policyNumber'].map((name) => (
          <FormField key={name} control={form.control} name={name as any} render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">{name}</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        ))}

        {/* Number Inputs */}
        {['capacity','kms'].map((name) => (
          <FormField key={name} control={form.control} name={name as any} render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">{name === 'capacity' ? 'Capacidad' : 'Kilómetros'}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  value={field.value ?? 0}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        ))}

        {/* Tipo */}
        <FormField control={form.control} name="type" render={({ field }) => (
          <FormItem>
            <FormLabel>Tipo</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {Object.values(VehicleTypeEnum).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        {/* Status */}
        <FormField control={form.control} name="status" render={({ field }) => (
          <FormItem>
            <FormLabel>Estatus</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estatus" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {Object.values(VehicleStatus).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        {/* Fechas */}
        {['policyExpirationDate','lastMaintenance','nextMaintenance'].map((fieldName) => (
          <FormField key={fieldName} control={form.control} name={fieldName as any} render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>
                {fieldName === 'policyExpirationDate' ? 'Expiración de Poliza' :
                 fieldName === 'lastMaintenance' ? 'Último mantenimiento' : 'Siguiente mantenimiento'}
              </FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      {field.value ? format(field.value, 'dd/MM/yyyy') : 'Selecciona una fecha'}
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
          )} />
        ))}

        {/* Sucursal */}
        {effectiveSubsidiary && (
          <div className="md:col-span-2">
            <FormLabel>Sucursal</FormLabel>
            <div className="border rounded-md px-3 py-2 text-sm bg-muted">
              {effectiveSubsidiary.name}
            </div>
          </div>
        )}

        {/* Submit */}
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Form>
  )
}
