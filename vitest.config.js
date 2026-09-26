import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
    plugins: [react()],
    resolve: { alias: { "@components": fileURLToPath(new URL("./src/renderer/src/components", import.meta.url)), "@renderer": fileURLToPath(new URL("./src/renderer/src", import.meta.url)) } },
    test: { environment: "jsdom", setupFiles: ["./tests/ui/setup.js"], include: ["tests/ui/**/*.test.jsx"] },
});
