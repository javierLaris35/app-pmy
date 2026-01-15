'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Vehicles, VehicleStatus, VehicleTypeEnum } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import * as z from 'zod'
import { format } from 'date-fns'
import { useAuthStore } from '@/store/auth.store'

/* =======================
   Labels UI
======================= */
const FIELD_LABELS: Record<string, string> = {
  plateNumber: 'Placa principal',
  plateNumber2: 'Placa secundaria',
  model: 'Modelo',
  brand: 'Marca',
  code: 'Código interno',
  name: 'Nombre',
  policyNumber: 'Número de póliza',
  capacity: 'Capacidad',
  kms: 'Kilometraje',
}

/* =======================
   Enums traducidos
======================= */
const VEHICLE_TYPE_LABELS: Record<VehicleTypeEnum, string> = {
  [VehicleTypeEnum.CAMIONETA]: 'Camioneta',
  [VehicleTypeEnum.CAMION]: 'Camión',
  [VehicleTypeEnum.MOTO]: 'Motocicleta',
}

const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  [VehicleStatus.ACTIVO]: 'Activo',
  [VehicleStatus.INACTIVO]: 'Inactivo',
  [VehicleStatus.MANTENIMIENTO]: 'En mantenimiento',
}

/* =======================
   Schema
======================= */
const stringField = (message: string) =>
  z.string({ required_error: message }).min(1, message)

export const vehicleSchema = z.object({
  plateNumber: stringField('La placa principal es requerida').regex(
    /^[A-Z0-9]{1,3}-[A-Z0-9]{1,5}$/,
    'Formato de placa inválido'
  ),
  plateNumber2: z
    .string()
    .regex(/^[A-Z0-9]{1,3}-[A-Z0-9]{1,5}$/, 'Formato de placa inválido')
    .optional(),
  model: stringField('El modelo es requerido'),
  brand: stringField('La marca es requerida'),
  policyNumber: stringField('El número de póliza es requerido'),
  code: stringField('El código es requerido').regex(
    /^[A-Z0-9]{1,3}-[A-Z0-9]{1,3}$/,
    'Formato de código inválido'
  ),
  name: z.string().optional(),
  capacity: z.number({ required_error: 'La capacidad es requerida' }).min(1),
  type: z.nativeEnum(VehicleTypeEnum),
  status: z.nativeEnum(VehicleStatus),
  kms: z.number().min(0).optional(),
  policyExpirationDate: z.union([z.date(), z.null()]).optional(),
  lastMaintenance: z.union([z.date(), z.null()]).optional(),
  nextMaintenance: z.union([z.date(), z.null()]).optional(),
  subsidiary: z.object({ id: z.string(), name: z.string().optional() }).optional(),
})

type VehicleFormProps = {
  defaultValues?: Partial<Vehicles>
  subsidiary?: { id: string; name: string }
  onSubmit: (values: Vehicles) => void
}

export function VehicleForm({
  defaultValues,
  subsidiary,
  onSubmit,
}: VehicleFormProps) {
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
      type: defaultValues?.type,
      status: defaultValues?.status,
      policyNumber: defaultValues?.policyNumber ?? '',
      policyExpirationDate: defaultValues?.policyExpirationDate
        ? new Date(defaultValues.policyExpirationDate)
        : null,
      lastMaintenance: defaultValues?.lastMaintenance
        ? new Date(defaultValues.lastMaintenance)
        : null,
      nextMaintenance: defaultValues?.nextMaintenance
        ? new Date(defaultValues.nextMaintenance)
        : null,
      subsidiary: subsidiary || user?.subsidiary,
    },
  })

  const { setValue, watch } = form
  const effectiveSubsidiary = watch('subsidiary')

  useEffect(() => {
    setValue(
      'subsidiary',
      subsidiary || user?.subsidiary || defaultValues?.subsidiary
    )
  }, [subsidiary, user, defaultValues, setValue])

  const handleSubmit = (values: z.infer<typeof vehicleSchema>) => {
    onSubmit({
      ...values,
      lastMaintenance: values.lastMaintenance
        ? new Date(values.lastMaintenance).toISOString()
        : null,
      nextMaintenance: values.nextMaintenance
        ? new Date(values.nextMaintenance).toISOString()
        : null,
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* Inputs texto */}
        {[
          'plateNumber',
          'plateNumber2',
          'model',
          'brand',
          'code',
          'name',
          'policyNumber',
        ].map((name) => (
          <FormField
            key={name}
            control={form.control}
            name={name as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{FIELD_LABELS[name]}</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        {/* Números */}
        {['capacity', 'kms'].map((name) => (
          <FormField
            key={name}
            control={form.control}
            name={name as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{FIELD_LABELS[name]}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    value={field.value ?? 0}
                    onChange={(e) =>
                      field.onChange(Number(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        {/* Tipo */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de vehículo</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(VehicleTypeEnum).map((t) => (
                    <SelectItem key={t} value={t}>
                      {VEHICLE_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <FormLabel>Estatus del vehículo</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estatus" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(VehicleStatus).map((s) => (
                    <SelectItem key={s} value={s}>
                      {VEHICLE_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Fechas */}
        {[
          { key: 'policyExpirationDate', label: 'Vencimiento de póliza' },
          { key: 'lastMaintenance', label: 'Último mantenimiento' },
          { key: 'nextMaintenance', label: 'Siguiente mantenimiento' },
        ].map(({ key, label }) => (
          <FormField
            key={key}
            control={form.control}
            name={key as any}
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{label}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className="justify-start"
                      >
                        {field.value
                          ? format(field.value, 'dd/MM/yyyy')
                          : 'Selecciona una fecha'}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="p-0">
                    <Calendar
                      mode="single"
                      selected={field.value ?? undefined}
                      onSelect={(date) =>
                        field.onChange(date ?? null)
                      }
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
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
          <Button type="submit">Guardar vehículo</Button>
        </div>
      </form>
    </Form>
  )
}
