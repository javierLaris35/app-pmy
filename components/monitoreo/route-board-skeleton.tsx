import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Loading state del tablero: dibuja la silueta de KPIs + cuadros en vez de un spinner genérico. */
export function RouteBoardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 p-4">
              <Skeleton className="h-11 w-11 shrink-0 rounded-[11px]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-10" />
                <Skeleton className="h-3 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col overflow-hidden rounded-xl border">
            <div className="flex items-center justify-between gap-2 bg-muted/40 px-3.5 py-2.5">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <div className="flex flex-col gap-2.5 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="space-y-1.5 text-right">
                  <Skeleton className="ml-auto h-3.5 w-24" />
                  <Skeleton className="ml-auto h-3 w-28" />
                </div>
              </div>
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-5 w-24 rounded-md" />
            </div>
            <div className="mt-auto flex items-center justify-between gap-2 border-t bg-muted/20 px-3.5 py-2.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-7 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Loading state del detalle de una ruta: silueta de alertas + KPIs + paradas/mapa, en vez de un spinner. */
export function RouteDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border bg-white p-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>

      <Skeleton className="h-4 w-72" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card className="md:col-span-1"><CardContent className="space-y-2 p-4">
          <Skeleton className="h-3 w-20 bg-white/30" />
          <Skeleton className="h-8 w-24 bg-white/30" />
          <Skeleton className="h-3 w-28 bg-white/30" />
        </CardContent></Card>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="space-y-2 p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-3 w-20" />
          </CardContent></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-20" />
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Skeleton className="h-[300px] w-full rounded-xl" />
          <Card><CardContent className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between border-b py-2 last:border-b-0">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </CardContent></Card>
        </div>
      </div>
    </div>
  );
}
