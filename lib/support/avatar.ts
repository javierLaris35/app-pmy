/** Iniciales legibles a partir de un nombre ("Ana Ruiz" → "AR"). */
export function initialsFrom(name?: string): string {
  const parts = (name ?? "?").trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Hue determinista (0–359) a partir de una cadena. */
function hueFrom(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360
  return h
}

/**
 * Color de avatar determinista por usuario: mismo nombre → mismo color, legible
 * (texto blanco). Se usa inline porque Tailwind no expresa hues dinámicos.
 */
export function avatarStyle(seed?: string): { backgroundColor: string; color: string } {
  const h = hueFrom(seed ?? "?")
  return { backgroundColor: `hsl(${h} 58% 45%)`, color: "white" }
}
