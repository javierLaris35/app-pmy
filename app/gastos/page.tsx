"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { FileSpreadsheet, FileUp, Plus, Upload } from "lucide-react"
import { addGasto, updateGasto, getCategorias } from "@/lib/data"
import type { Expense, ExpenseCategory } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"
import { AppLayout } from "@/components/app-layout"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "@radix-ui/react-icons"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar, Calendar as CalendarComponent } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import * as XLSX from "xlsx"
import { DataTable } from "@/components/data-table/data-table"
import {
  createSelectColumn,
  createSortableColumn,
  createViewColumn,
} from "@/components/data-table/columns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useExpenses, useSaveExpense } from "@/hooks/services/expenses/use-expenses"
import { categoriasGasto } from "@/lib/data"  // tu lista de categorías
import { toast } from "sonner"
import { withAuth } from "@/hoc/withAuth";


// Métodos de pago disponibles
const metodosPago = ["Efectivo", "Tarjeta de Crédito", "Tarjeta de Débito", "Transferencia", "Cheque", "Otro"]

// Función para obtener el color de la categoría
const getCategoryColor = (categoryName: string): string => {
  const colorMap: Record<string, string> = {
    Nómina: "bg-green-500",
    Renta: "bg-blue-500",
    Recarga: "bg-purple-500",
    Peajes: "bg-orange-500",
    Servicios: "bg-cyan-500",
    Combustible: "bg-red-500",
    "Otros gastos": "bg-gray-500",
    Mantenimiento: "bg-yellow-500",
    Impuestos: "bg-amber-500",
    Seguros: "bg-violet-500",
  }

  return colorMap[categoryName] || "bg-gray-500"
}

function GastosPage() {
  const [selectedSucursalId, setSelectedSucursalId] = useState<string>("")
  const [gastos, setGastos] = useState<Expense[]>([])
  const [categorias, setCategorias] = useState<ExpenseCategory[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingGasto, setEditingGasto] = useState<Expense | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Formulario
  const [fecha, setFecha] = useState<Date | undefined>(new Date())
  const [categoriaId, setCategoriaId] = useState("")
  const [monto, setMonto] = useState(0)
  const [descripcion, setDescripcion] = useState("")
  const [metodoPago, setMetodoPago] = useState("Efectivo")
  const [responsable, setResponsable] = useState("")
  const [notas, setNotas] = useState("")
  const [comprobante, setComprobante] = useState<File | null>(null)
  const { expenses, isLoading, isError, mutate } = useExpenses(selectedSucursalId)
  const { save, isSaving, isError: isSaveError } = useSaveExpense();


  useEffect(() => {
    const loadCategorias = async () => {
      const res = await getCategorias()
      setCategorias(res || [])
    }
    loadCategorias()
  }, [])

  const resetForm = () => {
    setEditingGasto(null)
    setFecha(new Date())
    setCategoriaId("")
    setMonto(0)
    setDescripcion("")
    setMetodoPago("Efectivo")
    setResponsable("")
    setNotas("")
    setComprobante(null)
  }

  const openNewGastoDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditGastoDialog = (gasto: Expense) => {
    const selectedCategoria = categorias.find((c) => c.name === gasto.category)

    setEditingGasto(gasto)
    setFecha(new Date(gasto.date))
    setCategoriaId(gasto.category)
    setMonto(gasto.amount)
    setDescripcion(gasto.description || "")
    setMetodoPago(gasto.paymentMethod || "Efectivo")
    setResponsable(gasto.responsible || "")
    setNotas(gasto.notes || "")
    setComprobante(null)
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!fecha) {
      alert("Por favor selecciona una fecha válida")
      return
    }

    const selectedCategoria = categorias.find((c) => c.id === categoriaId)

    if (!selectedCategoria) {
      alert("Por favor selecciona una categoría válida")
      return
    }

    const payload: Expense = {
      subsidiaryId: selectedSucursalId,
      date: fecha,
      category: categoriaId, // nombre de la categoría directamente
      amount: monto,
      description: descripcion,
      paymentMethod: metodoPago,
      responsible: responsable,
      notes: notas,
    };


    save(payload)
    setIsDialogOpen(false)
    mutate()
    toast.success("Se registrado con éxito el nuevo gasto.")
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setComprobante(e.target.files[0])
    }
  }

  const handleExportExcel = () => {
    const dataToExport = gastos.map((gasto) => ({
      Fecha: format(new Date(gasto.date), "dd/MM/yyyy"),
      Categoría: gasto.categoryName,
      Descripción: gasto.description,
      Monto: gasto.amount,
      "Método de Pago": gasto.paymentMethod || "No especificado",
      Responsable: gasto.responsible || "No especificado",
      Notas: gasto.notes || "",
    }))

    const ws = XLSX.utils.json_to_sheet(dataToExport)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Gastos")
    XLSX.writeFile(wb, "Gastos.xlsx")
  }

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const reader = new FileReader()

    reader.onload = (e) => {
      const data = e.target?.result
      if (!data) return

      try {
        const workbook = XLSX.read(data, { type: "binary" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        // Procesar los datos importados
        jsonData.forEach((row: any) => {
          // Buscar la categoría por nombre
          const categoria = categorias.find((c) => c.name.toLowerCase() === (row["Categoría"] || "").toLowerCase())

          if (!categoria) {
            console.error(`Categoría no encontrada: ${row["Categoría"]}`)
            return
          }

          // Convertir fecha de formato DD/MM/YYYY a objeto Date
          let fecha: Date
          try {
            const parts = row["Fecha"].split("/")
            fecha = new Date(Number.parseInt(parts[2]), Number.parseInt(parts[1]) - 1, Number.parseInt(parts[0]))
          } catch (error) {
            fecha = new Date()
          }

          // Añadir el gasto
          addGasto({
            sucursalId: selectedSucursalId,
            fecha,
            categoriaId: categoria.id,
            categoriaNombre: categoria.name,
            monto: Number.parseFloat(row["Monto"]) || 0,
            descripcion: row["Descripción"] || "",
            metodoPago: row["Método de Pago"] || "Efectivo",
            responsable: row["Responsable"] || "",
            notas: row["Notas"] || "",
          })
        })

        // Recargar los gastos
        loadGastos()

        // Limpiar el input de archivo
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      } catch (error) {
        console.error("Error al procesar el archivo Excel:", error)
        alert("Error al procesar el archivo Excel. Asegúrate de que el formato sea correcto.")
      }
    }

    reader.readAsBinaryString(file)
  }

  const columns = [
    createSelectColumn<Expense>(),
    createSortableColumn<Expense>(
      "fecha",
      "Fecha",
      (row) => row.date,
      (value) => format(new Date(value), "dd/MM/yyyy", { locale: es }),
    ),
    createSortableColumn<Expense>(
      "category",
      "Categoría",
      // ahora simplemente devolvemos el string
      row => row.category ?? "",
      // y lo renderizamos con el mismo badge/dot
      value => {
        // opcional: si quieres información extra (p.ej. descripción), la puedes
        // buscar en `categoriasGasto`:
        const cat = categoriasGasto.find(c => c.name === value)
        return (
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getCategoryColor(value)}`}></div>
            <div className="flex flex-col">
              <span>{value || "Sin categoría"}</span>
              {cat && (
                <span className="text-xs text-gray-500">{cat.description}</span>
              )}
            </div>
          </div>
        )
      }
    ),
    createSortableColumn<Expense>("descripcion", "Descripción", (row) => row.description || "-"),
    createSortableColumn<Expense>(
      "monto",
      "Monto",
      (row) => row.amount,
      (value) => <span className="font-medium">{formatCurrency(value)}</span>,
    ),
    createSortableColumn<Expense>("metodoPago", "Método de Pago", (row) => row.paymentMethod || "No especificado"),
    createSortableColumn<Expense>("responsable", "Responsable", (row) => row.responsible || "No especificado"),
    createViewColumn<Expense>((data) => console.log("Ver detalles", data)),
  ]

  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Gestión de Gastos</h2>
            <p className="text-muted-foreground">Administra los gastos diarios por sucursal</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-[250px]">
              <SucursalSelector value={selectedSucursalId} onValueChange={setSelectedSucursalId} />
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Gastos</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={!selectedSucursalId || gastos.length === 0}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImportExcel}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!selectedSucursalId}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Importar Excel
                </Button>
              </div>
              <Button size="sm" onClick={openNewGastoDialog} disabled={!selectedSucursalId}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Gasto
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedSucursalId ? (
              <DataTable columns={columns} data={expenses} />
            ) : (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-muted-foreground">Selecciona una sucursal para ver los gastos</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingGasto ? "Editar Gasto" : "Registrar Nuevo Gasto"}</DialogTitle>
            <DialogDescription>Complete el formulario para registrar un nuevo gasto operativo</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="categoria" className="font-medium">
                  Categoría <span className="text-destructive">*</span>
                </Label>
                <Select value={categoriaId} onValueChange={setCategoriaId} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((categoria) => (
                      <SelectItem key={categoria.id} value={categoria.id}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getCategoryColor(categoria.name)}`}></div>
                          <span>{categoria.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="font-medium">
                  Fecha <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[240px] pl-3 text-left font-normal",
                          !fecha && "text-muted-foreground"
                        )}
                      >
                        {fecha ? (
                          format(fecha, "dd/MM/yyyy")
                        ) : (
                          <span>Seleccione un fecha</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fecha}
                      onSelect={setFecha}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      captionLayout="dropdown"
                    />
                  </PopoverContent>
                </Popover>
                {/*<Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !fecha && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fecha ? format(fecha, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent mode="single" selected={fecha} onSelect={setFecha} initialFocus />
                  </PopoverContent>
                </Popover>*/}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion" className="font-medium">
                Descripción <span className="text-destructive">*</span>
              </Label>
              <Input
                id="descripcion"
                placeholder="Descripción del gasto"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="monto" className="font-medium">
                  Monto (MXN) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="monto"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={monto}
                  onChange={(e) => setMonto(Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="metodoPago" className="font-medium">
                  Método de Pago <span className="text-destructive">*</span>
                </Label>
                <Select value={metodoPago} onValueChange={setMetodoPago} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un método de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    {metodosPago.map((metodo) => (
                      <SelectItem key={metodo} value={metodo}>
                        {metodo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsable" className="font-medium">
                Responsable
              </Label>
              <Input
                id="responsable"
                placeholder="Nombre del responsable (opcional)"
                value={responsable}
                onChange={(e) => setResponsable(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comprobante" className="font-medium">
                Comprobante (opcional)
              </Label>
              <div className="flex items-center gap-2">
                <Input id="comprobante" type="file" className="hidden" onChange={handleFileChange} />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => document.getElementById("comprobante")?.click()}
                >
                  <FileUp className="mr-2 h-4 w-4" />
                  {comprobante ? comprobante.name : "Elegir archivo"}
                </Button>
                {comprobante && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => setComprobante(null)}>
                    <span className="sr-only">Eliminar</span>×
                  </Button>
                )}
              </div>
              {!comprobante && <p className="text-sm text-muted-foreground">No se ha seleccionado ningún archivo</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas" className="font-medium">
                Notas adicionales
              </Label>
              <Textarea
                id="notas"
                placeholder="Información adicional sobre el gasto (opcional)"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={4}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!selectedSucursalId}>
                {editingGasto ? "Actualizar Gasto" : "Registrar Gasto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

export default withAuth(GastosPage, "finanzas.gastos")