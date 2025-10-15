"use client"

import { useEffect, useState, useCallback } from "react"
import { Search, Package, Edit, ArrowRight, Loader2, Truck, Circle } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { SearchShipmentDto, Priority } from "@/lib/types"
import { searchPackageInfo } from "@/lib/services/shipments"

type SearchType = "shipment" | "chargeshipment"

interface SearchResult {
  id: string
  type: SearchType
  title: string
  subtitle?: string
  metadata?: string
  priority?: Priority
  commitDateTime?: string
  paymentAmount?: number
  address?: string
  phone?: string
  zipCode?: string
  subsidiary?: string
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Convertir fecha UTC a Hermosillo
  const formatHermisilloDate = (utcDate?: string) => {
    if (!utcDate) return ""
    const date = new Date(utcDate)
    return new Intl.DateTimeFormat("es-MX", {
      timeZone: "America/Hermosillo",
      dateStyle: "short",
      timeStyle: "short",
    }).format(date)
  }

  // Validar si la fecha es hoy en Hermosillo
  const isToday = (utcDate?: string) => {
    if (!utcDate) return false
    const now = new Date()
    const hermosilloDate = new Date(
      new Date(utcDate).toLocaleString("en-US", { timeZone: "America/Hermosillo" })
    )
    return (
      hermosilloDate.getFullYear() === now.getFullYear() &&
      hermosilloDate.getMonth() === now.getMonth() &&
      hermosilloDate.getDate() === now.getDate()
    )
  }

  const priorityBadge = (priority?: Priority) => {
    switch (priority) {
      case Priority.BAJA:
        return { color: "bg-green-50 text-green-800", icon: "green" }
      case Priority.MEDIA:
        return { color: "bg-orange-50 text-orange-800", icon: "orange" }
      case Priority.ALTA:
        return { color: "bg-red-50 text-red-800", icon: "red" }
      default:
        return { color: "bg-gray-50 text-gray-800", icon: "gray" }
    }
  }

  // Debounce de búsqueda
  useEffect(() => {
    if (!search || search.trim().length < 10) {
      setResults([])
      setError(null)
      return
    }

    const timeout = setTimeout(async () => {
      try {
        setLoading(true)
        setError(null)

        const data: SearchShipmentDto = await searchPackageInfo(search.trim())

        // ✅ Mapeamos correctamente al SearchResult
        const parsed: SearchResult[] = [
          {
            id: data.trackingNumber,
            type: "shipment",
            title: `Guía: ${data.trackingNumber}`,
            subtitle: data.route
              ? `Conductor: ${data.route.driver.name} | Ruta: ${data.route.trackingNumber}`
              : "Actualmente en bodega",
            metadata: data.status,
            priority: data.prority,
            commitDateTime: data.commitDateTime,
            paymentAmount: data.payment?.amount,
            address: data.recipient.address,
            phone: data.recipient.phoneNumber,
            zipCode: data.recipient.zipCode,
            subsidiary: data.subsidiary,
          },
        ]

        setResults(parsed)
      } catch (err) {
        console.error(err)
        setError("No se encontraron resultados o ocurrió un error.")
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 800)

    return () => clearTimeout(timeout)
  }, [search])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault()
        handleSelect(results[selectedIndex])
      }
    },
    [results, selectedIndex]
  )

  const handleSelect = (result: SearchResult) => {
    console.log("Selected:", result)
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-110 hover:shadow-xl"
        aria-label="Abrir búsqueda"
      >
        <Search className="h-6 w-6" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0">
          <DialogHeader className="px-4 pt-4 pb-0">
            <DialogTitle className="sr-only">Search Command Palette</DialogTitle>
            <DialogDescription className="sr-only">Búsqueda de paquetes</DialogDescription>
          </DialogHeader>

          {/* Input */}
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setSelectedIndex(0)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Buscar por tracking number..."
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12"
            />
          </div>

          {/* Resultados */}
          <div className="max-h-[400px] overflow-y-auto p-2">
            {loading ? (
              <div className="py-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Buscando...
              </div>
            ) : error ? (
              <div className="py-12 text-center text-sm text-destructive">{error}</div>
            ) : results.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Escribe al menos 10 caracteres para buscar...
              </div>
            ) : (
              <div className="space-y-2">
                {results.map((result, index) => {
                  const prio = priorityBadge(result.priority)

                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={cn(
                        "w-full flex items-start gap-3 px-3 py-3 rounded-md text-left transition-colors",
                        index === selectedIndex ? "bg-accent text-accent-foreground" : "bg-white",
                      )}
                    >
                      <div
                        className={cn(
                          "p-2 rounded-md",
                          result.metadata === "En ruta"
                            ? "bg-green-200 text-green-800"
                            : "bg-gray-200 text-gray-800",
                        )}
                      >
                        {result.metadata === "En ruta" ? <Truck className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{result.title}</span>

                          {/* Prioridad */}
                          {result.priority && (
                            <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold", prio.color)}>
                              <Circle
                                className={`h-2 w-2 ${
                                  prio.icon === "green" ? "text-green-600" : prio.icon === "orange" ? "text-orange-600" : "text-red-600"
                                }`}
                              />
                              {result.priority.toUpperCase()}
                            </span>
                          )}

                          {/* CommitDateTime */}
                          {result.commitDateTime && (
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-xs font-semibold",
                                isToday(result.commitDateTime)
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              )}
                            >
                              {formatHermisilloDate(result.commitDateTime)}
                            </span>
                          )}

                          {/* Pago */}
                          {result.paymentAmount !== undefined && result.paymentAmount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                              ${result.paymentAmount}
                            </span>
                          )}
                        </div>

                        {/* Subtítulos conductor/ruta */}
                        {result.subtitle && (
                          <div className="text-xs text-muted-foreground truncate">
                            {result.subtitle.split("|").map((part) => {
                              const [key, value] = part.split(":")
                              return (
                                <span key={key}>
                                  <b>{key}:</b> {value}
                                </span>
                              )
                            })}
                          </div>
                        )}

                        {/* Datos adicionales */}
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {result.subsidiary && <div><b>Sucursal:</b> {result.subsidiary}</div>}
                          {result.address && <div><b>Dirección:</b> {result.address}</div>}
                          {result.phone && <div><b>Teléfono:</b> {result.phone}</div>}
                          {result.zipCode && <div><b>CP:</b> {result.zipCode}</div>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Edit className="h-3 w-3" />
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
