import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: [
        'icons/ace.png',
        'icons/nutmeg.png',
        'icons/ace.svg',
        'icons/nutmeg.svg',
      ],
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
            src: '/icons/ace.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/ace.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
})
