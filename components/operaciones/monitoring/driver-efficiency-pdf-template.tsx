"use client"

import { Package, AlertTriangle, Activity } from "lucide-react"
import { PieChart, Pie, Cell } from "recharts"

// =====================================================================
// COMPONENTE PLANTILLA PARA EL REPORTE PDF (OCULTO EN PANTALLA)
// =====================================================================
export const DriverEfficiencyPDFTemplate = ({ data, reportRef }: { data: any[], reportRef: any }) => {
  return (
    <div className="absolute top-[-9999px] left-[-9999px]">
      <div ref={reportRef} className="w-[1100px] bg-[#f8fafc] p-8 font-sans text-sm">
        <div className="flex justify-between items-end mb-6 border-b pb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Eficiencia Operativa de Repartidores</h2>
            <p className="text-slate-500">Reporte de Desempeño Logístico y Liquidaciones</p>
          </div>
          <div className="text-right text-slate-400 text-xs">
            Generado: {new Date().toLocaleString('es-MX')}
          </div>
        </div>

        <div className="space-y-4">
          {data.map((route, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">

              {/* BLOQUE 1: Info del Chofer */}
              <div className="w-[220px] space-y-3">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Chofer</p>
                  <p className="font-bold text-slate-800 text-base leading-tight">{route.driver}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">Vehículo</p>
                  <p className="font-semibold text-slate-700">{route.plates !== "N/A" ? route.plates : route.vehicle}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">Estado de Ruta</p>
                  <span className="inline-flex items-center gap-1.5 py-0.5 px-2 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                    En Progreso / Histórico
                  </span>
                </div>
              </div>

              {/* BLOQUE 2: Eficiencia y Cobros */}
              <div className="w-[180px] space-y-6">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Eficiencia</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Activity className={`h-5 w-5 ${route.efectividad >= 90 ? 'text-emerald-500' : route.efectividad >= 75 ? 'text-amber-500' : 'text-rose-500'}`} />
                    <span className="text-2xl font-bold text-slate-800">{route.efectividad}%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Rendimiento general</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Cobros a Liquidar</p>
                  <p className="text-2xl font-bold text-blue-600">${route.cobrosALiquidar.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                </div>
              </div>

              {/* BLOQUE 3: Entregas y Fallos */}
              <div className="w-[180px] space-y-6">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Entrega</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="bg-emerald-100 p-1.5 rounded-md"><Package className="h-4 w-4 text-emerald-600" /></div>
                    <span className="text-2xl font-bold text-slate-800">{route.entregado}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Paquetes entregados</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">No Entrega (DEX)</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="bg-rose-100 p-1.5 rounded-md"><AlertTriangle className="h-4 w-4 text-rose-600" /></div>
                    <span className="text-2xl font-bold text-slate-800">{route.devuelto}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Paquetes devueltos</p>
                </div>
              </div>

              {/* BLOQUE 4: Gráfica de Dona */}
              <div className="w-[320px] flex items-center justify-end gap-6">
                <div className="text-xs space-y-2.5 text-slate-500">
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-blue-500"></div> En Ruta <span className="font-medium text-slate-700 ml-auto">{route.enRuta}</span></div>
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-amber-400"></div> En Bodega <span className="font-medium text-slate-700 ml-auto">{route.pendiente}</span></div>
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></div> Entregados <span className="font-medium text-slate-700 ml-auto">{route.entregado}</span></div>
                  <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm bg-rose-500"></div> No Entregados <span className="font-medium text-slate-700 ml-auto">{route.devuelto}</span></div>
                </div>

                <div className="relative w-[130px] h-[130px] flex items-center justify-center">
                  <div className="absolute inset-0">
                    <PieChart width={130} height={130}>
                      <Pie
                        data={[
                          { value: route.enRuta || 0, color: "#3b82f6" },
                          { value: route.pendiente || 0, color: "#fbbf24" },
                          { value: route.entregado || 0, color: "#10b981" },
                          { value: route.devuelto || 0, color: "#f43f5e" }
                        ]}
                        innerRadius={50}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="value"
                        isAnimationActive={false} // IMPORTANTE PARA EL PDF
                        stroke="none"
                      >
                        {[
                          { value: route.enRuta || 0, color: "#3b82f6" },
                          { value: route.pendiente || 0, color: "#fbbf24" },
                          { value: route.entregado || 0, color: "#10b981" },
                          { value: route.devuelto || 0, color: "#f43f5e" }
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </div>
                  <div className="flex flex-col items-center justify-center z-10">
                    <span className="text-[10px] text-slate-400 text-center leading-tight">Total de<br/>paquetes</span>
                    <span className="text-2xl font-bold text-slate-800 mt-0.5">{route.total}</span>
                  </div>
                </div>
              </div>

            </div>
          ))}

          {data.length === 0 && (
            <div className="text-center py-10 text-slate-500">No hay datos para generar el reporte en este rango.</div>
          )}
        </div>
      </div>
    </div>
  )
}
