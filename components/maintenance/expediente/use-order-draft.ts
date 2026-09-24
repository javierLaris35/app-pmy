"use client";

import { useEffect, useState } from "react";
import { PurchaseOrder, PurchaseOrderItem } from "@/lib/types/maintenance";

export interface OrderDraft {
  items: PurchaseOrderItem[];
  setItems: (items: PurchaseOrderItem[]) => void;
  notes: string;
  setNotes: (v: string) => void;
  contactId: string;
  setContactId: (v: string) => void;
  /** ¿Cambió observaciones o contacto respecto a lo guardado? */
  metaChanged: boolean;
}

/**
 * Copia editable de la orden (partidas, observaciones, contacto). Vive en la página para que las
 * acciones del header (Autorizar, Mandar otra vez…) usen lo que el usuario está viendo/editando abajo.
 */
export function useOrderDraft(order?: PurchaseOrder): OrderDraft {
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [notes, setNotes] = useState("");
  const [contactId, setContactId] = useState("");

  useEffect(() => {
    if (!order) return;
    setItems(order.items.map((i) => ({ ...i, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })));
    setNotes(order.notes ?? "");
    setContactId(order.contactId ?? "");
  }, [order]);

  return {
    items, setItems, notes, setNotes, contactId, setContactId,
    metaChanged: !!order && (notes !== (order.notes ?? "") || contactId !== (order.contactId ?? "")),
  };
}
