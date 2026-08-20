"use client"

import { useState } from "react"
import { CalendarDays, Plus, Trash2, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "@/lib/toast"
import { useHolidays } from "@/hooks/services/holidays/use-holidays"
import { createHoliday, deleteHoliday } from "@/lib/services/holidays/holidays"
import type { Holiday } from "@/lib/types"

// Espejo (solo lectura) de la lista fija del Art. 74 LFT que vive en el backend
// (sunday-holiday.util.ts). Se muestra para que el usuario sepa qué YA está cubierto.
const FIXED_HOLIDAYS = [
  "Todos los domingos",
  "1 de enero — Año Nuevo",
  "1er lunes de febrero — Día de la Constitución",
  "3er lunes de marzo — Natalicio de Benito Juárez",
  "1 de mayo — Día del Trabajo",
  "16 de septiembre — Independencia",
  "3er lunes de noviembre — Revolución Mexicana",
  "25 de diciembre — Navidad",
]

function formatHolidayDate(h: Holiday): string {
  const [y, m, d] = String(h.date).slice(0, 10).split("-").map(Number)
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1))
  if (h.recurring) {
    return dt.toLocaleDateString("es-MX", { day: "2-digit", month: "long", timeZone: "UTC" })
  }
  return dt.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" })
}

export function HolidaysPanel() {
  const { holidays, isLoading, mutate } = useHolidays()

  const [name, setName] = useState("")
  const [date, setDate] = useState("")
  const [recurring, setRecurring] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleAdd = async () => {
    if (!name.trim()) return toast.error("Escribe un nombre para el día festivo")
    if (!date) return toast.error("Selecciona una fecha")

    setSaving(true)
    try {
      await createHoliday({ name: name.trim(), date, recurring })
      toast.success("Día festivo agregado")
      setName("")
      setDate("")
      setRecurring(false)
      mutate()
    } catch {
      toast.error("No se pudo agregar el día festivo")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteHoliday(id)
      toast.success("Día festivo eliminado")
      mutate()
    } catch {
      toast.error("No se pudo eliminar")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" /> Días festivos
          </CardTitle>
          <CardDescription>
            En domingos y días festivos las cargas F2 / 1.5 ton cobran el sobreprecio configurado por
            sucursal. Los feriados oficiales ya están incluidos; aquí puedes agregar días extra
            (puentes o festivos locales).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Lista fija (solo lectura) */}
          <div>
            <Label className="text-sm text-muted-foreground">Ya incluidos (oficiales, no editables)</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {FIXED_HOLIDAYS.map((h) => (
                <Badge key={h} variant="secondary" className="font-normal">
                  {h}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Alta de festivo adicional */}
          <div>
            <Label className="text-sm font-medium">Agregar día festivo</Label>
            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-[1fr_180px_auto_auto] md:items-end">
              <div className="grid gap-1.5">
                <Label htmlFor="holiday-name" className="text-xs text-muted-foreground">Nombre</Label>
                <Input
                  id="holiday-name"
                  placeholder="Ej. Feria de Sonora"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="holiday-date" className="text-xs text-muted-foreground">Fecha</Label>
                <Input
                  id="holiday-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch id="holiday-recurring" checked={recurring} onCheckedChange={setRecurring} />
                <Label htmlFor="holiday-recurring" className="text-xs text-muted-foreground">
                  Cada año
                </Label>
              </div>
              <Button onClick={handleAdd} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Agregar
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              "Cada año" repite el día por mes-día (ej. cada 10 de mayo). Sin marcar, aplica solo a esa
              fecha exacta (útil para puentes de un solo año).
            </p>
          </div>

          <Separator />

          {/* Lista de adicionales */}
          <div>
            <Label className="text-sm font-medium">Días festivos agregados</Label>
            <div className="mt-2 rounded-lg border">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
                </div>
              ) : !holidays || holidays.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Aún no hay días festivos adicionales.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Repetición</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holidays.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="font-medium">{h.name}</TableCell>
                        <TableCell>{formatHolidayDate(h)}</TableCell>
                        <TableCell>
                          <Badge variant={h.recurring ? "default" : "outline"} className="font-normal">
                            {h.recurring ? "Cada año" : "Fecha exacta"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Eliminar"
                                disabled={deletingId === h.id}
                              >
                                {deletingId === h.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Eliminar día festivo</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Eliminar "{h.name}" ({formatHolidayDate(h)})? Dejará de aplicar el
                                  sobreprecio en esa fecha.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(h.id)}>
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
