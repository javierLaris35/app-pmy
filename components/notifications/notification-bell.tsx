"use client";

import { useMemo, useState } from "react";
import {
  Bell, CheckCheck, LogIn, LogOut, PackageCheck, PackageMinus, Truck,
  Undo2, ClipboardList, Warehouse, Boxes, ArrowRightLeft, Activity, Monitor, MapPin,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNotifications } from "@/hooks/services/notifications/use-notifications";
import { markNotificationsRead, NotificationItem } from "@/lib/services/notifications";
import { cn } from "@/lib/utils";

const relativeTime = (d?: string) => {
  if (!d) return "";
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return `hace ${diff}s`;
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
};

const groupLabel = (d: string) => {
  const t = new Date(d).getTime();
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (t >= startToday) return "Hoy";
  if (t >= startToday - 86400000) return "Ayer";
  if (t >= startToday - 6 * 86400000) return "Esta semana";
  return "Anteriores";
};

type Style = { icon: any; iconBg: string; chip: string; accent: string; tint: string };
const MODULE_STYLE: Record<string, Style> = {
  consolidados: { icon: ClipboardList, iconBg: "bg-gradient-to-br from-purple-500 to-fuchsia-500", chip: "bg-purple-100 text-purple-700", accent: "border-l-purple-500", tint: "bg-purple-50/70" },
  desembarques: { icon: PackageCheck, iconBg: "bg-gradient-to-br from-cyan-500 to-sky-500", chip: "bg-cyan-100 text-cyan-700", accent: "border-l-cyan-500", tint: "bg-cyan-50/70" },
  salidas_ruta: { icon: PackageMinus, iconBg: "bg-gradient-to-br from-orange-500 to-amber-500", chip: "bg-orange-100 text-orange-700", accent: "border-l-orange-500", tint: "bg-orange-50/70" },
  devoluciones: { icon: Undo2, iconBg: "bg-gradient-to-br from-rose-500 to-pink-500", chip: "bg-rose-100 text-rose-700", accent: "border-l-rose-500", tint: "bg-rose-50/70" },
  recolecciones: { icon: Truck, iconBg: "bg-gradient-to-br from-amber-500 to-yellow-500", chip: "bg-amber-100 text-amber-700", accent: "border-l-amber-500", tint: "bg-amber-50/70" },
  inventarios: { icon: Boxes, iconBg: "bg-gradient-to-br from-emerald-500 to-green-500", chip: "bg-emerald-100 text-emerald-700", accent: "border-l-emerald-500", tint: "bg-emerald-50/70" },
  cierre_ruta: { icon: Truck, iconBg: "bg-gradient-to-br from-indigo-500 to-blue-500", chip: "bg-indigo-100 text-indigo-700", accent: "border-l-indigo-500", tint: "bg-indigo-50/70" },
  traslados: { icon: ArrowRightLeft, iconBg: "bg-gradient-to-br from-blue-500 to-indigo-500", chip: "bg-blue-100 text-blue-700", accent: "border-l-blue-500", tint: "bg-blue-50/70" },
  bodega: { icon: Warehouse, iconBg: "bg-gradient-to-br from-teal-500 to-emerald-500", chip: "bg-teal-100 text-teal-700", accent: "border-l-teal-500", tint: "bg-teal-50/70" },
  dhl: { icon: Truck, iconBg: "bg-gradient-to-br from-yellow-500 to-amber-600", chip: "bg-amber-100 text-amber-700", accent: "border-l-amber-500", tint: "bg-amber-50/70" },
  auth: { icon: LogIn, iconBg: "bg-gradient-to-br from-violet-500 to-indigo-500", chip: "bg-violet-100 text-violet-700", accent: "border-l-violet-500", tint: "bg-violet-50/70" },
  default: { icon: Activity, iconBg: "bg-gradient-to-br from-slate-500 to-slate-600", chip: "bg-slate-100 text-slate-700", accent: "border-l-slate-400", tint: "bg-slate-50/70" },
};
const styleFor = (n: NotificationItem) => MODULE_STYLE[n.module] || MODULE_STYLE.default;

function Row({ n }: { n: NotificationItem }) {
  const s = styleFor(n);
  const Icon = n.kind === "session" ? (n.message.includes("cerró") ? LogOut : LogIn) : s.icon;
  return (
    <div className={cn("flex gap-3 border-l-2 px-3 py-2.5 transition-colors", n.read ? "border-l-transparent hover:bg-muted/40" : cn(s.accent, s.tint))}>
      <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full text-white shadow-sm", s.iconBg)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug">{n.message}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className={cn("rounded-full px-1.5 py-0.5 font-medium", s.chip)}>{n.module}</span>
          <span>{relativeTime(n.createdAt)}</span>
        </div>
        {n.kind === "session" && (
          <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
            {n.device && <div className="flex items-center gap-1"><Monitor className="h-3 w-3" /> {n.device}</div>}
            <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {n.location || "Ubicación desconocida"}{n.ip ? ` · ${n.ip}` : ""}</div>
          </div>
        )}
      </div>
      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500" />}
    </div>
  );
}

function GroupedList({ items, empty }: { items: NotificationItem[]; empty: string }) {
  const groups = useMemo(() => {
    const out: { label: string; rows: NotificationItem[] }[] = [];
    for (const n of items) {
      const label = groupLabel(n.createdAt as any);
      const last = out[out.length - 1];
      if (last && last.label === label) last.rows.push(n);
      else out.push({ label, rows: [n] });
    }
    return out;
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-muted-foreground">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-muted"><Bell className="h-7 w-7 opacity-40" /></span>
        <span className="text-sm font-medium">{empty}</span>
      </div>
    );
  }
  return (
    <div>
      {groups.map((g) => (
        <div key={g.label}>
          <div className="sticky top-0 z-10 bg-background/95 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
            {g.label}
          </div>
          <div className="divide-y">
            {g.rows.map((n) => <Row key={n.id} n={n} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationBell() {
  const { items, unreadCount, mutate } = useNotifications();
  const [open, setOpen] = useState(false);

  const doMarkRead = async () => { try { await markNotificationsRead(); } catch {} mutate(); };
  const onOpenChange = async (o: boolean) => {
    setOpen(o);
    if (o && unreadCount > 0) doMarkRead();
  };
  const unread = items.filter((n) => !n.read);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full hover:bg-muted" aria-label="Notificaciones">
          <Bell className={cn("h-5 w-5", unreadCount > 0 && "text-indigo-600")} />
          {unreadCount > 0 && (
            <>
              <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] h-[18px] place-items-center rounded-full bg-gradient-to-br from-rose-500 to-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-background">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
              <span className="absolute -right-0.5 -top-0.5 h-[18px] w-[18px] rounded-full bg-rose-500/40 animate-ping" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[380px] overflow-hidden rounded-xl p-0 shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white"><Bell className="h-4 w-4" /></span>
            <div>
              <p className="text-sm font-semibold leading-tight">Notificaciones</p>
              <p className="text-[11px] text-muted-foreground">{unreadCount > 0 ? `${unreadCount} sin leer` : "Estás al día 🎉"}</p>
            </div>
          </div>
          {items.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={doMarkRead}>
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> Leídas
            </Button>
          )}
        </div>

        <Tabs defaultValue="todas">
          <div className="px-3 pt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="todas" className="text-xs">Todas</TabsTrigger>
              <TabsTrigger value="no-leidas" className="text-xs">
                No leídas{unread.length > 0 ? ` (${unread.length})` : ""}
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="todas" className="mt-2">
            <ScrollArea className="h-[380px]"><GroupedList items={items} empty="Sin notificaciones" /></ScrollArea>
          </TabsContent>
          <TabsContent value="no-leidas" className="mt-2">
            <ScrollArea className="h-[380px]"><GroupedList items={unread} empty="Nada pendiente por leer" /></ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
