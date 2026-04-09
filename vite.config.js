import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo.png', 'icon-180.png'],
      workbox: {
        // Cache the app shell (JS/CSS/HTML) with stale-while-revalidate
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // API calls: network-first, fallback to cache
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Images: cache-first
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: 'Presta Pro',
        short_name: 'PrestaPro',
        description: 'Sistema de gestión de préstamos personales',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f172a',
        theme_color: '#4f46e5',
        categories: ['finance', 'business'],
        shortcuts: [
          {
            name: 'Ruta de Cobros',
            short_name: 'Cobros',
            description: 'Ver ruta de cobros del día',
            url: '/?tab=routes',
            icons: [{ src: 'icon-180.png', sizes: '180x180' }],
          },
          {
            name: 'Clientes',
            short_name: 'Clientes',
            description: 'Gestionar clientes',
            url: '/?tab=clients',
            icons: [{ src: 'icon-180.png', sizes: '180x180' }],
          },
        ],
        icons: [
          {
            src: 'favicon.ico',
            sizes: '48x48 32x32 16x16',
            type: 'image/x-icon',
          },
          {
            src: 'icon-180.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  build: {
    sourcemap: false, // Disable source maps in production for security
    minify: 'esbuild', // Use esbuild for faster minification
    rollupOptions: {
      external: [
        '@capacitor/app',
        '@capacitor/dialog',
        '@capacitor/network',
        '@capacitor-community/sqlite',
      ],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase limit for larger chunks
  },
})
