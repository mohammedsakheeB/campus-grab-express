import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    devtools(),
    tanstackStart({
      server: { entry: "server" },
    }),
    viteTsconfigPaths(),
    tailwindcss(),
    viteReact(),
  ],
});
