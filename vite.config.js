import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo.png', 'icon-180.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'RenKredit - Sistema de Préstamos',
        short_name: 'RenKredit',
        description: 'Sistema de gestión de préstamos',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#6366f1',
        orientation: 'portrait',
        categories: ['finance', 'business'],
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
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Skip caching API calls
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  build: {
    sourcemap: false,
    minify: 'terser', // Use terser for better compression
    target: 'es2015', // For older Android WebViews
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'],
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-charts': ['recharts'],
          'vendor-ui': ['lucide-react'],
          'vendor-auth': ['@react-oauth/google', 'jwt-decode'],
        },
      },
    },

    chunkSizeWarningLimit: 500, // Smaller chunks for better loading
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'recharts', 'lucide-react'],
  },
})

