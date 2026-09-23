"use client";

import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { withAuth } from "@/hoc/withAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Store } from "lucide-react";
import { ServicesTab } from "@/components/maintenance/catalog/services-tab";
import { CategoriesTab } from "@/components/maintenance/catalog/categories-tab";
import { SuppliersTab } from "@/components/maintenance/catalog/suppliers-tab";

/** Catálogos de mantenimiento. Son globales (no dependen de sucursal), por eso no llevan selector. */
function ProveedoresMttoPage() {
  return (
    <AppLayout>
      <div className="flex min-h-screen flex-col gap-4 p-4 md:p-5">
        <OperationHeader
          icon={Store}
          title="Proveedores y servicios"
          description="A quién le compras y cuánto cuesta cada servicio como referencia"
        />
        <Tabs defaultValue="proveedores" className="w-full">
          <TabsList>
            <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
            <TabsTrigger value="servicios">Servicios y precios de referencia</TabsTrigger>
            <TabsTrigger value="categorias">Categorías</TabsTrigger>
          </TabsList>
          <TabsContent value="proveedores" className="mt-4"><SuppliersTab /></TabsContent>
          <TabsContent value="servicios" className="mt-4"><ServicesTab /></TabsContent>
          <TabsContent value="categorias" className="mt-4"><CategoriesTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

export default withAuth(ProveedoresMttoPage, "mttoVehiculos.catalogos");
