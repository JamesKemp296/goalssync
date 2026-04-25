import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['ace.svg'],
      manifest: {
        name: 'Goals Sync',
        short_name: 'Goals Sync',
        description: 'Stay aligned on goals and todos with friends.',
        theme_color: '#FFA02E',
        background_color: '#f5f5f3',
        display: 'standalone',
        start_url: '/home',
        scope: '/',
        icons: [
          {
            src: '/ace.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: '/ace.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
