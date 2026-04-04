"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Warehouse,
  Package,
  RotateCw,
  Check,
  X,
  AlertCircle,
  Trash2,
  Download,
  Barcode,
  Loader2,
  CheckCircle2,
  Clock,
  TrendingUp,
  MapPin,
  User,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppLayout } from "../../app-layout";

interface OcurrePackage {
  id: string;
  tracking: string;
  tipo: "ocurre" | "entrega";
  descripcion: string;
  destinatario: string;
  destino: string;
  almacen?: string;
  responsable?: string;
  timestamp: string;
}

export default function PackageReception() {
  const [activeTab, setActiveTab] = useState<"ocurre" | "entrega">("ocurre");
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPackage, setCurrentPackage] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [registeredPackages, setRegisteredPackages] = useState<OcurrePackage[]>(
    [],
  );
  const [almacenType, setAlmacenType] = useState("");
  const [responsable, setResponsable] = useState("");

  const handleScan = async () => {
    if (!barcode.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Mock - simular búsqueda
      await new Promise((resolve) => setTimeout(resolve, 600));

      const mockPackage = {
        tracking: barcode.toUpperCase(),
        descripcion: "Caja Master - Electrónicos",
        destinatario: "Cliente " + barcode.substring(0, 4).toUpperCase(),
        destino: "Zona 10, Guatemala City",
      };

      setCurrentPackage(mockPackage);
    } catch (err) {
      setError("Paquete no encontrado en el sistema");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    if (!currentPackage) return;

    if (activeTab === "entrega" && !almacenType) {
      setError("Selecciona el tipo de almacén de destino");
      return;
    }

    const newRegister: OcurrePackage = {
      id: Date.now().toString(),
      tracking: currentPackage.tracking,
      tipo: activeTab,
      descripcion: currentPackage.descripcion,
      destinatario: currentPackage.destinatario,
      destino: currentPackage.destino,
      almacen: almacenType,
      responsable: responsable || undefined,
      timestamp: new Date().toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setRegisteredPackages([newRegister, ...registeredPackages]);
    setSuccess(true);
    setCurrentPackage(null);
    setBarcode("");
    setAlmacenType("");
    setResponsable("");

    setTimeout(() => setSuccess(false), 3000);
  };

  const handleClear = () => {
    setCurrentPackage(null);
    setBarcode("");
    setError(null);
    setAlmacenType("");
    setResponsable("");
  };

  const handleDelete = (id: string) => {
    setRegisteredPackages(registeredPackages.filter((p) => p.id !== id));
  };

  const handleExport = () => {
    const filtered = registeredPackages.filter((p) => p.tipo === activeTab);
    const csv = [
      [
        "Tracking",
        "Descripción",
        "Destinatario",
        "Destino",
        activeTab === "entrega" ? "Almacén" : "Tipo",
        "Hora",
      ],
      ...filtered.map((p) => [
        p.tracking,
        p.descripcion,
        p.destinatario,
        p.destino,
        p.almacen || p.tipo,
        p.timestamp,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `registro-${activeTab}-${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.click();
  };

  const filteredPackages = registeredPackages.filter(
    (p) => p.tipo === activeTab,
  );
  const ocurreCount = registeredPackages.filter(
    (p) => p.tipo === "ocurre",
  ).length;
  const entregaCount = registeredPackages.filter(
    (p) => p.tipo === "entrega",
  ).length;

  const activeColor = activeTab === "ocurre" ? "amber" : "emerald";

  return (
    <AppLayout>
      <div className="text-slate-900 font-sans">
        <div className="sticky top-0 z-10 ">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${activeTab === "ocurre" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
              >
                <Warehouse className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Terminal de Registro
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Estación Bodega Central
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRegisteredPackages([])}
                className="text-slate-500 hover:text-slate-900"
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Reiniciar Sesión
              </Button>
              <Button
                onClick={handleExport}
                disabled={filteredPackages.length === 0}
                className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </div>

        <div className="pt-8 space-y-8">
          {/* Layout Principal Asimétrico */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Columna Izquierda: Controles y Escáner (Más ancha) */}
            <div className="lg:col-span-2 space-y-6">
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as any)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-200/50 rounded-xl h-14">
                  <TabsTrigger
                    value="ocurre"
                    className="rounded-lg text-base font-semibold data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm transition-all"
                  >
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Registro Ocurre
                  </TabsTrigger>
                  <TabsTrigger
                    value="entrega"
                    className="rounded-lg text-base font-semibold data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm transition-all"
                  >
                    <Package className="h-5 w-5 mr-2" />
                    Entregado en Bodega
                  </TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-6 outline-none">
                  <Card
                    className={`border-2 shadow-sm transition-colors duration-300 ${activeTab === "ocurre" ? "border-amber-200" : "border-emerald-200"}`}
                  >
                    <CardHeader className="pb-4 border-b border-slate-100 bg-slate-50/50">
                      <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                        <Barcode className="h-6 w-6 text-slate-400" />
                        Captura de Código
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="flex gap-4">
                        <Input
                          placeholder="Escanea o teclea el tracking..."
                          value={barcode}
                          onChange={(e) => setBarcode(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && handleScan()}
                          autoFocus
                          className="h-20 text-3xl font-mono uppercase bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-900 rounded-xl"
                        />
                        <Button
                          onClick={handleScan}
                          disabled={!barcode.trim() || loading}
                          className={`h-20 px-8 text-lg font-bold rounded-xl shadow-sm transition-all ${
                            activeTab === "ocurre"
                              ? "bg-amber-600 hover:bg-amber-700 text-white"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          }`}
                        >
                          {loading ? (
                            <Loader2 className="h-8 w-8 animate-spin" />
                          ) : (
                            "BUSCAR"
                          )}
                        </Button>
                      </div>

                      {/* Mensajes de feedback */}
                      {error && (
                        <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700 animate-in slide-in-from-top-2">
                          <AlertCircle className="h-5 w-5" />
                          <span className="font-medium">{error}</span>
                        </div>
                      )}
                      {success && (
                        <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-700 animate-in slide-in-from-top-2">
                          <CheckCircle2 className="h-5 w-5" />
                          <span className="font-medium">
                            Registro guardado exitosamente.
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Historial Reciente */}
                  <Card className="mt-8 border-slate-200 shadow-sm">
                    <div className="p-0 overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-6 py-4 font-semibold">
                              Tracking / Hora
                            </th>
                            <th className="px-6 py-4 font-semibold">Destino</th>
                            {activeTab === "entrega" && (
                              <th className="px-6 py-4 font-semibold">
                                Ubicación
                              </th>
                            )}
                            <th className="px-6 py-4 text-right font-semibold">
                              Acción
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPackages.length === 0 ? (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-6 py-12 text-center text-slate-500"
                              >
                                No hay registros en esta sesión.
                              </td>
                            </tr>
                          ) : (
                            filteredPackages.map((pkg) => (
                              <tr
                                key={pkg.id}
                                className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors"
                              >
                                <td className="px-6 py-3">
                                  <div className="font-mono font-bold text-slate-900">
                                    {pkg.tracking}
                                  </div>
                                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                    <Clock className="h-3 w-3" />{" "}
                                    {pkg.timestamp}
                                  </div>
                                </td>
                                <td className="px-6 py-3">
                                  <div className="font-medium text-slate-700 truncate max-w-[200px]">
                                    {pkg.destinatario}
                                  </div>
                                </td>
                                {activeTab === "entrega" && (
                                  <td className="px-6 py-3">
                                    <Badge
                                      variant="outline"
                                      className="bg-white"
                                    >
                                      {pkg.almacen}
                                    </Badge>
                                  </td>
                                )}
                                <td className="px-6 py-3 text-right">
                                  <Button
                                    onClick={() => handleDelete(pkg.id)}
                                    variant="ghost"
                                    size="icon"
                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Columna Derecha: El "Ticket" o Etiqueta de Envío */}
            <div className="lg:col-span-1">
              <div
                className={`sticky top-28 transition-opacity duration-300 ${currentPackage ? "opacity-100" : "opacity-50 pointer-events-none"}`}
              >
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col h-full">
                  {/* Cabecera del Ticket */}
                  <div
                    className={`p-6 border-b-4 ${activeTab === "ocurre" ? "border-amber-500 bg-amber-50" : "border-emerald-500 bg-emerald-50"}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <Badge
                        className={
                          activeTab === "ocurre"
                            ? "bg-amber-600"
                            : "bg-emerald-600"
                        }
                      >
                        {activeTab === "ocurre"
                          ? "PAQUETE OCURRE"
                          : "ENTREGA BODEGA"}
                      </Badge>
                      <Barcode className="h-8 w-12 text-slate-400 opacity-50" />
                    </div>
                    <h3 className="text-3xl font-mono font-black text-slate-900 tracking-wider">
                      {currentPackage?.tracking || "----"}
                    </h3>
                  </div>

                  {/* Cuerpo del Ticket */}
                  <div className="p-6 space-y-6 flex-1 bg-white">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Descripción
                      </p>
                      <p className="font-medium text-slate-900 text-lg">
                        {currentPackage?.descripcion || "Pendiente de escaneo"}
                      </p>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="flex gap-3">
                        <User className="h-5 w-5 text-slate-400 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Destinatario
                          </p>
                          <p className="font-medium text-slate-700">
                            {currentPackage?.destinatario || "--"}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <MapPin className="h-5 w-5 text-slate-400 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Destino Final
                          </p>
                          <p className="font-medium text-slate-700">
                            {currentPackage?.destino || "--"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Formularios adicionales para 'Entrega' */}
                    {activeTab === "entrega" && currentPackage && (
                      <div className="pt-6 mt-6 border-t border-dashed border-slate-300 space-y-4">
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">
                            Ubicación Asignada *
                          </label>
                          <Select
                            value={almacenType}
                            onValueChange={setAlmacenType}
                          >
                            <SelectTrigger className="mt-1 h-12 bg-slate-50">
                              <SelectValue placeholder="Selecciona pasillo/bodega..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bodega-central">
                                Bodega Central (A1)
                              </SelectItem>
                              <SelectItem value="bodega-norte">
                                Bodega Norte (B2)
                              </SelectItem>
                              <SelectItem value="bodega-sur">
                                Bodega Sur (C3)
                              </SelectItem>
                              <SelectItem value="oficina">
                                Retención Oficina
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">
                            Firma / Recibe
                          </label>
                          <Input
                            placeholder="Nombre (Opcional)"
                            value={responsable}
                            onChange={(e) => setResponsable(e.target.value)}
                            className="mt-1 h-12 bg-slate-50"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Acciones del Ticket */}
                  <div className="p-4 bg-slate-50 border-t border-slate-200 grid grid-cols-2 gap-3">
                    <Button
                      onClick={handleClear}
                      variant="outline"
                      className="h-12 bg-white"
                    >
                      <X className="h-4 w-4 mr-2" /> Cancelar
                    </Button>
                    <Button
                      onClick={handleRegister}
                      disabled={!currentPackage}
                      className={`h-12 text-white shadow-md ${
                        activeTab === "ocurre"
                          ? "bg-amber-600 hover:bg-amber-700"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      <Check className="h-5 w-5 mr-2" /> Procesar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
