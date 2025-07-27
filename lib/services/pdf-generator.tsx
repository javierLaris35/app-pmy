"use client"

import { jsPDF } from "jspdf"
import "jspdf-autotable"
import { Charge } from "../types"

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

// Enhanced status to DEX code mapping
const STATUS_TO_DEX_CODE: Record<string, string> = {
  // Direct DEX codes
  "03": "DEX03",
  "07": "DEX07",
  "08": "DEX08",
  "12": "DEX12",
  "GF": "GUIA FRAUDE",
  DEX03: "DEX03",
  DEX07: "DEX07",
  DEX08: "DEX08",

  // Status mappings
  NO_ENTREGADO: "DEX03",
  RECHAZADO: "DEX07",
  PENDIENTE: "DEX08",
  ENTREGADO: "",

  // Exception codes
  "DATOS INCORRECTOS": "DEX03",
  "RECHAZO DE PAQUETES": "DEX07",
  "DOMICILIO CERRADO": "DEX08",
  "VISITA FALLIDA": "DEX08",
}

export class EnhancedFedExPDFGenerator {
  private collections: Collection[]
  private devolutions: Devolution[]
  private charges: Charge[] = []
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
        if (!ctx) {
          reject(new Error("Could not get canvas context"))
          return
        }

        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        resolve(canvas.toDataURL("image/png"))
      }
      img.onerror = () => reject(new Error("Failed to load FedEx logo"))
      // Ruta corregida según especificación
      img.src = "/fedex-logo.png"
    })
  }

  private getStatusCode(status: string): string {
    // Clean and normalize the status
    const cleanStatus = status.trim().toUpperCase()

    // Direct mapping first
    if (STATUS_TO_DEX_CODE[cleanStatus]) {
      return STATUS_TO_DEX_CODE[cleanStatus]
    }

    // Check for partial matches
    for (const [key, value] of Object.entries(STATUS_TO_DEX_CODE)) {
      if (cleanStatus.includes(key.toUpperCase()) || key.toUpperCase().includes(cleanStatus)) {
        return value
      }
    }

    // Return the original status if no mapping found
    return status || ""
  }

  private drawHeader(doc: jsPDF, logoDataUrl?: string): number {
    const pageWidth = doc.internal.pageSize.getWidth()

    // Background header area
    doc.setFillColor(248, 249, 250)
    doc.rect(0, 0, pageWidth, 30, "F")

    try {
      if (logoDataUrl) {
        // Add FedEx logo with enhanced positioning
        doc.addImage(logoDataUrl, "PNG", 15, 8, 45, 14)
      } else {
        throw new Error("No logo provided")
      }
    } catch (error) {
      console.warn("Using fallback logo:", error)
      // Enhanced fallback logo with FedEx colors
      doc.setFontSize(22)
      doc.setFont("helvetica", "bold")

      // FedEx purple for "Fed"
      doc.setTextColor(102, 45, 145)
      doc.text("Fed", 15, 20)

      // FedEx orange for "Ex"
      doc.setTextColor(255, 102, 0)
      doc.text("Ex", 38, 20)

      // Registered trademark
      doc.setFontSize(8)
      doc.setTextColor(0, 0, 0)
      doc.text("®", 55, 15)
    }

    // Reset text color
    doc.setTextColor(0, 0, 0)

    // Date section with enhanced styling
    const currentDate = new Date().toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })

    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text("FECHA", pageWidth - 50, 12)

    // Date box with border
    doc.setLineWidth(0.5)
    doc.rect(pageWidth - 50, 15, 40, 10)
    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.text(currentDate, pageWidth - 47, 22)

    return 30
  }

  private drawLocationSection(doc: jsPDF, startY: number): number {
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(0, 0, 0)
    doc.text("La Paz o San Jose del Cabo", 17, startY - 5)
    
    // Location section with enhanced typography
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(60, 60, 60)
    doc.text("LOCALIDAD:", 15, startY + 10)

    // Subsidiary name with emphasis
    doc.setFontSize(15)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 0, 0)
    doc.text(this.subsidiaryName.toUpperCase(), 42, startY + 10)

    
    // Subtitle
    doc.setFontSize(16)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100, 100, 100)
    doc.text("DEVOLUCIONES Y RECOLECCIONES", 55, startY + 25)

    return startY + 35
  }

  private drawPackageSummary(doc: jsPDF, startY: number): number {
    // Calcular correctamente los totales
    console.log("Collections data:", this.collections)

    // Contar paquetes normales (que NO son pickup)
    const normalPackages = this.collections.filter((c) => {
      const isNotPickup = !c.isPickUp && c.status !== "PICK UP" && c.status !== "Pick Up" && c.status !== "pick up" && c.status !== 'PU'
      console.log(
        `Collection ${c.trackingNumber}: isPickUp=${c.isPickUp}, status="${c.status}", isNotPickup=${isNotPickup}`,
      )
      return isNotPickup
    }).length

    // Contar paquetes con cobro (que SÍ son pickup)
    const pickupPackages = this.collections.filter((c) => {
      const isPickup = c.isPickUp || c.status === "PICK UP" || c.status === "Pick Up" || c.status === "pick up"
      console.log(`Collection ${c.trackingNumber}: isPickUp=${c.isPickUp}, status="${c.status}", isPickup=${isPickup}`)
      return isPickup
    }).length

    // TODO: add real number of charge packages
    const chargePackages = 0;

    // Total de paquetes
    const totalCollectionPackages = this.collections.length
    const totalDevolutionPackages = this.devolutions.length
        
    //TODO: Add charge packages and draw
    //const totalChargePackages = this.charges.length;
    const totalPackages = totalDevolutionPackages + totalCollectionPackages;

    console.log(`Package counts: Normal=${normalPackages}, Pickup=${pickupPackages}, Total=${totalPackages}`)

    const boxY = startY
    const boxHeight = 16
    const boxWidth = 58
    const spacing = 5

    // Enhanced box styling
    doc.setLineWidth(0.8)
    doc.setDrawColor(200, 200, 200)

    // Normal packages box
    doc.setFillColor(245, 247, 250)
    doc.rect(15, boxY, boxWidth, boxHeight, "FD")
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(70, 70, 70)
    doc.text("PAQUETES NORMALES:", 17, boxY + 5)

    // Value box
    doc.setFillColor(255, 255, 255)
    doc.rect(15, boxY + 8, boxWidth, 6, "FD")
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 0, 0)
    doc.text(normalPackages.toString(), 17, boxY + 12)

    // Packages with charges box
    const box2X = 15 + boxWidth + spacing
    doc.setFillColor(245, 247, 250)
    doc.rect(box2X, boxY, boxWidth, boxHeight, "FD")
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(70, 70, 70)
    doc.text("PAQUETES CON COBRO:", box2X + 2, boxY + 5)

    doc.setFillColor(255, 255, 255)
    doc.rect(box2X, boxY + 8, boxWidth, 6, "FD")
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 0, 0)
    doc.text(chargePackages.toString(), box2X + 2, boxY + 12)

    // Total packages box
    const box3X = box2X + boxWidth + spacing
    doc.setFillColor(245, 247, 250)
    doc.rect(box3X, boxY, boxWidth, boxHeight, "FD")
    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(70, 70, 70)
    doc.text("TOTAL DE PAQUETES:", box3X + 2, boxY + 5)

    doc.setFillColor(255, 255, 255)
    doc.rect(box3X, boxY + 8, boxWidth, 6, "FD")
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(0, 0, 0)
    doc.text(totalPackages.toString(), box3X + 2, boxY + 12)

    return startY + boxHeight + 10
  }

  private drawDevolutionSection(doc: jsPDF, startY: number): number {
    const sectionWidth = 95

    // Section header with enhanced styling
    doc.setFillColor(102, 45, 145) // FedEx purple
    doc.rect(15, startY, sectionWidth, 10, "F")
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(255, 255, 255)
    doc.text("DEVOLUCION (Envío no entregado)", 17, startY + 6)

    // Reset colors
    doc.setTextColor(0, 0, 0)
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)

    // Table headers with enhanced styling
    const headerY = startY + 10
    const headerHeight = 8

    doc.setFillColor(240, 240, 240)
    doc.rect(15, headerY, 15, headerHeight, "FD")
    doc.rect(30, headerY, 50, headerHeight, "FD")
    doc.rect(80, headerY, 30, headerHeight, "FD")

    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("No", 21, headerY + 5)
    doc.text("NO. GUIA", 52, headerY + 5)
    doc.text("MOTIVO", 92, headerY + 5)

    // Table rows with alternating colors
    let currentY = headerY + headerHeight
    const rowHeight = 6

    for (let i = 0; i < 30; i++) {
      const devolution = this.devolutions[i]
      const isEven = i % 2 === 0

      // Alternating row colors
      if (isEven) {
        doc.setFillColor(252, 252, 252)
        doc.rect(15, currentY, 95, rowHeight, "F")
      }

      // Row borders
      doc.setDrawColor(220, 220, 220)
      doc.rect(15, currentY, 15, rowHeight)
      doc.rect(30, currentY, 50, rowHeight)
      doc.rect(80, currentY, 30, rowHeight)

      if (devolution) {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.setTextColor(0, 0, 0)

        // Row number
        doc.text((i + 1).toString(), 21, currentY + 4)

        // Tracking number
        doc.text(devolution.trackingNumber, 32, currentY + 4)

        // Use status code instead of reason
        const statusCode = this.getStatusCode(devolution.status)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(180, 0, 0) // Red color for DEX codes
        doc.text(statusCode, 82, currentY + 4)
      } else {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text((i + 1).toString(), 21, currentY + 4)
      }

      currentY += rowHeight
    }

    return currentY + 5
  }

  private drawCollectionSection(doc: jsPDF, startY: number): number {
    const sectionX = 115
    const sectionWidth = 80

    // Section header with enhanced styling
    doc.setFillColor(255, 102, 0) // FedEx orange
    doc.rect(sectionX, startY, sectionWidth, 10, "F")
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(255, 255, 255)
    doc.text("RECOLECCIONES", sectionX + 2, startY + 6)

    // Reset colors
    doc.setTextColor(0, 0, 0)
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)

    // Table headers
    const headerY = startY + 10
    const headerHeight = 8

    doc.setFillColor(240, 240, 240)
    doc.rect(sectionX, headerY, 50, headerHeight, "FD")
    doc.rect(sectionX + 50, headerY, 15, headerHeight, "FD")
    doc.rect(sectionX + 65, headerY, 15, headerHeight, "FD")

    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("NO. GUIA", sectionX + 22, headerY + 5)
    doc.text("", sectionX + 55, headerY + 5)
    doc.text("", sectionX + 70, headerY + 5)

    // Collection table rows
    let currentY = headerY + headerHeight
    const rowHeight = 6

    for (let i = 0; i < 15; i++) {
      const collection = this.collections[i]
      const isEven = i % 2 === 0

      // Alternating row colors
      if (isEven) {
        doc.setFillColor(252, 252, 252)
        doc.rect(sectionX, currentY, 80, rowHeight, "F")
      }

      // Row borders
      doc.setDrawColor(220, 220, 220)
      doc.rect(sectionX, currentY, 50, rowHeight)
      doc.rect(sectionX + 50, currentY, 15, rowHeight)
      doc.rect(sectionX + 65, currentY, 15, rowHeight)

      if (collection) {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.setTextColor(0, 0, 0)

        // Tracking number
        doc.text(collection.trackingNumber, sectionX + 2, currentY + 4)

        // Subsidiary code
        doc.text(this.subsidiaryName.substring(0, 3).toUpperCase(), sectionX + 52, currentY + 4)

        // Sequential number starting from 1
        doc.setFont("helvetica", "bold")
        doc.text((i + 1).toString(), sectionX + 67, currentY + 4)
      } else {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        // Sequential number starting from 1
        doc.text((i + 1).toString(), sectionX + 67, currentY + 4)
      }

      currentY += rowHeight
    }

    return currentY + 5
  }

  private drawChargeSection(doc: jsPDF, startY: number): number {
    const sectionX = 115
    const sectionWidth = 80
    const newStartY = startY + 109;

    // Section header with enhanced styling
    doc.setFillColor(0,128,0)
    doc.rect(sectionX, newStartY, sectionWidth, 10, "F")
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(255, 255, 255)
    doc.text("COBROS", sectionX + 30, newStartY + 6)

    // Reset colors
    doc.setTextColor(0, 0, 0)
    doc.setDrawColor(0, 0, 0)
    doc.setLineWidth(0.3)

    // Table headers
    const headerY = newStartY + 10
    const headerHeight = 8

    doc.setFillColor(240, 240, 240)
    doc.rect(sectionX, headerY, 50, headerHeight, "FD")
    doc.rect(sectionX + 50, headerY, 15, headerHeight, "FD")
    doc.rect(sectionX + 65, headerY, 15, headerHeight, "FD")

    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("NO. GUIA", sectionX + 22, headerY + 5)
    doc.text("", sectionX + 55, headerY + 5)
    doc.text("", sectionX + 70, headerY + 5)

    // Charge table rows
    let currentY = headerY + headerHeight
    const rowHeight = 6

    // Filtrar solo los paquetes con cobro
    const chargeCollections = this.charges.filter(c => 
      c.isPickUp || c.status === "PICK UP" || c.status === "Pick Up" || c.status === "pick up"
    )

    for (let i = 0; i < 12; i++) {
      const collection = chargeCollections[i]
      const isEven = i % 2 === 0

      // Alternating row colors
      if (isEven) {
        doc.setFillColor(230, 255, 230) // Verde claro para filas
        doc.rect(sectionX, currentY, 80, rowHeight, "F")
      }

      // Row borders
      doc.setDrawColor(200, 200, 200)
      doc.rect(sectionX, currentY, 50, rowHeight)
      doc.rect(sectionX + 50, currentY, 15, rowHeight)
      doc.rect(sectionX + 65, currentY, 15, rowHeight)

      if (collection) {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.setTextColor(0, 0, 0)

        // Tracking number
        doc.text(collection.trackingNumber, sectionX + 2, currentY + 4)

        // Subsidiary code
        doc.text(this.subsidiaryName.substring(0, 3).toUpperCase(), sectionX + 52, currentY + 4)

        // Sequential number starting from 31 (continuación de la numeración)
        doc.setFont("helvetica", "bold")
        doc.text((i+1).toString(), sectionX + 67, currentY + 4)
      } else {
        doc.setFont("helvetica", "normal")
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        // Sequential number starting from 31
        doc.text((i+1).toString(), sectionX + 67, currentY + 4)
      }

      currentY += rowHeight
    }

    return currentY + 5
}

  private drawFooter(doc: jsPDF, startY: number): void {
    // Enhanced footer with better styling
    doc.setFillColor(248, 249, 250)
    doc.rect(0, startY, doc.internal.pageSize.getWidth(), 25, "F")

    doc.setFontSize(9)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(80, 80, 80)

    const footerTexts = [
      "DEX 03: DATOS INCORRECTOS / DOM NO EXISTE",
      "DEX 07: RECHAZO DE PAQUETES POR EL CLIENTE",
      "DEX 08: VISITA / DOMICILIO CERRADO",
    ]

    footerTexts.forEach((text, index) => {
      doc.text(text, 15, startY + 8 + index * 5)
    })
  }

  async generatePDF(): Promise<void> {
    const doc = new jsPDF("p", "mm", "a4")

    try {
      // Load logo
      const logoDataUrl = await this.loadFedExLogo()

      // Draw sections
      let currentY = this.drawHeader(doc, logoDataUrl)
      currentY = this.drawLocationSection(doc, currentY)
      currentY = this.drawPackageSummary(doc, currentY)

      const devolutionEndY = this.drawDevolutionSection(doc, currentY)
      const collectionEndY = this.drawCollectionSection(doc, currentY)
      const chargeEndY = this.drawChargeSection(doc, currentY)

      const footerY = Math.max(devolutionEndY, collectionEndY, chargeEndY)
      this.drawFooter(doc, footerY)
    } catch (error) {
      console.error("Error generating PDF:", error)
      throw error
    }

    // Generate filename with timestamp
    const currentDate = new Date().toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })

    const fileName = `FedEx_Control_${this.subsidiaryName}_${currentDate.replace(/\//g, "-")}.pdf`
    doc.save(fileName)
  }
}

export const generateEnhancedFedExPDF = async (
  collections: Collection[],
  devolutions: Devolution[],
  subsidiaryName: string,
): Promise<void> => {
  const generator = new EnhancedFedExPDFGenerator(collections, devolutions, subsidiaryName)
  await generator.generatePDF()
}
