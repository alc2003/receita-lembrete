import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        // the HTML shell must always be revalidated against the network -
        // otherwise an installed PWA can keep serving a stale build (old
        // JS/CSS) indefinitely, since cache-first would never notice a
        // new deploy exists until something else forces a refetch.
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: { cacheName: "html-cache" },
          },
        ],
      },
      manifest: {
        name: "Receita Lembrete",
        short_name: "Receitas",
        description: "Leitura de receitas médicas com lembretes no Google Calendar",
        theme_color: "#2563eb",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  server: { port: 5173 },
});
