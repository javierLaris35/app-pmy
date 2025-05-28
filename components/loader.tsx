import { Loader2 } from "lucide-react"

export function Loader() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex items-center space-x-3">
        <Loader2 className="h-6 w-6 animate-spin text-red-600" />
        <span className="text-lg font-medium">Cargando...</span>
      </div>
    </div>
  )
}