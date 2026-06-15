#!/usr/bin/env node
/**
 * Falla el build si encuentra implementaciones recortadas / placeholders
 * (p. ej. `=> { /* ... *​/ }` o `/* igual que el anterior *​/`), que suelen
 * colarse al pegar versiones "resumidas" de un archivo y dejan funciones vacías.
 *
 * Uso: node scripts/check-no-stubs.mjs   (se ejecuta automáticamente en `build`)
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, extname } from "node:path";

const ROOTS = ["components", "lib", "app", "pages", "hooks", "store"];
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx"]);
const SKIP_DIRS = new Set(["node_modules", ".next", "dist", "out", ".git"]);

// Patrones que delatan código recortado (específicos para evitar falsos positivos).
const PATTERNS = [
  /igual que el anterior/i,
  /=>\s*\{\s*\/\*\s*\.\.\.\s*\*\/\s*\}/,        // () => { /* ... */ }
  /\)\s*\{\s*\/\*\s*\.\.\.\s*\*\/\s*\}/,        // function(...) { /* ... */ }
];

const findings = [];

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full);
    } else if (EXTS.has(extname(entry.name))) {
      const lines = readFileSync(full, "utf8").split(/\r?\n/);
      lines.forEach((line, i) => {
        if (PATTERNS.some((rx) => rx.test(line))) {
          findings.push(`${full}:${i + 1}  ${line.trim()}`);
        }
      });
    }
  }
}

ROOTS.forEach(walk);

if (findings.length > 0) {
  console.error("\n❌ check-no-stubs: se encontraron implementaciones recortadas / placeholders:\n");
  findings.forEach((f) => console.error("   " + f));
  console.error(`\n   Total: ${findings.length}. Restaura el código real antes de compilar.\n`);
  process.exit(1);
}

console.log("✅ check-no-stubs: sin stubs/placeholders.");
