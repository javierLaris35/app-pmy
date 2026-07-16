export type EmailBlock =
  | { id: string; when?: string; type: 'heading'; text: string }
  | { id: string; when?: string; type: 'paragraph'; text: string }
  | { id: string; when?: string; type: 'button'; text: string; url: string }
  | { id: string; when?: string; type: 'image'; src: string; alt?: string; width?: number }
  | { id: string; when?: string; type: 'divider' }
  | { id: string; when?: string; type: 'spacer'; size: number }
  | { id: string; when?: string; type: 'keyValue'; items: { label: string; value: string }[] }
  | { id: string; when?: string; type: 'table'; columns: { label: string; key: string }[]; rowsVar: string }
  | { id: string; when?: string; type: 'raw'; html: string };

export type EmailBlockType = EmailBlock['type'];
export interface EmailDoc { blocks: EmailBlock[]; }

export const BLOCK_TYPES: { type: EmailBlockType; label: string }[] = [
  { type: 'heading', label: 'Título' },
  { type: 'paragraph', label: 'Párrafo' },
  { type: 'button', label: 'Botón' },
  { type: 'image', label: 'Imagen' },
  { type: 'keyValue', label: 'Lista campo/valor' },
  { type: 'table', label: 'Tabla' },
  { type: 'divider', label: 'Divisor' },
  { type: 'spacer', label: 'Espacio' },
  { type: 'raw', label: 'HTML crudo' },
];

let seq = 0;
export function newBlock(type: EmailBlockType): EmailBlock {
  const id = `b${Date.now()}_${seq++}`;
  switch (type) {
    case 'heading': return { id, type, text: 'Nuevo título' };
    case 'paragraph': return { id, type, text: 'Nuevo párrafo' };
    case 'button': return { id, type, text: 'Botón', url: '' };
    case 'image': return { id, type, src: '' };
    case 'divider': return { id, type };
    case 'spacer': return { id, type, size: 16 };
    case 'keyValue': return { id, type, items: [{ label: 'Etiqueta', value: '' }] };
    case 'table': return { id, type, columns: [{ label: 'Columna', key: '' }], rowsVar: 'rows' };
    case 'raw': return { id, type, html: '' };
  }
}
