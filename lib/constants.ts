import { IconTruckLoading } from "@tabler/icons-react"
import { BarChart3, PieChart, SettingsIcon, BuildingIcon, PackageIcon, TruckIcon, BriefcaseBusinessIcon, Truck, Wallet2Icon, ChartNoAxesCombinedIcon, DollarSignIcon, HomeIcon, HistoryIcon, PenToolIcon, PackagePlusIcon, MapIcon, MonitorCheckIcon, Undo2Icon, ClipboardPasteIcon, MilestoneIcon, CarFrontIcon, PackageCheckIcon } from "lucide-react"

export interface NavItem {
    title: string
    href: string
    icon: React.ElementType,
    roles?: string[]
}

export const sidebarMenu = {
  items: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: HomeIcon,
      isActive: false,
    },
    { 
      title: "Administración",
      url:"#",
      icon: BuildingIcon,
      isActive: false,
      items: [
        {
          name: "Choferes",
          url: "/administracion/choferes",
          icon: CarFrontIcon,
          roles: ["admin", "superadmin"],
          isActive: false
        },
        {
          name: "Rutas",
          url: "/administracion/rutas",
          icon: MilestoneIcon,
          roles: ["admin", "superadmin"],
          isActive: false
        },
        {
          name: "Sucursales",
          url: "/sucursales",
          icon: BuildingIcon,
          roles: ["admin", "superadmin"],
          isActive: false
        },
        {
          name: "Vehículos",
          url: "/administracion/vehiculos",
          icon: TruckIcon,
          roles: ["admin", "superadmin"],
          isActive: false
        }
      ]
    },
    {
      title: "Operaciones",
      url: "#",
      icon: BriefcaseBusinessIcon,
      isActive: false,
      items: [
        {
          name: "Cargas",
          url: "/operaciones/cargas",
          icon: TruckIcon,
          roles: ["admin", "superadmin"],
          isActive: false
        },
        {
          name: "Consolidados",
          url: "/operaciones/consolidados",
          icon: IconTruckLoading,
          roles: ["admin", "superadmin"],
          isActive: false
        },
        {
          name: "Desembarques",
          url: "/operaciones/desembarques",
          icon: PackageCheckIcon,
          roles: ["admin", "superadmin"],
          isActive: false
        },
        {
          name: "Devoluciones",
          url: "/operaciones/devoluciones",
          icon: Undo2Icon,
          roles: ["admin", "superadmin"],
          isActive: false
        },
        {
          name: "Envios",
          url: "/operaciones/envios",
          icon: PackageIcon,
          roles: ["admin", "superadmin"],
          isActive: false
        },
        /*{
          name: "Monitoreo",
          url: "/operaciones/monitoreo",
          icon: MonitorCheckIcon,
          roles: ["admin", "superadmin"],
          isActive: false
        },*/
        {
          name: "Salidas a Rutas",
          url: "/operaciones/salidas-a-ruta",
          icon: ClipboardPasteIcon,
          roles: ["admin", "superadmin"],
          isActive: false
        },
      ]
    },
    {
      title: "Mtto. Vehículos",
      url: "#",
      icon: Truck,
      isActive: false,
      items: [
        {
          name: "Programación",
          url: "/programacion-mtto",
          icon: PenToolIcon,
          roles: ["admin", "superadmin"],
          isActive: false
        },
        {
          name: "Historial",
          url: "/historial-mtto",
          icon: HistoryIcon,
          roles: ["admin", "superadmin"],
          isActive: false
        },
      ]
    },
    {
      title: "Finanzas",
      url: "#",
      icon: Wallet2Icon,
      isActive: false,
      items: [
        {
          name: "Ingresos",
          url: "/ingresos",
          icon: BarChart3,
          permission: "ingresos:view",
        },
        {
          name: "Gastos",
          url: "/gastos",
          icon: PieChart,
          permission: "gastos:view",
        },
      ]
    },
    {
      title: "Reportes",
      url: "/reportes",
      icon: ChartNoAxesCombinedIcon,
      isActive: false,
    },
    {
      title: "Nómina",
      url: "/nomina",
      icon: DollarSignIcon,
      isActive: false,
    },
  ],
  secondary: [
    {
      title: "Configuración",
      url: "/configuracion",
      icon: SettingsIcon,
      isActive: false,
    }
  ]
}


export const SHIPMENT_STATUS_MAP: Record<string, string> = {
  "03": "DEX03",
  "07": "DEX07",
  "08": "DEX08",
  "GF": "GUIA FRAUDE",
  "12": "DEX12",
};


export const DEVOLUTION_REASON_MAP: Record<string, string> = {
  "03": "Dirección incorrecta",
  "07": "Rechazo del cliente",
  "08": "Cliente no disponible o negocio cerrado"
};