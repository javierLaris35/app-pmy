"use client"

import type { KeyboardEvent, RefObject } from "react"
import { AlertTriangle, ScanBarcode, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export interface ScannerCardProps {
  title: string
  inputRef: RefObject<HTMLInputElement | null>
  value: string
  onChange: (value: string) => void
  onScan: () => void
  isScanning: boolean
  error: string | null
  disabled?: boolean
}

/** Card de escáner (look unificado: acento `primary`) para Entrada/Salida a Bodega. */
export function ScannerCard({ title, inputRef, value, onChange, onScan, isScanning, error, disabled }: ScannerCardProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      onScan()
    }
  }

  return (
    <Card className="border-primary/20">
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-primary mb-2">
          <span className="text-sm font-bold uppercase tracking-wide">{title}</span>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/60" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Código de barras..."
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-12 text-base pl-10 pr-10 font-mono border-slate-300 focus-visible:ring-primary shadow-sm"
              disabled={disabled || isScanning}
            />
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("")
                  inputRef.current?.focus()
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button
            onClick={onScan}
            disabled={!value.trim() || isScanning || disabled}
            className="h-12 px-5 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isScanning ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ...
              </span>
            ) : (
              "Agregar"
            )}
          </Button>
        </div>

        {error && (
          <div className="text-xs text-red-700 bg-red-50 p-2.5 rounded-md flex items-start gap-2 border border-red-100 shadow-sm animate-in fade-in slide-in-from-top-1">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
