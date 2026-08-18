/**
 * dsh-roxy-theme — hermetic browser-half tests.
 *
 * Drives lib/client.js (the built __ModuleLoader__ bundle) in Node with a
 * stubbed DOM / localStorage / React / ctx, and asserts the DSH contract:
 *  - the factory returns { inject, apply };
 *  - apply() registers a 'settings.section' row;
 *  - the persisted toggle activates the theme (overrideTokens + marker +
 *    stylesheet + favicon + title) and deactivation unwinds it.
 * No browser, no DSH, no dependencies — run with: node --test tests/
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Minimal element stub: appendChild / remove / attributes / children. */
function makeElement(tag) {
  return {
    tagName: tag,
    children: [],
    attributes: {},
    parent: null,
    textContent: '',
    appendChild(child) { child.parent = this; this.children.push(child); return child },
    remove() {
      if (this.parent === null) return
      const at = this.parent.children.indexOf(this)
      if (at !== -1) this.parent.children.splice(at, 1)
      this.parent = null
    },
    setAttribute(k, v) { this.attributes[k] = v },
    getAttribute(k) { return k in this.attributes ? this.attributes[k] : null },
    removeAttribute(k) { delete this.attributes[k] },
  }
}

function setupGlobals({ enabled = false } = {}) {
  const storage = new Map()
  if (enabled) storage.set('dsh-roxy-theme.enabled', '1')

  const doc = {
    title: 'DeepSeek Harness',
    head: makeElement('head'),
    body: makeElement('body'),
    createElement: (t) => makeElement(t),
  }

  const localStorage = {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => { storage.set(k, String(v)) },
    removeItem: (k) => { storage.delete(k) },
  }

  const React = {
    useState: (v) => [v, () => {}],
    useEffect: () => {},
    createElement: (type, props, ...children) => ({ type, props, children }),
  }

  const g = globalThis
  const state = { handoff: null }
  g.window = { __ModuleLoader__: { load: (h) => { state.handoff = h } } }
  g.document = doc
  g.localStorage = localStorage
  // Node 24 exposes a getter-only global navigator; leave it (its language is
  // fine for the fallback branch) rather than trying to overwrite it.
  g.React = React
  return { doc, storage, React, get handoff() { return state.handoff } }
}

function loadPlugin(handoff) {
  // factory(require) — only 'react' is requested; return the stub.
  const factory = handoff.factory
  const exported = factory((spec) => {
    if (spec === 'react') return globalThis.React
    throw new Error('unexpected require: ' + spec)
  })
  return exported
}

function makeCtx({ theme } = {}) {
  const calls = { overrideTokens: [], effects: [] }
  const services = { theme, slots: undefined, locale: undefined }
  const ctx = {
    get: (name) => services[name],
    effect: (fn, label) => { calls.effects.push(label) },
  }
  return { ctx, calls, services }
}

test('bundle registers through __ModuleLoader__ and exports { inject, apply }', async () => {
  const code = await readFile(join(ROOT, 'lib', 'client.js'), 'utf8')
  const env = setupGlobals()
  ;(0, eval)(code) // eslint-disable-line no-eval
  assert.notEqual(env.handoff, null, 'bundle must call window.__ModuleLoader__.load')
  const plugin = loadPlugin(env.handoff)
  assert.deepEqual(plugin.inject, ['slots', 'locale', 'theme'])
  assert.equal(typeof plugin.apply, 'function')
})

test('persisted-on apply() activates the theme; off apply() stays inert', async () => {
  // --- inert with no persisted choice ---
  let env = setupGlobals({ enabled: false })
  let code = await readFile(join(ROOT, 'lib', 'client.js'), 'utf8')
  ;(0, eval)(code)
  let theme = { overrideTokens: () => () => {} }
  let ctxBox = makeCtx({ theme })
  let plugin = loadPlugin(env.handoff)
  plugin.apply(ctxBox.ctx)
  assert.equal(ctxBox.calls.overrideTokens.length, 0, 'no theme layer when Roxy is off')
  assert.equal(env.doc.body.getAttribute('data-dsh-theme-roxy'), null)

  // --- persisted on → apply() activates ---
  env = setupGlobals({ enabled: true })
  code = await readFile(join(ROOT, 'lib', 'client.js'), 'utf8')
  ;(0, eval)(code)
  const layerCalls = []
  theme = { overrideTokens: (source, tokens) => { layerCalls.push({ source, tokens }); return () => {} } }
  ctxBox = makeCtx({ theme })
  plugin = loadPlugin(env.handoff)
  plugin.apply(ctxBox.ctx)

  assert.equal(layerCalls.length, 1, 'overrideTokens called exactly once')
  assert.equal(layerCalls[0].source, 'dsh-roxy-theme')
  const tokens = layerCalls[0].tokens
  assert.equal(tokens['--dsw-alias-brand-primary'].light, 'rgb(59, 110, 168)')
  assert.equal(tokens['--dsw-alias-brand-primary'].dark, 'rgb(95, 184, 255)')
  assert.equal(tokens['--dsw-alias-bg-base'].light, 'rgb(244, 236, 214)')
  assert.ok(Object.keys(tokens).length >= 20, 'a meaningful token set is layered')

  // marker + glass stylesheet + favicon + title
  assert.equal(env.doc.body.getAttribute('data-dsh-theme-roxy'), '')
  const styles = env.doc.head.children.filter((el) => el.tagName === 'style')
  assert.ok(styles.length >= 1, 'a style tag is injected')
  const glass = styles.find((s) => s.textContent.includes('--dsw-shadow-lv1'))
  assert.ok(glass !== undefined, 'crystal-glass stylesheet is injected')
  assert.ok(glass.textContent.includes('body[data-dsh-theme-roxy]'), 'CSS is gated on the Roxy marker')
  const favicon = env.doc.head.children.find((el) => el.tagName === 'link' && el.rel === 'icon')
  assert.equal(favicon !== undefined, true, 'Roxy favicon link appended')
  assert.equal(favicon.href, '/plugins/dsh-roxy-theme/assets/favicon-roxy.svg')
  assert.ok(env.doc.title.includes('洛琪希'), 'title carries the Roxy suffix')

  // --- toggle off (reload with the choice cleared) → unwinds ---
  env.storage.delete('dsh-roxy-theme.enabled')
  plugin.apply(ctxBox.ctx)
  assert.equal(env.doc.body.getAttribute('data-dsh-theme-roxy'), null, 'marker removed on deactivate')
  const remaining = env.doc.head.children.filter((el) => el.tagName === 'style' && el.textContent.includes('--dsw-shadow-lv1'))
  assert.equal(remaining.length, 0, 'glass stylesheet removed on deactivate')
})

test('settings section is registered into settings.section', async () => {
  const env = setupGlobals({ enabled: false })
  const code = await readFile(join(ROOT, 'lib', 'client.js'), 'utf8')
  ;(0, eval)(code)
  const registrations = []
  const slots = {
    inject: (slot, fn) => { fn() },
    register: (opts, comp) => { registrations.push({ opts, comp }); return () => {} },
  }
  const ctx = { get: (n) => (n === 'slots' ? slots : undefined), effect: () => {} }
  const plugin = loadPlugin(env.handoff)
  plugin.apply(ctx)
  const row = registrations.find((r) => r.opts.name === 'settings.section' && r.opts.id === 'roxy-theme')
  assert.ok(row !== undefined, 'a settings.section row named roxy-theme is registered')
  assert.equal(typeof row.opts.label, 'function')
  assert.equal(typeof row.comp, 'function')
})
