/**
 * dsh-roxy-theme — build: assemble lib/ from src/.
 *
 * The client bundle is authored directly in the DSH client-module contract
 * format (window.__ModuleLoader__.load); the only "compile" step is inlining
 * styles/roxy.css into lib/client.js at the __ROXY_CSS__ placeholder. The
 * host half is copied verbatim. There is no bundler — deliberately, so the
 * package builds anywhere Node can run, with zero dependencies.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

async function main() {
  await mkdir(join(ROOT, 'lib'), { recursive: true })

  // 1. Client half: inline the stylesheet.
  const clientSrc = await readFile(join(ROOT, 'src', 'client.js'), 'utf8')
  const roxyCss = await readFile(join(ROOT, 'styles', 'roxy.css'), 'utf8')
  if (!clientSrc.includes('__ROXY_CSS__')) {
    throw new Error('src/client.js does not contain the __ROXY_CSS__ placeholder')
  }
  const clientBuilt = clientSrc.replace('__ROXY_CSS__', JSON.stringify(roxyCss))
  await writeFile(join(ROOT, 'lib', 'client.js'), clientBuilt, 'utf8')

  // 2. Host half: verbatim copy.
  const hostSrc = await readFile(join(ROOT, 'src', 'index.js'), 'utf8')
  await writeFile(join(ROOT, 'lib', 'index.js'), hostSrc, 'utf8')

  console.log('built lib/client.js (%d bytes) and lib/index.js', Buffer.byteLength(clientBuilt))
}

await main()
