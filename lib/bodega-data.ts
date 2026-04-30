import type { Package, PackageEntrySession } from "./types"

// Mock warehouse data
export const bodegaObregon = {
  id: "bodega-obregon",
  name: "Bodega Obregón",
  city: "Obregón",
  manager: "Gerente Bodega",
}

// Mock sucursales for package distribution
export const sucursalMock = [
  { id: "alamos", name: "Álamos" },
  { id: "navojoa", name: "Navojoa" },
  { id: "huatabampo", name: "Huatabampo" },
  { id: "pueblo-yaqui", name: "Pueblo Yaqui" },
  { id: "villa-juarez", name: "Villa Juárez" },
  { id: "vicam", name: "Vicam" },
]

// Generate mock tracking numbers based on carrier
export const generateTrackingNumber = (carrier: "FedEx" | "DHL"): string => {
  const prefix = carrier === "FedEx" ? "FX" : "DL"
  const random = Math.random().toString(36).substring(2, 15).toUpperCase()
  const number = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(10, "0")
  return `${prefix}${number}${random.substring(0, 5)}`
}

// Generate mock package with date that might expire today
export const generateMockPackage = (index: number): Package => {
  const carrier = Math.random() > 0.5 ? "FedEx" : "DHL"
  const today = new Date()
  const isExpiring = Math.random() > 0.85 // 15% chance to expire today
  const hasCharge = Math.random() > 0.8 // 20% chance to have charges

  return {
    id: `pkg-${Date.now()}-${index}`,
    trackingNumber: generateTrackingNumber(carrier),
    carrier,
    sucursal: sucursalMock[Math.floor(Math.random() * sucursalMock.length)].id,
    weight: Math.round(Math.random() * 30 + 1),
    status: "Pendiente",
    expiryDate: isExpiring ? today : new Date(today.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000),
    hasCharge,
    chargeAmount: hasCharge ? Math.round(Math.random() * 5000 + 100) : undefined,
    scannedAt: new Date(),
  }
}

// Create a new session
export const createNewSession = (vehiculoId: string): PackageEntrySession => {
  return {
    id: `session-${Date.now()}`,
    vehiculoId,
    warehouseId: bodegaObregon.id,
    startTime: new Date(),
    packages: [],
    totalPackages: 0,
    fedexCount: 0,
    dhlCount: 0,
    expiringCount: 0,
    chargesCount: 0,
    status: "En Progreso",
  }
}

// Add package to session and update counters
export const addPackageToSession = (
  session: PackageEntrySession,
  pkg: Package
): PackageEntrySession => {
  const updatedSession = { ...session }
  updatedSession.packages.push(pkg)
  updatedSession.totalPackages = updatedSession.packages.length
  updatedSession.fedexCount = updatedSession.packages.filter((p) => p.carrier === "FedEx").length
  updatedSession.dhlCount = updatedSession.packages.filter((p) => p.carrier === "DHL").length

  const today = new Date().toDateString()
  updatedSession.expiringCount = updatedSession.packages.filter(
    (p) => p.expiryDate && new Date(p.expiryDate).toDateString() === today
  ).length

  updatedSession.chargesCount = updatedSession.packages.filter((p) => p.hasCharge).length

  return updatedSession
}

// Get packages organized by sucursal
export const getPackagesBySucursal = (packages: Package[]) => {
  const grouped: Record<string, Package[]> = {}
  packages.forEach((pkg) => {
    if (!grouped[pkg.sucursal]) {
      grouped[pkg.sucursal] = []
    }
    grouped[pkg.sucursal].push(pkg)
  })
  return grouped
}

// Get packages organized by carrier
export const getPackagesByCarrier = (packages: Package[]) => {
  const grouped: Record<string, Package[]> = {
    FedEx: [],
    DHL: [],
  }
  packages.forEach((pkg) => {
    grouped[pkg.carrier].push(pkg)
  })
  return grouped
}

// Get expiring packages detail
export const getExpiringPackages = (packages: Package[]): Package[] => {
  const today = new Date().toDateString()
  return packages.filter((p) => p.expiryDate && new Date(p.expiryDate).toDateString() === today)
}

// Get packages with charges detail
export const getPackagesWithCharges = (packages: Package[]): Package[] => {
  return packages.filter((p) => p.hasCharge)
}
