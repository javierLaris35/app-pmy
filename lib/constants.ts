import { IconTruckLoading } from "@tabler/icons-react"
import { BarChart3, PieChart, SettingsIcon, BuildingIcon, PackageIcon, TruckIcon, BriefcaseBusinessIcon, Truck, Wallet2Icon, ChartNoAxesCombinedIcon, DollarSignIcon, HomeIcon, HistoryIcon, PenToolIcon, PackagePlusIcon, MapIcon, MonitorCheckIcon } from "lucide-react"
import { ElementType } from "react";
import { allowedPageRoles } from "@/lib/access/allowed-page-roles";

export interface NavItem {
    title: string
    href: string
    icon: ElementType,
    roles?: string[]
}

export const sidebarMenu = {
  items: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: HomeIcon,
      isActive: false,
      roles: allowedPageRoles.dashboard,
    },
    {
      title: "Administración",
      url: "#",
      icon: BuildingIcon,
      isActive: false,
      items: [
        {
          name: "Sucursales",
          url: "/sucursales",
          icon: BuildingIcon,
          roles: allowedPageRoles.sucursales,
          isActive: false,
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
          roles: allowedPageRoles.operaciones,
          isActive: false,
        },
        {
          name: "Consolidados",
          url: "/operaciones/consolidados",
          icon: IconTruckLoading,
          roles: allowedPageRoles.operaciones,
          isActive: false,
        },
        {
          name: "Envios",
          url: "/operaciones/envios",
          icon: PackageIcon,
          roles: allowedPageRoles.operaciones,
          isActive: false,
        },
        {
          name: "Monitoreo",
          url: "/operaciones/monitoreo",
          icon: MonitorCheckIcon,
          roles: allowedPageRoles.operaciones,
          isActive: false,
        },
        {
          name: "Recoleciones",
          url: "/operaciones/recolecciones",
          icon: PackagePlusIcon,
          roles: allowedPageRoles.operaciones,
          isActive: false,
        },
        {
          name: "Rutas",
          url: "/operaciones/rutas",
          icon: MapIcon,
          roles: allowedPageRoles.operaciones,
          isActive: false,
        },
      ],
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
          roles: allowedPageRoles.mttoVehiculos,
          isActive: false,
        },
        {
          name: "Historial",
          url: "/historial-mtto",
          icon: HistoryIcon,
          roles: allowedPageRoles.mttoVehiculos,
          isActive: false,
        },
      ],
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
          roles: allowedPageRoles.ingresos, // del diccionario
        },
        {
          name: "Gastos",
          url: "/gastos",
          icon: PieChart,
          roles: allowedPageRoles.gastos,
        },
      ],
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
      roles: allowedPageRoles.nomina,
    },
  ],
  secondary: [
    {
      title: "Configuración",
      url: "/configuracion",
      icon: SettingsIcon,
      isActive: false,
      roles: allowedPageRoles.configuracion,
    }
  ]
}