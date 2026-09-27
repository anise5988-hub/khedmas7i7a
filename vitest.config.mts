import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // Agent tooling keeps full checkouts of this repo under .kilo/worktrees/
    // (git-ignored, see .git/info/exclude). They contain stale copies of this
    // very test suite, so the default glob would run them twice and report
    // failures from code that is not the working tree.
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", ".kilo/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
