/**
 * dsh-roxy-theme — hermetic host-half tests.
 *
 * Imports lib/index.js and drives apply(ctx) with a stub ctx: asserts the
 * webServer route is registered for the brand assets, that a real asset
 * serves 200 with the right content-type, that an unknown file 404s, and
 * that traversal / nested paths are rejected.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { apply, inject, name } = await import('../lib/index.js')

function makeResponse() {
  const res = {
    status: null,
    headers: {},
    ended: false,
    body: null,
    writeHead(s, h) { this.status = s; this.headers = h || {} },
    end(b) { this.ended = true; this.body = b === undefined ? null : b },
  }
  return res
}

function makeRequest(method, url) {
  return { method, url }
}

test('host exports the plugin face', () => {
  assert.equal(name, 'roxy-theme')
  assert.deepEqual(inject, ['webServer'])
  assert.equal(typeof apply, 'function')
})

test('apply registers the asset prefix route', () => {
  let route = null
  let disposer = null
  const ctx = {
    effect(fn) { disposer = fn(); return () => {} },
    webServer: {
      register(r) { route = r; return () => {} },
    },
  }
  apply(ctx)
  assert.ok(route, 'a route must be registered')
  assert.equal(route.kind, 'prefix')
  assert.equal(route.path, '/plugins/dsh-roxy-theme/assets')
  assert.equal(typeof route.handler, 'function')
  assert.equal(typeof disposer, 'function')
})

test('serves a real asset with the correct content type', async () => {
  let route = null
  const ctx = {
    effect(fn) { fn() },
    webServer: { register(r) { route = r } },
  }
  apply(ctx)
  const res = makeResponse()
  await route.handler(makeRequest('GET', '/plugins/dsh-roxy-theme/assets/favicon-roxy.svg'), res)
  assert.equal(res.status, 200)
  assert.match(res.headers['content-type'], /^image\/svg\+xml/)
  assert.ok(res.body !== null && res.body.length > 0, 'asset body is served')
})

test('unknown and nested/traversal paths 404', async () => {
  let route = null
  const ctx = {
    effect(fn) { fn() },
    webServer: { register(r) { route = r } },
  }
  apply(ctx)
  for (const url of [
    '/plugins/dsh-roxy-theme/assets/nope.png',
    // Plain ../ is normalized away by the URL parser (harmless), so exercise
    // the URL-encoded variant the handler must reject outright instead:
    '/plugins/dsh-roxy-theme/assets/%2e%2e/index.js',
    '/plugins/dsh-roxy-theme/assets/%2Fetc%2Fpasswd',
  ]) {
    const res = makeResponse()
    await route.handler(makeRequest('GET', url), res)
    assert.equal(res.status, 404, 'should 404: ' + url)
  }
})

test('rejects non-GET methods', async () => {
  let route = null
  const ctx = {
    effect(fn) { fn() },
    webServer: { register(r) { route = r } },
  }
  apply(ctx)
  const res = makeResponse()
  await route.handler(makeRequest('POST', '/plugins/dsh-roxy-theme/assets/favicon-roxy.svg'), res)
  assert.equal(res.status, 405)
})
