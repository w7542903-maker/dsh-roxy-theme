/**
 * dsh-roxy-theme — pre-flight sanity checks (no dependencies).
 * Run with: node scripts/check.mjs  (or npm run check)
 */

import { readFile, access } from 'node:fs/promises'
import vm from 'node:vm'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const problems = []

async function main() {
  // 1. package.json parses and declares the dsh plugin contract.
  const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'))
  if (pkg.name !== 'dsh-roxy-theme') problems.push('package.json name should be dsh-roxy-theme')
  if (!pkg.dsh || !pkg.dsh.bundle || !pkg.dsh.bundle.patch) problems.push('package.json missing dsh.bundle.patch')
  if (!pkg.dsh || !pkg.dsh.client || pkg.dsh.client.platform !== 'web') problems.push('package.json missing dsh.client.platform=web')
  if (!pkg.exports || !pkg.exports['./client']) problems.push('package.json missing exports["./client"]')

  // 2. Built artifacts exist and are syntactically valid.
  for (const rel of ['lib/index.js', 'lib/client.js']) {
    try {
      await access(join(ROOT, rel))
    } catch {
      problems.push(rel + ' missing — run "npm run build" first')
      continue
    }
    const source = await readFile(join(ROOT, rel), 'utf8')
    try {
      if (rel === 'lib/index.js') {
        // ESM host half: dynamic import validates syntax (and runs the
        // side-effect-free module — only consts and function definitions).
        await import(pathToFileURL(join(ROOT, rel)).href)
      } else {
        // Classic client bundle: compile in-process without executing.
        new vm.Script(source, { filename: rel })
      }
    } catch (e) {
      problems.push(rel + ' failed syntax check: ' + String(e && e.message))
    }
  }

  // 3. No build placeholder leaked into the artifact.
  const client = await readFile(join(ROOT, 'lib', 'client.js'), 'utf8')
  if (client.includes('__ROXY_CSS__')) problems.push('lib/client.js still contains the __ROXY_CSS__ placeholder')

  // 4. cordis.patch.yml is a parseable bundle patch (structure only).
  const patch = await readFile(join(ROOT, 'cordis.patch.yml'), 'utf8')
  if (!patch.includes('dsh-roxy-theme')) problems.push('cordis.patch.yml does not name dsh-roxy-theme')
  if (!/- insert:/.test(patch)) problems.push('cordis.patch.yml has no "- insert:" section')

  // 5. The client bundle is authored in the client-module contract format.
  if (!client.includes('window.__ModuleLoader__.load')) problems.push('lib/client.js must call window.__ModuleLoader__.load')

  if (problems.length > 0) {
    console.error('check failed:\n' + problems.map((p) => '  - ' + p).join('\n'))
    process.exit(1)
  }
  console.log('check passed — package.json contract, lib artifacts, patch, and client bundle are consistent')
}

await main().catch((e) => {
  console.error('check failed:', e)
  process.exit(1)
})
