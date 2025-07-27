"use client"

import React, { useMemo, useState, useEffect } from "react"
import { SucursalSelector } from "@/components/sucursal-selector"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AppLayout } from "@/components/app-layout"
import { DataTable } from "@/components/data-table/data-table"
import { createSelectColumn, createSortableColumn } from "@/components/data-table/columns"
import { Card, CardContent } from "@/components/ui/card"
import { useIncomesByMonthAndSucursal } from "@/hooks/services/incomes/use-income"
import { formatCurrency } from "@/lib/utils"
import * as XLSX from "xlsx"
import { BarChart3, DollarSign, Truck } from "lucide-react"
import { ShipmentDetailDialog } from "@/components/modals/shipment-detial-dialog"
import { NewIncome } from "@/lib/types"
import { getLastWeekRange } from "@/utils/date.utils"
import { TrackingValidationButton } from "@/components/modals/tracking-validation-button"
import { withAuth } from "@/hoc/withAuth";

function IngresosPage() {
  const [selectedSucursalId, setSelectedSucursalId] = useState<string>("")
  const [{ fromDate, toDate }, setRange] = useState(getLastWeekRange())

  // Hook de consulta
  const { incomes, isLoading, isError, mutate } = useIncomesByMonthAndSucursal(
    selectedSucursalId,
    fromDate,
    toDate
  )

  // Actualizar datos cuando cambien filtros
  useEffect(() => {
    if (selectedSucursalId && fromDate && toDate) {
      mutate()
    }
  }, [selectedSucursalId, fromDate, toDate, mutate])

  // Convierte string con formato monetario a número
  const parseCurrency = (val: string | number) => {
    if (typeof val === "string") return parseFloat(val.replace(/[$,]/g, "")) || 0
    return val || 0
  }

  // Exportar a Excel
  const exportToExcel = () => {
    if (!incomes || incomes.length === 0) {
      alert("No hay datos para exportar")
      return
    }

    const wb = XLSX.utils.book_new()

    // Mapear ingresos con todas las columnas de la tabla
    const ingresosData = incomes.map((i) => ({
      Fecha: i.date,
      FedexPOD: Number(i.fedex?.pod) || 0,
      FedexDEX07: Number(i.fedex?.dex07) || 0,
      FedexDEX08: Number(i.fedex?.dex08) || 0,
      FedexTotal: Number(i.fedex?.total) || 0,
      IngresoFedex: parseCurrency(i.fedex?.totalIncome),
      DHLPOD: Number(i.dhl?.ba) || 0,
      DHLNE: Number(i.dhl?.ne) || 0,
      DHLTotal: Number(i.dhl?.total) || 0,
      IngresoDHL: parseCurrency(i.dhl?.totalIncome),
      Recolecciones: Number(i.collections) || 0,
      Cargas: Number(i.cargas) || 0,
      Total: Number(i.total) || 0,
      IngresoTotal: parseCurrency(i.totalIncome),
    }))

    // Calcular totales
    const totales = ingresosData.reduce(
      (acc, curr) => {
        acc.FedexPOD += curr.FedexPOD || 0
        acc.FedexDEX07 += curr.FedexDEX07 || 0
        acc.FedexDEX08 += curr.FedexDEX08 || 0
        acc.FedexTotal += curr.FedexTotal || 0
        acc.IngresoFedex += curr.IngresoFedex || 0
        acc.DHLPOD += curr.DHLPOD || 0
        acc.DHLNE += curr.DHLNE || 0
        acc.DHLTotal += curr.DHLTotal || 0
        acc.IngresoDHL += curr.IngresoDHL || 0
        acc.Recolecciones += curr.Recolecciones || 0
        acc.Cargas += curr.Cargas || 0
        acc.Total += curr.Total || 0
        acc.IngresoTotal += curr.IngresoTotal || 0
        return acc
      },
      {
        Fecha: "Totales",
        FedexPOD: 0,
        FedexDEX07: 0,
        FedexDEX08: 0,
        FedexTotal: 0,
        IngresoFedex: 0,
        DHLPOD: 0,
        DHLNE: 0,
        DHLTotal: 0,
        IngresoDHL: 0,
        Recolecciones: 0,
        Cargas: 0,
        Total: 0,
        IngresoTotal: 0,
      }
    )

    // Agregar totales a la hoja principal
    ingresosData.push(totales)

    const mainSheet = XLSX.utils.json_to_sheet(ingresosData)
    XLSX.utils.book_append_sheet(wb, mainSheet, "Ingresos")

    // Hoja de items por día con validación
    const itemsSheetData = incomes.flatMap((i) => {
      const fecha = i.date
      if (!i.items || !Array.isArray(i.items)) {
        console.warn(`No items found for date ${fecha}`);
        return []
      }

      return i.items
        .filter((item) => {
          // Validar que no haya nonDeliveryStatus = '03' (aunque ya filtrado en backend)
          if (item.shipmentType === 'fedex' && item.status === 'no_entregado') {
            console.warn(`Unexpected status 'no_entregado' for FedEx item ${item.trackingNumber} on ${fecha}`);
            return false
          }
          return true
        })
        .map((item) => ({
          Fecha: fecha,
          Tipo: item.type,
          TrackingNumber: item.trackingNumber,
          ShipmentType: item.shipmentType || '',
          Status: item.status || '',
          FechaItem: item.date,
          CommitDateTime: item.commitDateTime ? new Date(item.commitDateTime).toISOString() : '',
        }))
    })

    if (itemsSheetData.length > 0) {
      const itemsSheet = XLSX.utils.json_to_sheet(itemsSheetData)
      XLSX.utils.book_append_sheet(wb, itemsSheet, "Ingresos por día")
    } else {
      console.warn("No valid items data for Ingresos por día sheet")
    }

    // Guardar archivo
    XLSX.writeFile(wb, "ingresos.xlsx")
  }

  // Cálculos con useMemo
  const totalRegistros = incomes?.length || 0
  const totalCollections = useMemo(
    () => incomes?.reduce((acc, i) => acc + (Number(i.collections) || 0), 0) || 0,
    [incomes]
  )
  const totalFedex = useMemo(
    () => incomes?.reduce((acc, i) => acc + (Number(i.fedex?.total) || 0), 0) || 0,
    [incomes]
  )
  const totalFedexIncome = useMemo(
    () => incomes?.reduce((acc, i) => acc + parseCurrency(i.fedex?.totalIncome), 0) || 0,
    [incomes]
  )
  const totalFedexPOD = useMemo(
    () => incomes?.reduce((acc, i) => acc + (Number(i.fedex?.pod) || 0), 0) || 0,
    [incomes]
  )
  const totalFedexDEX07 = useMemo(
    () => incomes?.reduce((acc, i) => acc + (Number(i.fedex?.dex07) || 0), 0) || 0,
    [incomes]
  )
  const totalFedexDEX08 = useMemo(
    () => incomes?.reduce((acc, i) => acc + (Number(i.fedex?.dex08) || 0), 0) || 0,
    [incomes]
  )
  const totalDHL = useMemo(
    () => incomes?.reduce((acc, i) => acc + (Number(i.dhl?.total) || 0), 0) || 0,
    [incomes]
  )
  const totalDHLIncome = useMemo(
    () => incomes?.reduce((acc, i) => acc + parseCurrency(i.dhl?.totalIncome), 0) || 0,
    [incomes]
  )
  const totalDHLPOD = useMemo(
    () => incomes?.reduce((acc, i) => acc + (Number(i.dhl?.ba) || 0), 0) || 0,
    [incomes]
  )
  const totalDHLDEX = useMemo(
    () => incomes?.reduce((acc, i) => acc + (Number(i.dhl?.ne) || 0), 0) || 0,
    [incomes]
  )
  const totalIngreso = useMemo(
    () => incomes?.reduce((acc, i) => acc + parseCurrency(i.totalIncome), 0) || 0,
    [incomes]
  )
  const recoleccionesRatio = useMemo(() => {
    const total = incomes?.length || 1
    return ((totalCollections / total) * 100).toFixed(1)
  }, [incomes, totalCollections])

  // Columnas tabla
  const columns = [
    createSelectColumn<NewIncome>(),
    createSortableColumn<NewIncome>(
      "fecha",
      "Fecha",
      (row) => row.date ?? "-",
      (value) =>
        value && typeof value === "string"
          ? value.split("T")[0].split("-").reverse().join("/")
          : "-"
    ),
    {
      id: "fedexPod",
      header: "Fedex POD",
      cell: ({ row }) => Number(row.original.fedex?.pod) ?? "-",
      sortingFn: (a, b) => (Number(a.original.fedex?.pod) || 0) - (Number(b.original.fedex?.pod) || 0),
    },
    {
      id: "fedexDex07",
      header: "Fedex DEX07",
      cell: ({ row }) => Number(row.original.fedex?.dex07) ?? "-",
      sortingFn: (a, b) => (Number(a.original.fedex?.dex07) || 0) - (Number(b.original.fedex?.dex07) || 0),
    },
    {
      id: "fedexDex08",
      header: "Fedex DEX08",
      cell: ({ row }) => Number(row.original.fedex?.dex08) ?? "-",
      sortingFn: (a, b) => (Number(a.original.fedex?.dex08) || 0) - (Number(b.original.fedex?.dex08) || 0),
    },
    {
      id: "fedexTotal",
      header: "Fedex Total",
      cell: ({ row }) => Number(row.original.fedex?.total) ?? "-",
      sortingFn: (a, b) => (Number(a.original.fedex?.total) || 0) - (Number(b.original.fedex?.total) || 0),
    },
    {
      id: "fedexIncome",
      header: "Ingreso Fedex",
      cell: ({ row }) =>
        formatCurrency(parseCurrency(row.original.fedex?.totalIncome ?? "$0")),
      sortingFn: (a, b) =>
        parseCurrency(a.original.fedex?.totalIncome ?? "$0") - parseCurrency(b.original.fedex?.totalIncome ?? "$0"),
    },
    {
      id: "dhlPod",
      header: "DHL BA",
      cell: ({ row }) => Number(row.original.dhl?.ba) ?? "-",
      sortingFn: (a, b) => (Number(a.original.dhl?.ba) || 0) - (Number(b.original.dhl?.ba) || 0),
    },
    {
      id: "dhlDex",
      header: "DHL NE",
      cell: ({ row }) => Number(row.original.dhl?.ne) ?? "-",
      sortingFn: (a, b) => (Number(a.original.dhl?.ne) || 0) - (Number(b.original.dhl?.ne) || 0),
    },
    {
      id: "dhlTotal",
      header: "DHL Total",
      cell: ({ row }) => Number(row.original.dhl?.total) ?? "-",
      sortingFn: (a, b) => (Number(a.original.dhl?.total) || 0) - (Number(b.original.dhl?.total) || 0),
    },
    {
      id: "dhlIncome",
      header: "Ingreso DHL",
      cell: ({ row }) =>
        formatCurrency(parseCurrency(row.original.dhl?.totalIncome ?? "$0")),
      sortingFn: (a, b) =>
        parseCurrency(a.original.dhl?.totalIncome ?? "$0") - parseCurrency(b.original.dhl?.totalIncome ?? "$0"),
    },
    createSortableColumn<NewIncome>(
      "collections",
      "Recolecciones",
      (row) => Number(row.collections) || 0
    ),
    createSortableColumn<NewIncome>(
      "cargas",
      "Cargas",
      (row) => Number(row.cargas) || 0
    ),
    createSortableColumn<NewIncome>(
      "total",
      "Total",
      (row) => Number(row.total) || 0
    ),
    {
      id: "totalIncome",
      header: "Ingreso Total",
      cell: ({ row }) =>
        formatCurrency(parseCurrency(row.original.totalIncome ?? "$0")),
      sortingFn: (a, b) =>
        parseCurrency(a.original.totalIncome ?? "$0") - parseCurrency(b.original.totalIncome ?? "$0"),
    },
    {
      id: "detalles",
      header: "Detalles",
      cell: ({ row }) => <ShipmentDetailDialog row={row} />,
    },
  ]

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Gestión de Ingresos</h2>
            <p className="text-muted-foreground">Administra los ingresos diarios por sucursal</p>
          </div>
          <Button onClick={exportToExcel} disabled={isLoading || !incomes?.length}>
            Exportar Excel
          </Button>
          <TrackingValidationButton />
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="grid grid-cols-4 gap-4 items-end">
            <div>
              <Label htmlFor="sucursal">Sucursal</Label>
              <SucursalSelector
                value={selectedSucursalId}
                onValueChange={setSelectedSucursalId}
              />
            </div>
            <div>
              <Label htmlFor="fromDate">Desde</Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => setRange((r) => ({ ...r, fromDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="toDate">Hasta</Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => setRange((r) => ({ ...r, toDate: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Resumen */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="flex items-center gap-2 p-4">
            <Truck className="h-6 w-6 text-blue-600" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Recolecciones</p>
              <p className="text-sm font-semibold">{totalCollections}</p>
            </div>
          </Card>

          <Card className="flex items-center gap-2 p-4">
            <DollarSign className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Ingreso/Recolección</p>
              <p className="text-sm font-semibold">
                {formatCurrency(totalCollections ? totalIngreso / totalCollections : 0)}
              </p>
            </div>
          </Card>

          <Card className="flex items-center gap-2 p-4">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total de Cargas</p>
              <p className="text-sm font-semibold">
                {incomes?.reduce((acc, i) => acc + (Number(i.cargas) || 0), 0) || 0}
              </p>
            </div>
          </Card>

          <Card className="flex items-center gap-2 p-4">
            <BarChart3 className="h-6 w-6 text-fuchsia-600" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Ingreso Prom. Diario</p>
              <p className="text-sm font-semibold">
                {formatCurrency(
                  (() => {
                    const days =
                      (new Date(toDate).getTime() - new Date(fromDate).getTime()) /
                        (1000 * 60 * 60 * 24) +
                      1
                    return totalIngreso / days
                  })()
                )}
              </p>
            </div>
          </Card>

          <Card className="flex items-center gap-2 p-4">
            <BarChart3 className="h-6 w-6 text-rose-600" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Ingreso por Envío</p>
              <p className="text-sm font-semibold">
                {formatCurrency(
                  (totalFedexPOD + totalFedexDEX07 + totalFedexDEX08 + totalDHLPOD + totalDHLDEX) > 0
                    ? totalIngreso / (totalFedexPOD + totalFedexDEX07 + totalFedexDEX08 + totalDHLPOD + totalDHLDEX)
                    : 0
                )}
              </p>
            </div>
          </Card>

          <Card className="flex items-center gap-2 p-4">
            <Truck className="h-6 w-6 text-cyan-600" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">% FedEx / DHL</p>
              <p className="text-sm font-semibold">
                {(() => {
                  const totalEnvios = totalFedex + totalDHL
                  const fedexPct = totalEnvios ? (totalFedex / totalEnvios) * 100 : 0
                  const dhlPct = 100 - fedexPct
                  return `FedEx ${fedexPct.toFixed(1)}% / DHL ${dhlPct.toFixed(1)}%`
                })()}
              </p>
            </div>
          </Card>

          <Card className="flex items-center gap-2 p-4">
            <DollarSign className="h-6 w-6 text-emerald-600" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Ingresos FedEx vs DHL</p>
              <p className="text-sm font-semibold">
                {`FedEx ${formatCurrency(totalFedexIncome || 0)} / DHL ${formatCurrency(totalDHLIncome || 0)}`}
              </p>
            </div>
          </Card>

          <Card className="flex items-center gap-2 p-4">
            <DollarSign className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Ingreso a facturar</p>
              <p className="text-sm font-semibold">
                {formatCurrency(totalIngreso || 0)}
              </p>
            </div>
          </Card>
        </div>

        {/* Tabla */}
        <DataTable columns={columns} data={incomes || []} />
      </div>
    </AppLayout>
  )
}

export default withAuth(IngresosPage, "ingresos");