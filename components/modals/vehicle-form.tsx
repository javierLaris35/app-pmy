'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  VehicleStatus,
  VehicleTypeEnum,
  type Vehicles,
} from '@/lib/types'
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
import { format } from 'date-fns'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CalendarIcon } from 'lucide-react'
import * as z from 'zod'
import { useAuthStore } from '@/store/auth.store'

const stringField = (message: string) =>
  z.string({
    required_error: message,
    invalid_type_error: message,
  }).min(1, message);

export const vehicleSchema = z.object({
  plateNumber: stringField("Número de placa es requerido")
    .regex(/^[A-Z0-9]{1,3}-[A-Z0-9]{1,3}$/, "Formato de placa inválido"),
  model: stringField("Modelo es requerido"),
  brand: stringField("Marca es requerida"),
  name: z
    .string()
    .transform((val) => val?.trim() || undefined)
    .refine((val) => val === undefined || val.length > 0, {
      message: 'Nombre inválido',
    })
    .optional(),
  code: stringField("Código es requerido")
    .regex(/^[A-Z0-9]{1,3}-[A-Z0-9]{1,3}$/, "Formato de código inválido"),
  capacity: z
    .number({ required_error: "Capacidad es requerida" })
    .min(1, "Capacidad debe ser mayor a 0"),
  type: z.nativeEnum(VehicleTypeEnum, {
    errorMap: () => ({ message: "Tipo de vehículo inválido" }),
  }),
  status: z.nativeEnum(VehicleStatus, {
    errorMap: () => ({ message: "Estado de vehículo inválido" }),
  }),
  kms: z
    .number({
      invalid_type_error: "Kilometraje inválido",
    })
    .min(0, "Kilometraje debe ser mayor o igual a 0")
    .optional(),
  lastMaintenance: z
    .union([z.date(), z.string().datetime(), z.null()])
    .optional(),
  nextMaintenance: z
    .union([z.date(), z.string().datetime(), z.null()])
    .optional(),
  subsidiary: z.object({
    id: z.string({
      required_error: "ID de sucursal es requerido",
      invalid_type_error: "ID de sucursal inválido",
    }),
    name: z.string().optional(),
  }).optional(),
  subsidiaryId: z.string({
    required_error: "Sucursal es requerida",
    invalid_type_error: "Sucursal inválida",
  }),
});

type VehicleFormProps = {
  defaultValues?: Partial<Vehicles>
  onSubmit: (values: Vehicles) => void
}

export function VehicleForm({ defaultValues, onSubmit }: VehicleFormProps) {
  const user = useAuthStore((s) => s.user)

  const form = useForm<z.infer<typeof vehicleSchema>>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plateNumber: '',
      model: '',
      brand: '',
      name: '',
      code: '',
      capacity: undefined,
      type: undefined,
      status: undefined,
      kms: undefined,
      lastMaintenance: undefined,
      nextMaintenance: undefined,
      subsidiary: user?.subsidiary,
      subsidiaryId: user?.subsidiary?.id,
      ...defaultValues,
      lastMaintenance: defaultValues?.lastMaintenance
        ? new Date(defaultValues.lastMaintenance)
        : undefined,
      nextMaintenance: defaultValues?.nextMaintenance
        ? new Date(defaultValues.nextMaintenance)
        : undefined,
      kms: defaultValues?.kms ? Number(defaultValues.kms) : undefined,
    },
  })

  useEffect(() => {
    form.reset({
      plateNumber: '',
      model: '',
      brand: '',
      name: '',
      code: '',
      capacity: undefined,
      type: undefined,
      status: undefined,
      kms: undefined,
      lastMaintenance: undefined,
      nextMaintenance: undefined,
      subsidiary: user?.subsidiary,
      subsidiaryId: user?.subsidiary?.id,
      ...defaultValues,
      lastMaintenance: defaultValues?.lastMaintenance
        ? new Date(defaultValues.lastMaintenance)
        : undefined,
      nextMaintenance: defaultValues?.nextMaintenance
        ? new Date(defaultValues.nextMaintenance)
        : undefined,
      kms: defaultValues?.kms ? Number(defaultValues.kms) : undefined,
    });
  }, [defaultValues, user, form]);

  const handleSubmit = (values: z.infer<typeof vehicleSchema>) => {
    console.log('Valores enviados:', values);
    console.log('Errores de validación:', form.formState.errors);
    const transformedValues = {
      ...values,
      lastMaintenance: values.lastMaintenance
        ? new Date(values.lastMaintenance).toISOString()
        : null,
      nextMaintenance: values.nextMaintenance
        ? new Date(values.nextMaintenance).toISOString()
        : null,
    };
    onSubmit(transformedValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Número de Placa */}
        <FormField
          control={form.control}
          name="plateNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Placa</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  maxLength={7}
                  onChange={(e) => {
                    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                    if (value.length > 3) {
                      value = `${value.slice(0, 3)}-${value.slice(3, 6)}`
                    }
                    field.onChange(value)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Modelo */}
        <FormField
          control={form.control}
          name="model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Modelo</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Marca */}
        <FormField
          control={form.control}
          name="brand"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Marca</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
              <FormLabel>Código</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  maxLength={7}
                  onChange={(e) => {
                    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
                    if (value.length > 3) {
                      value = `${value.slice(0, 3)}-${value.slice(3, 6)}`
                    }
                    field.onChange(value)
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Capacidad */}
        <FormField
          control={form.control}
          name="capacity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Capacidad</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tipo */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={VehicleTypeEnum.VAN}>Van</SelectItem>
                  <SelectItem value={VehicleTypeEnum.CAMIONETA}>Camioneta</SelectItem>
                  <SelectItem value={VehicleTypeEnum.CAJA_LARGA}>Caja Larga</SelectItem>
                  <SelectItem value={VehicleTypeEnum['3/4']}>3/4</SelectItem>
                  <SelectItem value={VehicleTypeEnum.RABON}>Rabon</SelectItem>
                  <SelectItem value={VehicleTypeEnum.URBAN}>Urban</SelectItem>
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
              <FormLabel>Estatus</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un estatus" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={VehicleStatus.ACTIVE}>Activo</SelectItem>
                  <SelectItem value={VehicleStatus.INACTIVE}>Inactivo</SelectItem>
                  <SelectItem value={VehicleStatus.MAINTENANCE}>Mantenimiento</SelectItem>
                  <SelectItem value={VehicleStatus.OUT_OF_SERVICE}>Fuera de Servicio</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Kilómetros */}
        <FormField
          control={form.control}
          name="kms"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Kilómetros</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  value={field.value ?? ''}
                  placeholder="Ej: 120000"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Último mantenimiento */}
        <FormField
          control={form.control}
          name="lastMaintenance"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Último mantenimiento</FormLabel>
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
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Siguiente mantenimiento */}
        <FormField
          control={form.control}
          name="nextMaintenance"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Siguiente mantenimiento</FormLabel>
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
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Sucursal ID (hidden) */}
        <FormField
          control={form.control}
          name="subsidiaryId"
          render={({ field }) => (
            <FormControl>
              <Input type="hidden" {...field} value={field.value ?? ''} />
            </FormControl>
          )}
        />

        {/* Sucursal visual */}
        {user?.subsidiary && (
          <div className="md:col-span-2">
            <FormLabel className="text-sm font-medium text-muted-foreground">Sucursal</FormLabel>
            <div className="border rounded-md px-3 py-2 text-sm bg-muted">
              {user.subsidiary.name}
            </div>
          </div>
        )}

        <div className="md:col-span-2 flex justify-end">
          <Button type="submit">Guardar</Button>
        </div>
      </form>
    </Form>
  )
}