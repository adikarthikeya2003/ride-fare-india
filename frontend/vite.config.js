import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192.png', 'pwa-512.png'],

      // Workbox caching strategy
      workbox: {
        // Pre-cache all built assets
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Runtime cache: map tiles (stale-while-revalidate — works offline with last tiles)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/photon\.komoot\.io\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'geocode-photon', expiration: { maxEntries: 100 } },
          },
          {
            urlPattern: /^https:\/\/nominatim\.openstreetmap\.org\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'geocode-nominatim', expiration: { maxEntries: 100 } },
          },
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 30 }, // 30 min
            },
          },
          {
            urlPattern: /^https:\/\/ride-fare-api\.onrender\.com\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'api', expiration: { maxEntries: 50 } },
          },
        ],
      },

      manifest: {
        name: 'RideFare India',
        short_name: 'RideFare',
        description: 'Compare Uber, Ola, Rapido, Namma Yatri & inDrive fares across 6 Indian cities',
        theme_color: '#111827',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/ride-fare-india/',
        start_url: '/ride-fare-india/',
        lang: 'en-IN',
        categories: ['travel', 'utilities'],
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Compare Bangalore',
            url: '/ride-fare-india/?city=bangalore',
            description: 'Quick compare in Bangalore',
          },
          {
            name: 'Compare Mumbai',
            url: '/ride-fare-india/?city=mumbai',
            description: 'Quick compare in Mumbai',
          },
        ],
      },
    }),
  ],

  base: process.env.NODE_ENV === 'production' ? '/ride-fare-india/' : '/',
})
