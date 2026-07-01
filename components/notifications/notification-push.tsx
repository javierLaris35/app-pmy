"use client";

import { useEffect, useRef } from "react";
import { toast } from "@/lib/toast";
import {
  LogIn, LogOut, PackageCheck, PackageMinus, Truck, Undo2, ClipboardList,
  Warehouse, Boxes, ArrowRightLeft, Activity,
} from "lucide-react";
import { useNotifications } from "@/hooks/services/notifications/use-notifications";
import type { NotificationItem } from "@/lib/services/notifications";

const STYLE: Record<string, { icon: any; grad: string }> = {
  consolidados: { icon: ClipboardList, grad: "from-purple-500 to-fuchsia-500" },
  desembarques: { icon: PackageCheck, grad: "from-cyan-500 to-sky-500" },
  salidas_ruta: { icon: PackageMinus, grad: "from-orange-500 to-amber-500" },
  devoluciones: { icon: Undo2, grad: "from-rose-500 to-pink-500" },
  recolecciones: { icon: Truck, grad: "from-amber-500 to-yellow-500" },
  inventarios: { icon: Boxes, grad: "from-emerald-500 to-green-500" },
  cierre_ruta: { icon: Truck, grad: "from-indigo-500 to-blue-500" },
  traslados: { icon: ArrowRightLeft, grad: "from-blue-500 to-indigo-500" },
  bodega: { icon: Warehouse, grad: "from-teal-500 to-emerald-500" },
  dhl: { icon: Truck, grad: "from-yellow-500 to-amber-600" },
  auth: { icon: LogIn, grad: "from-violet-500 to-indigo-500" },
  default: { icon: Activity, grad: "from-slate-500 to-slate-600" },
};

function showPush(n: NotificationItem) {
  const s = STYLE[n.module] || STYLE.default;
  const Icon = n.kind === "session" ? (n.message.includes("cerró") ? LogOut : LogIn) : s.icon;
  const moduleLabel = (n.module || "").replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  const subtitle = [moduleLabel, n.location].filter(Boolean).join(" · ");
  // API NATIVA de sileo (vía adaptador @/lib/toast): title + description + icon.
  // Antes se usaba toast.custom con una burbuja propia (card/shadow de 340px), que
  // sileo envolvía en su propio chrome → se veía "sobrepuesta". Ahora la pinta sileo.
  toast.info(n.message, {
    description: subtitle || undefined,
    icon: <Icon className="h-5 w-5" />,
    duration: 6000,
  });
}

/** Detecta notificaciones nuevas (vía polling) y muestra una burbuja push. Renderiza null. */
export function NotificationPush() {
  const { items } = useNotifications();
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    if (!items.length) return;
    const newest = Math.max(...items.map((i) => new Date(i.createdAt).getTime()));

    // Primera carga: no avisar de lo ya existente, solo fijar la marca.
    if (lastTsRef.current === null) {
      lastTsRef.current = newest;
      return;
    }
    const fresh = items
      .filter((i) => new Date(i.createdAt).getTime() > (lastTsRef.current as number))
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));

    if (fresh.length) {
      fresh.slice(-3).forEach((n) => showPush(n)); // máximo 3 burbujas
      lastTsRef.current = newest;
    }
  }, [items]);

  return null;
}
