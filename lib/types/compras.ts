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
