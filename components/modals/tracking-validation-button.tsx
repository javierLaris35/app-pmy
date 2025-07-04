"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
import { TrackingValidationModal } from "./tracking-validation-modal"

export function TrackingValidationButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)} className="flex items-center gap-2">
        <Search className="h-4 w-4" />
        Validar Trackings
      </Button>

      <TrackingValidationModal open={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}
