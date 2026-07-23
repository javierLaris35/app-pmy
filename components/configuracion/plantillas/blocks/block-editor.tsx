"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import { EmailBlock, EmailBlockType, EmailDoc, BLOCK_TYPES, newBlock } from "./email-block.types";
import { toast } from "@/lib/toast";

export interface BlockEditorApi {
  getDoc: () => EmailDoc;
  insertVariable: (name: string) => void;
}

interface Props {
  initialDoc?: EmailDoc | null;
  onReady?: (api: BlockEditorApi) => void;
}

/** Editor guiado por bloques. Mantiene el EmailDoc internamente; expone getDoc()/insertVariable() por onReady. */
export default function BlockEditor({ initialDoc, onReady }: Props) {
  const [blocks, setBlocks] = useState<EmailBlock[]>(initialDoc?.blocks ?? []);
  const blocksRef = useRef<EmailBlock[]>(blocks);
  blocksRef.current = blocks;
  // Campo de texto con foco (para insertar variables en el cursor).
  const focusedRef = useRef<{ el: HTMLInputElement | HTMLTextAreaElement; apply: (v: string) => void } | null>(null);
  const readyRef = useRef(false);

  if (!readyRef.current && onReady) {
    readyRef.current = true;
    onReady({
      getDoc: () => ({ blocks: blocksRef.current }),
      insertVariable: (name: string) => {
        const token = `{{${name}}}`;
        const f = focusedRef.current;
        if (!f) { toast.message?.("Coloca el cursor en un campo de texto primero"); return; }
        const el = f.el;
        const start = el.selectionStart ?? el.value.length;
        const end = el.selectionEnd ?? el.value.length;
        const next = el.value.slice(0, start) + token + el.value.slice(end);
        f.apply(next);
        requestAnimationFrame(() => { el.focus(); const p = start + token.length; el.setSelectionRange(p, p); });
      },
    });
  }

  const update = (id: string, patch: Partial<EmailBlock>) =>
    setBlocks((bs) => bs.map((b) => (b.id === id ? ({ ...b, ...patch } as EmailBlock) : b)));
  /** Actualiza el valor de una fila keyValue leyendo el arreglo ACTUAL (evita closures viejas de bindFocus). */
  const patchKeyValueItem = (blockId: string, idx: number, value: string) =>
    setBlocks((bs) => bs.map((bb) =>
      bb.id === blockId && bb.type === 'keyValue'
        ? { ...bb, items: bb.items.map((it, i) => (i === idx ? { ...it, value } : it)) }
        : bb));
  const add = (type: EmailBlockType) => setBlocks((bs) => [...bs, newBlock(type)]);
  const remove = (id: string) => { focusedRef.current = null; setBlocks((bs) => bs.filter((b) => b.id !== id)); };
  const move = (i: number, dir: -1 | 1) => setBlocks((bs) => {
    const j = i + dir; if (j < 0 || j >= bs.length) return bs;
    const c = [...bs]; [c[i], c[j]] = [c[j], c[i]]; return c;
  });

  /** Registra un campo de texto como "enfocado" para insertar variables. */
  const bindFocus = (apply: (v: string) => void) => ({
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { focusedRef.current = { el: e.currentTarget, apply }; },
  });

  return (
    <div className="space-y-3 p-3 overflow-auto h-full">
      {blocks.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Sin bloques. Agrega el primero abajo.</p>}
      {blocks.map((b, i) => (
        <div key={b.id} className="rounded-lg border p-3 space-y-2 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{BLOCK_TYPES.find((t) => t.type === b.type)?.label ?? b.type}</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" onClick={() => move(i, 1)} disabled={i === blocks.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove(b.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          </div>
          <BlockFields block={b} update={update} bindFocus={bindFocus} patchKeyValueItem={patchKeyValueItem} />
        </div>
      ))}

      <div className="flex items-center gap-2 pt-2">
        <Select onValueChange={(v) => add(v as EmailBlockType)}>
          <SelectTrigger className="w-[220px]"><span className="inline-flex items-center gap-1"><Plus className="h-4 w-4" /> Agregar bloque</span></SelectTrigger>
          <SelectContent>
            {BLOCK_TYPES.map((t) => <SelectItem key={t.type} value={t.type}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

function BlockFields({ block: b, update, bindFocus, patchKeyValueItem }: {
  block: EmailBlock;
  update: (id: string, patch: Partial<EmailBlock>) => void;
  bindFocus: (apply: (v: string) => void) => { onFocus: (e: any) => void };
  patchKeyValueItem: (blockId: string, idx: number, value: string) => void;
}) {
  switch (b.type) {
    case 'heading':
      return <Input value={b.text} {...bindFocus((v) => update(b.id, { text: v } as any))} onChange={(e) => update(b.id, { text: e.target.value } as any)} placeholder="Título (admite {{variables}})" />;
    case 'paragraph':
      return <Textarea value={b.text} {...bindFocus((v) => update(b.id, { text: v } as any))} onChange={(e) => update(b.id, { text: e.target.value } as any)} placeholder="Párrafo (admite HTML simple y {{variables}})" />;
    case 'button':
      return (
        <div className="grid grid-cols-2 gap-2">
          <Input value={b.text} {...bindFocus((v) => update(b.id, { text: v } as any))} onChange={(e) => update(b.id, { text: e.target.value } as any)} placeholder="Texto del botón" />
          <Input value={b.url} {...bindFocus((v) => update(b.id, { url: v } as any))} onChange={(e) => update(b.id, { url: e.target.value } as any)} placeholder="URL (p.ej. {{resetLink}})" />
        </div>
      );
    case 'image':
      return (
        <div className="grid grid-cols-2 gap-2">
          <Input value={b.src} {...bindFocus((v) => update(b.id, { src: v } as any))} onChange={(e) => update(b.id, { src: e.target.value } as any)} placeholder="URL de la imagen" />
          <Input value={b.alt ?? ''} onChange={(e) => update(b.id, { alt: e.target.value } as any)} placeholder="Texto alternativo" />
        </div>
      );
    case 'spacer':
      return <Input type="number" value={b.size} onChange={(e) => update(b.id, { size: Number(e.target.value) } as any)} placeholder="Altura (px)" />;
    case 'divider':
      return <p className="text-xs text-muted-foreground">Línea divisoria.</p>;
    case 'raw':
      return <Textarea value={b.html} {...bindFocus((v) => update(b.id, { html: v } as any))} onChange={(e) => update(b.id, { html: e.target.value } as any)} placeholder="HTML crudo (p.ej. {{{tableHtml}}})" className="font-mono text-xs" />;
    case 'keyValue':
      return (
        <div className="space-y-1">
          {b.items.map((it, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Input value={it.label} onChange={(e) => { const items = [...b.items]; items[idx] = { ...it, label: e.target.value }; update(b.id, { items } as any); }} placeholder="Etiqueta" />
              <Input value={it.value} {...bindFocus((v) => patchKeyValueItem(b.id, idx, v))} onChange={(e) => patchKeyValueItem(b.id, idx, e.target.value)} placeholder="Valor (p.ej. {{fecha}})" />
              <Button variant="ghost" size="icon" onClick={() => update(b.id, { items: b.items.filter((_, i) => i !== idx) } as any)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={() => update(b.id, { items: [...b.items, { label: '', value: '' }] } as any)}><Plus className="h-3.5 w-3.5 mr-1" /> Agregar fila</Button>
        </div>
      );
    case 'table':
      return (
        <div className="space-y-1">
          <Input value={b.rowsVar} onChange={(e) => update(b.id, { rowsVar: e.target.value } as any)} placeholder="Variable-lista de filas (p.ej. rows)" />
          {b.columns.map((c, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <Input value={c.label} onChange={(e) => { const columns = [...b.columns]; columns[idx] = { ...c, label: e.target.value }; update(b.id, { columns } as any); }} placeholder="Encabezado" />
              <Input value={c.key} onChange={(e) => { const columns = [...b.columns]; columns[idx] = { ...c, key: e.target.value }; update(b.id, { columns } as any); }} placeholder="Campo del dato (p.ej. trackingNumber)" />
              <Button variant="ghost" size="icon" onClick={() => update(b.id, { columns: b.columns.filter((_, i) => i !== idx) } as any)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={() => update(b.id, { columns: [...b.columns, { label: '', key: '' }] } as any)}><Plus className="h-3.5 w-3.5 mr-1" /> Agregar columna</Button>
        </div>
      );
  }
}
