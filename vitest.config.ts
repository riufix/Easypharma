import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Résolution de l'alias "@/..." (= ./src) comme dans tsconfig, pour les tests.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
