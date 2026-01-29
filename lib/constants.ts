import { IconTruckLoading } from "@tabler/icons-react"
import { BarChart3, PieChart, SettingsIcon, BuildingIcon, PackageIcon, TruckIcon, BriefcaseBusinessIcon, Truck, Wallet2Icon, ChartNoAxesCombinedIcon, DollarSignIcon, HomeIcon, HistoryIcon, PenToolIcon, PackagePlusIcon, MapIcon, MonitorCheckIcon, Undo2Icon, ClipboardPasteIcon, MilestoneIcon, CarFrontIcon, PackageCheckIcon, Warehouse } from "lucide-react"
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
      url:"#",
      icon: BuildingIcon,
      isActive: false,
      items: [
        {
          name: "Choferes",
          url: "/administracion/choferes",
          icon: CarFrontIcon,
          roles: allowedPageRoles.administracion.choferes,
          isActive: false
        },
        {
          name: "Rutas",
          url: "/administracion/rutas",
          icon: MilestoneIcon,
          roles: allowedPageRoles.administracion.rutas,
          isActive: false
        },
        {
          name: "Sucursales",
          url: "/sucursales",
          icon: BuildingIcon,
          roles: allowedPageRoles.administracion.sucursales,
          isActive: false
        },
        {
          name: "Vehículos",
          url: "/administracion/vehiculos",
          icon: TruckIcon,
          roles: allowedPageRoles.administracion.vehiculos,
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
          roles: allowedPageRoles.operaciones.cargas,
          isActive: false
        },
        {
          name: "Consolidados",
          url: "/operaciones/consolidados",
          icon: IconTruckLoading,
          roles: allowedPageRoles.operaciones.consolidados,
          isActive: false
        },
        {
          name: "Desembarques",
          url: "/operaciones/desembarques",
          icon: PackageCheckIcon,
          roles: allowedPageRoles.operaciones.desembarques,
          isActive: false
        },
        {
          name: "Devoluciones",
          url: "/operaciones/devoluciones",
          icon: Undo2Icon,
          roles: allowedPageRoles.operaciones.devoluciones,
          isActive: false
        },
        {
          name: "Envios",
          url: "/operaciones/envios",
          icon: PackageIcon,
          roles: allowedPageRoles.operaciones.envios,
          isActive: false
        },
        {
          name: "Inventarios",
          url: "/operaciones/inventarios",
          icon: Warehouse,
          roles: allowedPageRoles.operaciones.inventarios,
          isActive: false
        },
        {
          name: "Monitoreo",
          url: "/operaciones/monitoreo",
          icon: MonitorCheckIcon,
          roles: allowedPageRoles.operaciones.monitoreo,
          isActive: false
        },
        {
          name: "Salidas a Rutas",
          url: "/operaciones/salidas-a-ruta",
          icon: ClipboardPasteIcon,
          roles: allowedPageRoles.operaciones.salidasARutas,
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
          roles: allowedPageRoles.mttoVehiculos.programacion,
          isActive: false
        },
        {
          name: "Historial",
          url: "/historial-mtto",
          icon: HistoryIcon,
          roles: allowedPageRoles.mttoVehiculos.historial,
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
          roles: allowedPageRoles.finanzas.ingresos,
          isActive: false
        },
        {
          name: "Gastos",
          url: "/gastos",
          icon: PieChart,
          roles: allowedPageRoles.finanzas.gastos,
          isActive: false
        },
      ]
    },
    {
      title: "Reportes",
      url: "/reportes",
      icon: ChartNoAxesCombinedIcon,
      roles: allowedPageRoles.reportes,
      isActive: false,
    },
    {
      title: "Nómina",
      url: "/nomina",
      icon: DollarSignIcon,
      isActive: false,
      roles: allowedPageRoles.finanzas.nominas,
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

export const SHIPMENT_REASONS = {
  direccion_incorrecta: "DEX03 - Dirección Incorrecta",
  rechazado: "DEX07 - Rechazado por Cliente",
  cliente_no_disponible: "DEX08 - Cliente no disponible",
  cambio_fecha_solicitado: "DEX17 - Cambio Fecha Solicitado",
  llegado_despues: "STAT31 - Llegado Después",
  estacion_fedex: "STAT41 - Estación FedEx",
  retorno_abandonono_fedex: "STAT14 - Retorno/Abandono",
  es_ocurre: "HP - 015A (Es Ocurre)",
  en_bodega: "67 - Desembarque en Bodega",
  devuelto_a_fedex: "Devolución a FedEx",
  no_entregado: "No Entregado (General)",
}


export const SHIPMENT_STATUS_MAP: Record<string, string> = {
  "03": "DEX03",
  "07": "DEX07",
  "08": "DEX08",
  "17": "DEX17",
  "12": "DEX12",
  "14": "DEX14 - STAT14",
  "GF": "GUIA FRAUDE"
};


export const DEVOLUTION_REASON_MAP: Record<string, string> = {
  "03": "Dirección incorrecta",
  "07": "Rechazo del cliente",
  "08": "Cliente no disponible o negocio cerrado"
};