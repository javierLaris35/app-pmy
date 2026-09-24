"use client";

import { useState } from "react";
import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { withAuth } from "@/hoc/withAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ServicesTab } from "@/components/maintenance/catalog/services-tab";
import { CategoriesTab } from "@/components/maintenance/catalog/categories-tab";
import { SuppliersTab } from "@/components/maintenance/catalog/suppliers-tab";

/** Catálogos de mantenimiento. Son globales (no dependen de sucursal), por eso no llevan selector. */
const NEW_LABEL = { proveedores: "Nuevo proveedor", servicios: "Nuevo servicio", categorias: "Nueva categoría" } as const;
type TabKey = keyof typeof NEW_LABEL;

function ProveedoresMttoPage() {
  const [tab, setTab] = useState<TabKey>("proveedores");
  const [signals, setSignals] = useState<Record<TabKey, number>>({ proveedores: 0, servicios: 0, categorias: 0 });
  return (
    <AppLayout>
      <div className="flex min-h-screen flex-col gap-4 p-4 md:p-5">
        <OperationHeader
          icon={Store}
          title="Proveedores y servicios"
          description="A quién le compras y precios de referencia"
          actions={
            <Button size="sm" onClick={() => setSignals((x) => ({ ...x, [tab]: x[tab] + 1 }))}>
              <Plus className="mr-1.5 h-4 w-4" /> {NEW_LABEL[tab]}
            </Button>
          }
        />
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="w-full">
          <TabsList>
            <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
            <TabsTrigger value="servicios">Servicios y precios de referencia</TabsTrigger>
            <TabsTrigger value="categorias">Categorías</TabsTrigger>
          </TabsList>
          <TabsContent value="proveedores" className="mt-4"><SuppliersTab createSignal={signals.proveedores} /></TabsContent>
          <TabsContent value="servicios" className="mt-4"><ServicesTab createSignal={signals.servicios} /></TabsContent>
          <TabsContent value="categorias" className="mt-4"><CategoriesTab createSignal={signals.categorias} /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

export default withAuth(ProveedoresMttoPage, "mttoVehiculos.catalogos");
