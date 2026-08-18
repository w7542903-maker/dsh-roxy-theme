/**
 * dsh-roxy-theme — HOST half (composition plugin row `roxy-theme`).
 *
 * Thin static-asset server for the Roxy brand files. Everything visual lives
 * in the browser half (lib/client.js); the host half only exists so the theme
 * can serve the brand images (favicon, hero, avatar, aura, pattern, welcome)
 * from the package's assets/ directory. The browser half references them as
 * /plugins/dsh-roxy-theme/assets/<file>.
 *
 * Zero non-builtin imports on purpose — the assets dir is resolved from this
 * module's real path (import.meta.url), never from the profile's shared
 * node_modules fallback (pnpm does not install the dependencies of `link:`
 * profile plugins, and this package has none anyway).
 */

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'roxy-theme'

/** Services this row needs: only the web server (static asset routes). */
export const inject = ['webServer']

/** Absolute path of this package's assets/ directory. */
const ASSETS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets')

/** Extension → content-type map for the served brand files. */
const MIME = {
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

/** Default MIME when the extension is unknown. */
const DEFAULT_MIME = 'application/octet-stream'

export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'prefix',
    path: '/plugins/dsh-roxy-theme/assets',
    handler: async (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405)
        res.end()
        return
      }
      const pathname = new URL(req.url ?? '/', 'http://x').pathname
      const prefix = '/plugins/dsh-roxy-theme/assets'
      if (!pathname.startsWith(prefix + '/')) {
        res.writeHead(404)
        res.end()
        return
      }
      // Strip the prefix, keep only a single plain basename: no subdirectories,
      // no traversal, no URL-encoded separators — the assets dir is flat.
      const raw = pathname.slice(prefix.length + 1)
      if (raw === '' || raw.includes('/')) {
        res.writeHead(404)
        res.end()
        return
      }
      const decoded = decodeURIComponent(raw)
      if (decoded !== raw || decoded === '') {
        // Rejects URL-encoded separators/traversal (%2F, %2E%2E) outright.
        res.writeHead(404)
        res.end()
        return
      }
      const filePath = join(ASSETS_DIR, decoded)
      const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase()
      try {
        const body = await readFile(filePath)
        res.writeHead(200, {
          'content-type': MIME[ext] ?? DEFAULT_MIME,
          'cache-control': 'no-cache',
          'access-control-allow-origin': '*',
        })
        res.end(req.method === 'HEAD' ? undefined : body)
      } catch {
        res.writeHead(404)
        res.end()
      }
    },
  }), 'dsh-roxy-theme: brand asset routes')
}
