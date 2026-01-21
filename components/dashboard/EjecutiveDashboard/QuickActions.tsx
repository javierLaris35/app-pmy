"use client"

import { Download, Calendar, FileText, BarChart3, RefreshCw, Settings, MessageSquare, Share2 } from 'lucide-react'

interface QuickActionsProps {
  onExportReport: () => void
  onScheduleMeeting: () => void
  onGenerateInsights: () => void
  onRefreshData?: () => void
  onSettings?: () => void
  onShare?: () => void
}

export function QuickActions({ 
  onExportReport, 
  onScheduleMeeting, 
  onGenerateInsights,
  onRefreshData,
  onSettings,
  onShare
}: QuickActionsProps) {
  
  const actions = [
    {
      id: 'export',
      label: 'Exportar Reporte',
      icon: Download,
      color: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
      onClick: onExportReport,
      description: 'Generar PDF/Excel'
    },
    {
      id: 'meeting',
      label: 'Agendar Reunión',
      icon: Calendar,
      color: 'bg-green-100 text-green-600 hover:bg-green-200',
      onClick: onScheduleMeeting,
      description: 'Con equipo directivo'
    },
    {
      id: 'insights',
      label: 'Generar Insights',
      icon: BarChart3,
      color: 'bg-purple-100 text-purple-600 hover:bg-purple-200',
      onClick: onGenerateInsights,
      description: 'Análisis predictivo'
    },
    {
      id: 'refresh',
      label: 'Actualizar Datos',
      icon: RefreshCw,
      color: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
      onClick: onRefreshData,
      description: 'Sincronizar ahora'
    },
    {
      id: 'share',
      label: 'Compartir',
      icon: Share2,
      color: 'bg-orange-100 text-orange-600 hover:bg-orange-200',
      onClick: onShare,
      description: 'Con stakeholders'
    },
    {
      id: 'settings',
      label: 'Configurar',
      icon: Settings,
      color: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
      onClick: onSettings,
      description: 'Personalizar vista'
    }
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={action.onClick}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${action.color} group relative`}
          title={action.description}
        >
          <action.icon className="h-4 w-4" />
          <span className="hidden sm:inline text-sm">{action.label}</span>
          
          {/* Tooltip */}
          <div className="absolute bottom-full mb-2 hidden group-hover:block">
            <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
              {action.description}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}