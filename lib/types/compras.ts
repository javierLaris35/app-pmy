/** Tipos de catálogos del módulo Compras (espejo de pmy-api). */

export type ProductKind = "pieza" | "insumo" | "servicio" | "equipo";

export interface UnitOfMeasure {
  id: string;
  name: string;
  abbreviation?: string | null;
  active: boolean;
}

export interface ProductCategory {
  id: string;
  name: string;
  kind: ProductKind;
  /** Sinónimos separados por coma. */
  keywords?: string | null;
  sortOrder: number;
  active: boolean;
}

export interface ProductOffer {
  id?: string;
  supplierId: string;
  supplier?: { id: string; name: string };
  unitId?: string | null;
  unit?: UnitOfMeasure | null;
  price: number;
  quality?: number | null;
  lastQuotedAt?: string | null;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  category?: ProductCategory | null;
  brand?: string | null;
  partNumber?: string | null;
  unitId?: string | null;
  unit?: UnitOfMeasure | null;
  active: boolean;
  offers: ProductOffer[];
}

export const KIND_LABEL: Record<ProductKind, string> = { pieza: "Pieza", insumo: "Insumo", servicio: "Servicio", equipo: "Equipo" };
export const KIND_PLURAL: Record<ProductKind, string> = { pieza: "Piezas", insumo: "Insumos", servicio: "Servicios", equipo: "Equipo" };

/** Mejor oferta (precio más bajo) de un producto. */
export const bestOffer = (p: Product): ProductOffer | undefined =>
  [...(p.offers ?? [])].sort((a, b) => Number(a.price) - Number(b.price))[0];

/** Renglón de la ficha técnica de una unidad (pieza o insumo que lleva). */
export interface VehicleSpecItem {
  id: string;
  vehicleId: string;
  categoryId: string;
  category?: ProductCategory;
  productId?: string | null;
  product?: Product | null;
  quantity: number;
  unitId?: string | null;
  unit?: UnitOfMeasure | null;
  notes?: string | null;
}

/** Servicio predefinido de mantenimiento (receta opcional de piezas/insumos). */
export interface ServiceTemplateItem {
  id?: string;
  categoryId: string;
  category?: ProductCategory;
  quantity: number;
  unitId?: string | null;
  unit?: UnitOfMeasure | null;
}

export interface ServiceTemplate {
  id: string;
  name: string;
  description?: string | null;
  vehicleType?: string | null;
  keywords?: string | null;
  active: boolean;
  items: ServiceTemplateItem[];
}
