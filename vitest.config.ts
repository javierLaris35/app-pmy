import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Runner ligero para lógica pura (sin DOM/React). Resuelve el alias "@/..." del
// tsconfig para poder importar helpers de lib/ tal cual lo hace la app.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'out', 'dist'],
  },
});
