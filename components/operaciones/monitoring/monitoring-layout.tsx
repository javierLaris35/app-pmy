"use client"

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {LucideIcon} from "lucide-react"
import {SelectionInfo} from "./selection-info"
import {PackagesStatistics} from "./packages-stadistics"
import {ExpiringTodayCard} from "./expiring-today-card"

interface MonitoringLayoutProps {
    title: string,
    icon: LucideIcon,
    selectionType: "consolidado" | "desembarque" | "ruta",
    selectionData: any,
    stats: any,
    packagesData: any;
}

export function MonitoringLayout({
       title,
       icon: Icon,
       selectionType,
       selectionData,
       stats,
       packagesData
   }: MonitoringLayoutProps) {

    return (
        <Card className="p-4">
            <CardHeader className="p-0 pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Icon className="h-5 w-5"/>
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="grid grid-cols-1 xl:grid-cols-[250px_1fr] gap-4 xl:gap-4">
                    {/* Columna izquierda: Información y paquetes que vencen hoy */}
                    <div className="flex flex-col gap-4">
                        <SelectionInfo type={selectionType} data={selectionData}/>
                        <div className="flex-1">
                            <ExpiringTodayCard packagesData={packagesData} />
                        </div>
                    </div>

                    {/* Columna derecha: Estadísticas */}
                    <div className="xl:-mt-6">
                        <PackagesStatistics stats={stats} packagesData={packagesData} />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
