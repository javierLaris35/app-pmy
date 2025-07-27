"use client"

import { jsPDF } from "jspdf"
import "jspdf-autotable"

interface Collection {
  trackingNumber: string
  status: string | null
  isPickUp: boolean
}

interface Devolution {
  trackingNumber: string
  status: string
  reason: string
}

// Mapping reasons to DEX codes
const REASON_TO_DEX_CODE: Record<string, string> = {
  "DATOS INCORRECTOS / DOM NO EXISTE": "DEX03",
  "RECHAZO DE PAQUETES POR EL CLIENTE": "DEX07",
  "VISITA / DOMICILIO CERRADO": "DEX08",
  NO_ENTREGADO: "DEX03",
  RECHAZADO: "DEX07",
  PENDIENTE: "DEX08",
}

export class FedExPDFGenerator {
  private collections: Collection[]
  private devolutions: Devolution[]
  private subsidiaryName: string

  constructor(collections: Collection[], devolutions: Devolution[], subsidiaryName: string) {
    this.collections = collections
    this.devolutions = devolutions
    this.subsidiaryName = subsidiaryName
  }

  private async loadFedExLogo(): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        canvas.width = img.width
        canvas.height = img.height
        ctx?.drawImage(img, 0, 0)
        resolve(canvas.toDataURL("image/png"))
      }
      img.onerror = reject
      img.src = "/images/fedex-logo.png"
    })
  }

  private getReasonCode(reason: string, status: string): string {
    // First try to match the reason directly
    if (REASON_TO_DEX_CODE[reason]) {
      return REASON_TO_DEX_CODE[reason]
    }

    // Then try to match the status
    if (REASON_TO_DEX_CODE[status]) {
      return REASON_TO_DEX_CODE[status]
    }

    // Default fallback
    return reason || status || ""
  }

  async generatePDF(): Promise<void> {
    const doc = new jsPDF("p", "mm", "a4")
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    try {
      // Load and add FedEx logo
      const logoDataUrl = await this.loadFedExLogo()
      doc.addImage(logoDataUrl, "PNG", 15, 10, 40, 12) // x, y, width, height
    } catch (error) {
      console.warn("Could not load FedEx logo:", error)
      // Fallback to text logo
      doc.setFontSize(18)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(102, 45, 145) // FedEx purple
      doc.text("Fed", 15, 20)
      doc.setTextColor(255, 102, 0) // FedEx orange
      doc.text("Ex", 32, 20)
    }

    // Reset text color to black
    doc.setTextColor(0, 0, 0)

    // Date section (top right)
    const currentDate = new Date().toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })

    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("FECHA", pageWidth - 45, 15)
    doc.rect(pageWidth - 45, 18, 35, 8)
    doc.setFont("helvetica", "normal")
    doc.text(currentDate, pageWidth - 42, 24)

    // Location section
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text(`LOCALIDAD:`, 15, 35)

    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text(this.subsidiaryName.toUpperCase(), 15, 45)

    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    doc.text("PAQUETES RECIBOS DE FedEx", 15, 52)

    // Package summary boxes
    const normalPackages = this.collections.filter((c) => c.status !== "PICK UP").length
    const pickupPackages = this.collections.filter((c) => c.status === "PICK UP").length
    const totalPackages = this.collections.length

    const boxY = 58
    const boxHeight = 12
    const boxWidth = 55

    // Normal packages box
    doc.rect(15, boxY, boxWidth, boxHeight)
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("PAQUETES NORMALES:", 17, boxY + 4)
    doc.rect(15, boxY + 6, boxWidth, 4)
    doc.setFontSize(11)
    doc.text(normalPackages.toString(), 17, boxY + 9)

    // Packages with charges box
    doc.rect(75, boxY, boxWidth, boxHeight)
    doc.setFontSize(9)
    doc.text("PAQUETES CON COBRO:", 77, boxY + 4)
    doc.rect(75, boxY + 6, boxWidth, 4)
    doc.setFontSize(11)
    doc.text(pickupPackages.toString(), 77, boxY + 9)

    // Total packages box
    doc.rect(135, boxY, boxWidth, boxHeight)
    doc.setFontSize(9)
    doc.text("TOTAL DE PAQUETES:", 137, boxY + 4)
    doc.rect(135, boxY + 6, boxWidth, 4)
    doc.setFontSize(11)
    doc.text(totalPackages.toString(), 137, boxY + 9)

    // Main content area starts
    const contentStartY = 80

    // Devolutions section (left side)
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.rect(15, contentStartY, 90, 8)
    doc.setFillColor(200, 200, 200)
    doc.rect(15, contentStartY, 90, 8, "F")
    doc.setTextColor(0, 0, 0)
    doc.text("DEVOLUCION (Envío no entregado)", 17, contentStartY + 5)

    // Devolution table headers
    const devTableY = contentStartY + 8
    doc.rect(15, devTableY, 15, 6)
    doc.rect(30, devTableY, 45, 6)
    doc.rect(75, devTableY, 30, 6)

    doc.setFillColor(240, 240, 240)
    doc.rect(15, devTableY, 15, 6, "F")
    doc.rect(30, devTableY, 45, 6, "F")
    doc.rect(75, devTableY, 30, 6, "F")

    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("No", 20, devTableY + 4)
    doc.text("GUIA", 50, devTableY + 4)
    doc.text("MOTIVO", 87, devTableY + 4)

    // Devolution table rows
    let currentY = devTableY + 6
    const rowHeight = 6

    for (let i = 0; i < 30; i++) {
      const devolution = this.devolutions[i]

      // Draw row borders
      doc.rect(15, currentY, 15, rowHeight)
      doc.rect(30, currentY, 45, rowHeight)
      doc.rect(75, currentY, 30, rowHeight)

      if (devolution) {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.text((i + 1).toString(), 20, currentY + 4)
        doc.text(devolution.trackingNumber, 32, currentY + 4)

        // Use DEX code instead of full reason
        const reasonCode = this.getReasonCode(devolution.reason, devolution.status)
        doc.text(reasonCode, 77, currentY + 4)
      } else {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.text((i + 1).toString(), 20, currentY + 4)
      }

      currentY += rowHeight
    }

    // Collections section (right side)
    const collectionX = 110
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.rect(collectionX, contentStartY, 80, 8)
    doc.setFillColor(200, 200, 200)
    doc.rect(collectionX, contentStartY, 80, 8, "F")
    doc.setTextColor(0, 0, 0)
    doc.text("RECOLECCIONES", collectionX + 2, contentStartY + 5)

    // Collection table headers
    doc.rect(collectionX, devTableY, 50, 6)
    doc.rect(collectionX + 50, devTableY, 15, 6)
    doc.rect(collectionX + 65, devTableY, 15, 6)

    doc.setFillColor(240, 240, 240)
    doc.rect(collectionX, devTableY, 50, 6, "F")
    doc.rect(collectionX + 50, devTableY, 15, 6, "F")
    doc.rect(collectionX + 65, devTableY, 15, 6, "F")

    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("NO. GUIA", collectionX + 20, devTableY + 4)
    doc.text("", collectionX + 55, devTableY + 4)
    doc.text("", collectionX + 70, devTableY + 4)

    // Collection table rows
    currentY = devTableY + 6

    for (let i = 0; i < 30; i++) {
      const collection = this.collections[i]

      // Draw row borders
      doc.rect(collectionX, currentY, 50, rowHeight)
      doc.rect(collectionX + 50, currentY, 15, rowHeight)
      doc.rect(collectionX + 65, currentY, 15, rowHeight)

      if (collection) {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.text(collection.trackingNumber, collectionX + 2, currentY + 4)
        doc.text(this.subsidiaryName.substring(0, 3).toUpperCase(), collectionX + 52, currentY + 4)
        doc.text((i + 31).toString(), collectionX + 67, currentY + 4)
      } else {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.text((i + 31).toString(), collectionX + 67, currentY + 4)
      }

      currentY += rowHeight
    }

    // Footer with DEX code explanations
    const footerY = currentY + 10
    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.text("DEX 03: DATOS INCORRECTOS / DOM NO EXISTE", 15, footerY)
    doc.text("DEX 07: RECHAZO DE PAQUETES POR EL CLIENTE", 15, footerY + 6)
    doc.text("DEX 08: VISITA / DOMICILIO CERRADO", 15, footerY + 12)

    // Save the PDF
    const fileName = `FedEx_Control_${this.subsidiaryName}_${currentDate.replace(/\//g, "-")}.pdf`
    doc.save(fileName)
  }
}

export const generateFedExPDF = async (
  collections: Collection[],
  devolutions: Devolution[],
  subsidiaryName: string,
): Promise<void> => {
  const generator = new FedExPDFGenerator(collections, devolutions, subsidiaryName)
  await generator.generatePDF()
}
