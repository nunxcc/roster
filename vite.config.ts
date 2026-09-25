import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Where the installed Windows app lives. Your data (IndexedDB) belongs to this exact
 * origin, so never change it once you've installed: a new host or port is a new,
 * empty app. `*.localhost` always points at your own machine and counts as a secure
 * context, so service workers and installing work without HTTPS.
 */
const APP_HOST = 'roster.localhost'
const APP_PORT = 4747
const APP_URL = `http://${APP_HOST}:${APP_PORT}/`

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Ask before swapping in a new version (see src/shell/AppUpdates.tsx)
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg'],
      manifest: {
        id: '/',
        name: 'Roster',
        short_name: 'Roster',
        description: 'A character codex for your worlds and campaigns.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // On Windows the top bar becomes the title bar (min/max/close sit over its right end)
        display_override: ['window-controls-overlay', 'standalone'],
        theme_color: '#08080b',
        background_color: '#08080b',
        categories: ['entertainment', 'productivity'],
        // Launching Roster again focuses the open window instead of opening a second one
        launch_handler: { client_mode: ['focus-existing', 'auto'] },
        icons: [
          ...[48, 96, 192, 256, 512].map((size) => ({
            src: `icons/icon-${size}.png`,
            sizes: `${size}x${size}`,
            type: 'image/png',
            purpose: 'any',
          })),
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The whole app shell, fonts included, so it opens with the server off.
        // Photos live in IndexedDB, so there's nothing to cache at runtime.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
    canonicalAppOrigin(),
  ],
  preview: {
    host: '127.0.0.1',
    port: APP_PORT,
    strictPort: true,
  },
})

/**
 * The preview server listens on 127.0.0.1, but the app must always be opened (and
 * installed) from APP_URL: any other host is a separate origin with its own empty
 * database. So everything else, including `--open`'s 127.0.0.1 URL, redirects there.
 */
function canonicalAppOrigin(): Plugin {
  return {
    name: 'roster:canonical-app-origin',
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.headers.host === `${APP_HOST}:${APP_PORT}`) return next()
        res.writeHead(308, { Location: new URL(req.url ?? '/', APP_URL).href }).end()
      })
      const printUrls = server.printUrls
      server.printUrls = () => {
        printUrls()
        server.config.logger.info(`  ➜  Roster app: ${APP_URL}  ← open and install from here`)
      }
    },
  }
}
