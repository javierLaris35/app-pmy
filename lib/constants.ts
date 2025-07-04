import { IconTruckLoading } from "@tabler/icons-react"
import { BarChart3, PieChart, SettingsIcon, BuildingIcon, PackageIcon, TruckIcon, BriefcaseBusinessIcon, Truck, Wallet2Icon, ChartNoAxesCombinedIcon, DollarSignIcon, HomeIcon, HistoryIcon, PenToolIcon, PackagePlusIcon, MapIcon } from "lucide-react"

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
          name: "Sucursales",
          url: "/sucursales",
          icon: BuildingIcon,
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
          name: "Envios",
          url: "/operaciones/envios",
          icon: PackageIcon,
          roles: ["admin", "superadmin"],
          isActive: false
        },
        {
          name: "Recoleciones",
          url: "/operaciones/recolecciones",
          icon: PackagePlusIcon,
          roles: ["admin", "superadmin"],
          isActive: false
        },
        {
          name: "Rutas",
          url: "/operaciones/rutas",
          icon: MapIcon,
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
