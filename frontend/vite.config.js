import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg', 'logo.png', 'icon-192x192.png', 'icon-512x512.png'],
      manifest: {
        name: 'Sistema de Incidentes Costeros - Margarita',
        short_name: 'S.I.C. Mgta',
        description: 'Reporta y protege nuestras costas.',
        theme_color: '#0f172a',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true, // Esto evita que Vite salte a otro puerto si el 5173 está ocupado
  }
})