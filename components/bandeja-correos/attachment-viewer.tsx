"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { downloadInboxAttachment, getAttachmentObjectUrl, getAttachmentPreview } from "@/lib/services/inbox";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Download, FileQuestion, Loader2 } from "lucide-react";

export interface ViewerTarget {
  id: string;
  filename: string;
  contentType?: string;
  /** Hoja con la que abre (p. ej. "F2" desde la tarjeta de F2). */
  sheet?: string;
}

const TRACKING = /^(tracking\s*(number|no\.?)?|gu[ií]a|numero_guia|nro_guia)$/i;

/** Abre un archivo del correo dentro de la app: Excel por hojas, PDF e imágenes. */
export function AttachmentViewer({ target, onClose }: { target: ViewerTarget | null; onClose: () => void }) {
  const { data, isLoading, error } = useSWR(target ? ["/inbox/preview", target.id] : null, () => getAttachmentPreview(target!.id));
  const [sheet, setSheet] = useState<string>("");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!data?.sheets?.length) return;
    const wanted = target?.sheet && data.sheets.find((s) => s.name === target.sheet);
    setSheet(wanted ? wanted.name : data.sheets[0].name);
  }, [data, target?.sheet]);

  // PDF / imagen: se pide el archivo con la sesión y se muestra desde memoria.
  useEffect(() => {
    let url: string | null = null;
    if (target && (data?.type === "pdf" || data?.type === "image")) {
      getAttachmentObjectUrl(target.id, data.type === "pdf" ? "application/pdf" : target.contentType)
        .then((u) => {
          url = u;
          setBlobUrl(u);
        })
        .catch(() => toast.error("No se pudo abrir el archivo"));
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
      setBlobUrl(null);
    };
  }, [target, data?.type]);

  const current = useMemo(() => data?.sheets?.find((s) => s.name === sheet) ?? data?.sheets?.[0], [data, sheet]);
  const headerIdx = useMemo(() => current?.rows.slice(0, 15).findIndex((r) => r.some((c) => TRACKING.test(c))) ?? -1, [current]);
  const width = useMemo(() => Math.max(0, ...(current?.rows.map((r) => r.length) ?? [0])), [current]);

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[88vh] w-[96vw] max-w-6xl flex-col gap-3 p-4">
        <DialogHeader className="flex-row items-center gap-3 space-y-0 pr-8">
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate text-base">{target?.filename}</DialogTitle>
            <DialogDescription className="text-xs">
              {data?.type === "sheet" && current
                ? `${data.sheets!.length} ${data.sheets!.length === 1 ? "hoja" : "hojas"} · hoja "${current.name}": ${Math.max(0, current.totalRows - (headerIdx + 1))} filas de datos`
                : "Vista del archivo tal como llegó en el correo"}
            </DialogDescription>
          </div>
          {target && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => downloadInboxAttachment(target.id, target.filename).catch(() => toast.error("No se pudo descargar el archivo"))}
            >
              <Download className="h-4 w-4" /> Descargar
            </Button>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Abriendo archivo…
          </div>
        ) : error ? (
          <div className="flex flex-1 items-center justify-center text-sm text-red-600">No se pudo abrir el archivo.</div>
        ) : data?.type === "sheet" && current ? (
          <>
            {data.sheets!.length > 1 && (
              <Tabs value={current.name} onValueChange={setSheet}>
                <TabsList>
                  {data.sheets!.map((s) => (
                    <TabsTrigger key={s.name} value={s.name} className="gap-1.5">
                      {s.name}
                      <span className="rounded bg-slate-200/70 px-1 text-[10px] tabular-nums text-slate-600">{s.totalRows}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
            <div className="min-h-0 flex-1 overflow-auto rounded-md border">
              <table className="w-max min-w-full border-collapse text-xs">
                <tbody>
                  {current.rows.map((r, i) => (
                    <tr
                      key={i}
                      className={cn(
                        "border-b border-slate-100",
                        i === headerIdx && "sticky top-0 z-10 bg-slate-100 font-semibold text-slate-800 shadow-[0_1px_0_0_#e2e8f0]",
                        i < headerIdx && "bg-amber-50/60 text-slate-500",
                      )}
                    >
                      <td className="sticky left-0 bg-inherit px-2 py-1 text-right tabular-nums text-slate-400">{i + 1}</td>
                      {Array.from({ length: width }, (_, j) => (
                        <td key={j} className="max-w-[260px] truncate whitespace-nowrap border-l border-slate-100 px-2 py-1" title={r[j] ?? ""}>
                          {r[j] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {current.truncated && <p className="text-xs text-slate-500">Se muestran las primeras {current.rows.length} filas de {current.totalRows}. Descárgalo para verlo completo.</p>}
          </>
        ) : data?.type === "pdf" ? (
          blobUrl ? (
            <iframe title={target?.filename} src={blobUrl} className="min-h-0 w-full flex-1 rounded-md border" />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Abriendo PDF…
            </div>
          )
        ) : data?.type === "image" ? (
          blobUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={blobUrl} alt={target?.filename ?? "Imagen del correo"} className="mx-auto max-h-full min-h-0 flex-1 object-contain" />
          )
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-slate-500">
            <FileQuestion className="h-6 w-6" /> Este tipo de archivo no se puede ver aquí; descárgalo para abrirlo.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
