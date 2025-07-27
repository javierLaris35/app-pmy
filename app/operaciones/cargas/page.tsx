"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Loader } from "@/components/loader";
import { AppLayout } from "@/components/app-layout";
import { Package, CheckCircle2, ClipboardList } from "lucide-react";
import { Label } from "@/components/ui/label";
import { SucursalSelector } from "@/components/sucursal-selector";
import { Charge, ChargeShipment } from "@/lib/types";
import { ChargeShipmentDetailDialog } from "@/components/modals/charge-shipment-detail-dialog";
import { useCharges } from "@/hooks/services/shipments/use-shipments";
import {withAuth} from "@/hoc/withAuth";

function ChargesWithKpis() {
  const { charges, isLoading, mutate } = useCharges();
    const [selectedShipments, setSelectedShipments] = useState<ChargeShipment[] | null>(null);
    const [selectedSucursalId, setSelectedSucursalId] = useState<string | undefined>(undefined)


    if (!charges || isLoading) {
        return <Loader />;
    }

    const totalCharges = charges.length;
    const completedCharges = charges.filter((c) => c.isChargeComplete).length;
    const totalShipments = charges.reduce((sum, c) => sum + c.shipments.length, 0);

    const columns: ColumnDef<Charge>[] = [

        {
            accessorKey: "chargeDate",
            header: "Fecha",
            cell: ({ row }) => {
                const raw: string = row.getValue("chargeDate")
                
                if (!raw) return "Sin fecha"

                const [year, month, day] = raw.split("T")[0].split("-") // "2025-06-30" => [2025, 06, 30]

                return `${day}/${month}/${year}` // "30/06/2025"
            }
        },
        {
            accessorKey: "numberOfPackages",
            header: "# Paquetes",
        },
        {
            accessorKey: "subsidiary",
            header: "Sucursal",
            cell: ({ row }) => {
                const subsidiary = row.getValue("subsidiary") as { name: string };
                return <span>{subsidiary?.name ?? "N/A"}</span>;
            },
        },
        {
            accessorKey: "undeliveredPackages",
            header: "No Entregados",
            cell: ({ row }) => {
                const charge = row.original;
                if (charge.isChargeComplete) return "-";

                const notDelivered = charge.shipments.filter((s) => s.status !== "entregado").length;
                return <span className="text-red-600 font-semibold">{notDelivered}</span>;
            },
        },
        {
            accessorKey: "isChargeComplete",
            header: "Estado",
            cell: ({ row }) => {
                const complete = row.getValue("isChargeComplete") as boolean;
                return (
                    <Badge
                        variant={complete ? "default" : "outline"}
                        className={complete ? "bg-green-600" : "bg-yellow-400 text-black"}
                    >
                        {complete ? "Completa" : "Incompleta"}
                    </Badge>
                );
            },
        },
        {
            id: "actions",
            header: "Acciones",
            cell: ({ row }) => {
                const charge = row.original;
                return (
                    <ChargeShipmentDetailDialog shipments={charge.shipments} />
                );
            },
        },
    ];

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">Cargas</h2>
                        <p className="text-muted-foreground">Administra las cargas de los envíos</p>
                    </div>
                    <div>
                        <Label htmlFor="sucursal">Sucursal</Label>
                        <SucursalSelector
                        value={selectedSucursalId}
                        onValueChange={setSelectedSucursalId}
                        />
                    </div>
                </div>
                {/* KPIs más visuales */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <Card className="flex items-center gap-4 rounded-2xl shadow-md p-4 bg-white">
                        <Package className="text-blue-600 w-8 h-8" />
                        <div>
                            <CardTitle className="text-sm font-medium text-gray-500">Total Cargas</CardTitle>
                            <CardContent className="text-3xl font-bold">{totalCharges}</CardContent>
                        </div>
                    </Card>
                    <Card className="flex items-center gap-4 rounded-2xl shadow-md p-4 bg-white">
                        <CheckCircle2 className="text-green-600 w-8 h-8" />
                        <div>
                            <CardTitle className="text-sm font-medium text-gray-500">Cargas Completas</CardTitle>
                            <CardContent className="text-3xl font-bold">{completedCharges}</CardContent>
                        </div>
                    </Card>
                    <Card className="flex items-center gap-4 rounded-2xl shadow-md p-4 bg-white">
                        <ClipboardList className="text-purple-600 w-8 h-8" />
                        <div>
                            <CardTitle className="text-sm font-medium text-gray-500">Total Envíos</CardTitle>
                            <CardContent className="text-3xl font-bold">{totalShipments}</CardContent>
                        </div>
                    </Card>
                </div>

                <DataTable
                    columns={columns}
                    data={charges}
                    searchKey="subsidiary.name"
                    filters={[
                        {
                        columnId: "isChargeComplete",
                        title: "Estado",
                        options: [
                            { label: "Completa", value: "true" },
                            { label: "Incompleta", value: "false" },
                        ],
                        },
                    ]}
                />
            </div>
        </AppLayout>
    );
}

export default withAuth(ChargesWithKpis, 'operaciones');