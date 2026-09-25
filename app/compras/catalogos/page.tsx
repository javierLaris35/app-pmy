"use client";

import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { withAuth } from "@/hoc/withAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Plus } from "lucide-react";
import { ProductsTab } from "@/components/maintenance/catalog/products-tab";
import { KindCatalogTab, UnitsTab } from "@/components/maintenance/catalog/kind-catalog-tab";
import { SuppliersTab } from "@/components/maintenance/catalog/suppliers-tab";

const TABS = {
  productos: { label: "Productos", newLabel: "Nuevo producto" },
  piezas: { label: "Piezas", newLabel: "Nueva pieza" },
  insumos: { label: "Insumos", newLabel: "Nuevo insumo" },
  servicios: { label: "Servicios de proveedor", newLabel: "Nuevo servicio de proveedor" },
  presentaciones: { label: "Presentaciones", newLabel: "Nueva presentación" },
  proveedores: { label: "Proveedores", newLabel: "Nuevo proveedor" },
} as const;
type TabKey = keyof typeof TABS;

/**
 * Catálogos de Compras. Piezas, insumos y servicios son catálogos independientes que sirven como
 * categoría de los productos; cada producto tiene precios por proveedor con su calidad en estrellas.
 */
function CatalogosComprasPage() {
  const [tab, setTab] = useState<TabKey>("productos");
  const [signals, setSignals] = useState<Record<TabKey, number>>({
    productos: 0, piezas: 0, insumos: 0, servicios: 0, presentaciones: 0, proveedores: 0,
  });

  return (
    <AppLayout>
      <div className="flex min-h-screen flex-col gap-4 p-4 md:p-5">
        <OperationHeader
          icon={BookOpen}
          title="Catálogos de compras"
          description="Productos, piezas, insumos, presentaciones y proveedores"
          actions={
            <Button size="sm" onClick={() => setSignals((x) => ({ ...x, [tab]: x[tab] + 1 }))}>
              <Plus className="mr-1.5 h-4 w-4" /> {TABS[tab].newLabel}
            </Button>
          }
        />
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="w-full">
          <TabsList className="h-auto flex-wrap">
            {(Object.keys(TABS) as TabKey[]).map((k) => <TabsTrigger key={k} value={k}>{TABS[k].label}</TabsTrigger>)}
          </TabsList>
          <TabsContent value="productos" className="mt-4"><ProductsTab createSignal={signals.productos} /></TabsContent>
          <TabsContent value="piezas" className="mt-4"><KindCatalogTab kind="pieza" createSignal={signals.piezas} /></TabsContent>
          <TabsContent value="insumos" className="mt-4"><KindCatalogTab kind="insumo" createSignal={signals.insumos} /></TabsContent>
          <TabsContent value="servicios" className="mt-4"><KindCatalogTab kind="servicio" createSignal={signals.servicios} /></TabsContent>
          <TabsContent value="presentaciones" className="mt-4"><UnitsTab createSignal={signals.presentaciones} /></TabsContent>
          <TabsContent value="proveedores" className="mt-4"><SuppliersTab createSignal={signals.proveedores} /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

export default withAuth(CatalogosComprasPage, "mttoVehiculos.catalogos");
