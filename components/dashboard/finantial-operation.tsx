import { AlertTriangle, CheckCircle2, Clock, Package } from "lucide-react";

const mockData = {
    consolidated: {},
    charges: {},
    air: {}
}


export function FinantialOperationKpis() {
    return (
        <>
            {/* CONSOLIDADO NORMAL/TERRESTRE*/}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Package className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-slate-700">Total Envíos</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-800">{0}</div>
                    <div className="text-xs text-slate-500">Paquetes consolidados</div>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-slate-700">Entregados (POD)</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-800">{0}</div>
                    <div className="text-xs text-slate-500">Confirmados por destinatario</div>
                </div>

                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm font-medium text-slate-700">No Entregados (DEX)</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-800">{0}</div>
                    <div className="text-xs text-slate-500">Requieren seguimiento</div>
                </div>

                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-slate-700">En Ruta</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-800">{0}</div>
                    <div className="text-xs text-slate-500">Pendientes de entrega</div>
                </div>
            </div>
            {/* CARGA / F2*/}
            {/* AEREO*/}
        </>
    );
}