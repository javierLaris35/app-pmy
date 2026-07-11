// components/warehouse/shared/resolve-id.ts
export function resolveId(x: unknown): string {
  if (x && typeof x === 'object') {
    if (!('id' in (x as any))) return '';
    const inner = (x as any).id;
    if (inner && typeof inner === 'object' && 'id' in inner) return String(inner.id);
    return String(inner);
  }
  return String(x ?? '');
}

export function resolveName(x: unknown): string | undefined {
  if (x && typeof x === 'object') {
    const o = x as any;
    return o.name ?? o.nombre ?? (o.id && typeof o.id === 'object' ? o.id.name ?? o.id.nombre : undefined);
  }
  return undefined;
}
