"use client"

import type React from "react"
import { useState } from "react"
import { SucursalSelector } from "@/components/sucursal-selector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { addIngreso, updateIngreso } from "@/lib/data"
import type { RouteIncome } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { AppLayout } from "@/components/app-layout"
import { DataTable } from "@/components/data-table/data-table"
import {
  createSelectColumn,
  createSortableColumn,
  createViewColumn,
} from "@/components/data-table/columns"

import { Card, CardContent } from "@/components/ui/card"
import { useIncomes } from "@/hooks/services/incomes/use-income"
import { DateRange } from "react-day-picker"
import { DateRangePicker } from "@/components/date-range-picker" 

export default function IngresosPage() {
  const [selectedSucursalId, setSelectedSucursalId] = useState<string>("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingIngreso, setEditingIngreso] = useState<RouteIncome | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(),
    to: new Date(),
  })

  const { incomes, isLoading, isError, mutate } = useIncomes(
    selectedSucursalId,
    dateRange?.from && dateRange?.to ? { from: dateRange.from, to: dateRange.to } : undefined
  )

  // Form state
  const [fecha, setFecha] = useState("")
  const [ok, setOk] = useState(0)
  const [ba, setBa] = useState(0)
  const [recolecciones, setRecolecciones] = useState(0)

  const resetForm = () => {
    setEditingIngreso(null)
    setFecha(new Date().toISOString().split("T")[0])
    setOk(0)
    setBa(0)
    setRecolecciones(0)
  }

  const openNewIngresoDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditIngresoDialog = (ingreso: RouteIncome) => {
    setEditingIngreso(ingreso)
    setFecha(new Date(ingreso.date).toISOString().split("T")[0])
    setOk(ingreso.ok)
    setBa(ingreso.ba)
    setRecolecciones(ingreso.collections)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const total = ok + ba + recolecciones
    const totalIngresos = ok * 45

    try {
      if (editingIngreso) {
        await updateIngreso(editingIngreso.id, {
          fecha: new Date(fecha),
          ok,
          ba,
          recolecciones,
          total,
          totalIngresos,
        })
      } else {
        await addIngreso({
          sucursalId: selectedSucursalId,
          fecha: new Date(fecha),
          ok,
          ba,
          recolecciones,
          total,
          totalIngresos,
        })
      }
      setIsDialogOpen(false)
      resetForm()
      mutate() // Refresh the data
    } catch (error) {
      console.error("Error saving income:", error)
    }
  }

  const columns = [
    createSelectColumn<RouteIncome>(),
    createSortableColumn<RouteIncome>(
      "fecha",
      "Fecha",
      (row) => row.date,
      (value) => new Date(value).toLocaleDateString("es-MX"),
    ),
    createSortableColumn<RouteIncome>("ok", "OK", (row) => row.ok),
    createSortableColumn<RouteIncome>("ba", "BA", (row) => row.ba),
    createSortableColumn<RouteIncome>("ne", "NE", (row) => row.ne),
    createSortableColumn<RouteIncome>("recolecciones", "Recolecciones", (row) => row.collections),
    createSortableColumn<RouteIncome>("total", "Total", (row) => row.total),
    createSortableColumn<RouteIncome>(
      "totalIngresos",
      "Total Ingresos",
      (row) => row.totalIncome,
    ),
    createViewColumn<RouteIncome>((data) => console.log("Ver detalles", data)),
  ]

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Gestión de Ingresos</h2>
            <p className="text-muted-foreground">Administra los ingresos diarios por sucursal</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-[250px]">
              <SucursalSelector
                value={selectedSucursalId}
                onValueChange={setSelectedSucursalId}
              />
            </div>
            <DateRangePicker
              date={dateRange}
              setDate={setDateRange}
            />
            <Button onClick={openNewIngresoDialog} disabled={!selectedSucursalId}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Ingreso
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-muted-foreground">Cargando ingresos...</p>
              </div>
            ) : isError ? (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-destructive">Error al cargar los ingresos</p>
              </div>
            ) : selectedSucursalId ? (
              <DataTable
                columns={columns}
                data={incomes || []} // Use incomes from useIncomes
                filterPlaceholder="Filtrar ingresos..."
              />
            ) : (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-muted-foreground">Selecciona una sucursal para ver los ingresos</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingIngreso ? "Editar Ingreso" : "Nuevo Ingreso"}</DialogTitle>
            <DialogDescription>Ingresa los datos del registro de ingresos</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ok">OK</Label>
                  <Input
                    id="ok"
                    type="number"
                    min="0"
                    value={ok}
                    onChange={(e) => setOk(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ba">BA</Label>
                  <Input
                    id="ba"
                    type="number"
                    min="0"
                    value={ba}
                    onChange={(e) => setBa(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="recolecciones">Recolecciones</Label>
                  <Input
                    id="recolecciones"
                    type="number"
                    min="0"
                    value={recolecciones}
                    onChange={(e) => setRecolecciones(Number(e.target.value))}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Total</Label>
                <div className="rounded-md border border-input bg-muted px-3 py-2">
                  {ok + ba + recolecciones}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Total Ingresos</Label>
                <div className="rounded-md border border-input bg-muted px-3 py-2">
                  {formatCurrency(ok * 45)}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">{editingIngreso ? "Actualizar" : "Guardar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}