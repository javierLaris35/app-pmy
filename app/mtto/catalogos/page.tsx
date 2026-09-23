"use client";

import { AppLayout } from "@/components/app-layout";
import { OperationHeader } from "@/components/shared/operation-header";
import { withAuth } from "@/hoc/withAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen } from "lucide-react";
import { ServicesTab } from "@/components/maintenance/catalog/services-tab";
import { CategoriesTab } from "@/components/maintenance/catalog/categories-tab";
import { SuppliersTab } from "@/components/maintenance/catalog/suppliers-tab";

/** Catálogos de mantenimiento. Son globales (no dependen de sucursal), por eso no llevan selector. */
function CatalogosMttoPage() {
  return (
    <AppLayout>
      <div className="flex min-h-screen flex-col gap-4 p-4 md:p-5">
        <OperationHeader
          icon={BookOpen}
          title="Catálogos de mantenimiento"
          description="Servicios con precio de referencia, categorías y proveedores"
        />
        <Tabs defaultValue="servicios" className="w-full">
          <TabsList>
            <TabsTrigger value="servicios">Servicios</TabsTrigger>
            <TabsTrigger value="categorias">Categorías</TabsTrigger>
            <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
          </TabsList>
          <TabsContent value="servicios" className="mt-4"><ServicesTab /></TabsContent>
          <TabsContent value="categorias" className="mt-4"><CategoriesTab /></TabsContent>
          <TabsContent value="proveedores" className="mt-4"><SuppliersTab /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

export default withAuth(CatalogosMttoPage, "mttoVehiculos.catalogos");
