# dsh-roxy-theme

> The Roxy (洛琪希) crystal-glass theme for DeepSeek Harness — as an installable DSH web plugin.

**English** | [中文](README.zh.md)

![#dsh-plugin](https://img.shields.io/badge/dsh-plugin-bundle%20composition-1f6feb)

**v1.0.0** · MIT License

---

Roxy is a selectable theme layer for the DSH web UI: a blue/cream **light palette**, a blue/ink **dark palette**, brand-tinted **crystal-glass shadows and gradients**, the Roxy **favicon**, and a one-click **Roxy 主题 / Roxy Theme** settings page. It composes with the built-in Appearance preference — you still pick Light / Dark / System, and Roxy layers its palette on top.

## What it looks like

```
Settings → Roxy 主题 / Roxy Theme

  Roxy 主题  [● 已启用]
  ☑ Enable Roxy theme (light/dark palettes + crystal-glass look)

  When enabled, the Roxy palette layers over your current Appearance
  setting (light/dark) and switches in the crystal-glass shadows,
  gradients and Roxy brand favicon.
```

Flipping the switch applies the theme **immediately, everywhere** (not just inside settings), follows your existing light/dark/system choice, and is remembered across restarts (stored in the browser).

## What it does

1. **Roxy palette** — layers ~30 `--dsw-alias-*` token overrides (backgrounds, surfaces, borders, brand accent, text, sidebar) over the active light **or** dark base theme, via the DSH theme service's `ctx.theme.overrideTokens`. The built-in DSH themes are never modified.
2. **Crystal-glass look** — a stylesheet gated on `body[data-dsh-theme-roxy]` switches in the brand shadows, gradient overlays and glass highlights (extracted from the DSH Roxy design).
3. **Roxy branding** — swaps the favicon to the Roxy brand and appends `· 洛琪希` to the page title while enabled.
4. **A settings page** — a `Roxy 主题 / Roxy Theme` section in Settings with a single toggle; the choice is persisted in `localStorage` and re-applied on the next start.

## Quick start

The repo is a dsh **bundle package** (`dsh-roxy-theme`): the host half [`lib/index.js`](lib/index.js) serves the brand assets, the browser half [`lib/client.js`](lib/client.js) is the theme, and the plugin row lives in [`cordis.patch.yml`](cordis.patch.yml).

### ① Install

```bash
# From npm (once published):
dsh plugin --profile web add dsh-roxy-theme

# …or from a local checkout of this repo:
dsh plugin --profile web add .
```

### ② Verify the row composes

```bash
dsh --profile web --dump-config     # the composed tree shows the "roxy-theme" row
```

### ③ Restart dsh and use it

Restart dsh, open **Settings → Roxy 主题 / Roxy Theme**, and flip the switch. The browser half is served at `/plugins/dsh-roxy-theme/client.js`; the brand assets at `/plugins/dsh-roxy-theme/assets/…`.

## How it works

- **Host half** ([`lib/index.js`](src/index.js)) — a thin `webServer` route (`prefix /plugins/dsh-roxy-theme/assets`) that serves the Roxy brand files from `assets/`. Nothing else runs on the host; every visual is client-side.
- **Browser half** ([`lib/client.js`](src/client.js)) — a boot-time bundle plugin loaded by the DSH web shell. `apply(ctx)` registers the settings section (`slots` → `settings.section`), and the toggle drives `ctx.theme.overrideTokens('dsh-roxy-theme', …)` plus the marker attribute `data-dsh-theme-roxy`, the glass stylesheet, the favicon and the title. The theme service is read as `ctx.theme` (declared in `inject: ['slots', 'locale', 'theme']`).
- **Stylesheet** ([`styles/roxy.css`](styles/roxy.css)) — the crystal-glass tokens, all gated on `body[data-dsh-theme-roxy]` so stock DSH is untouched while Roxy is off. It is inlined into the client bundle at build time.

## Development

```bash
npm run build   # inlines styles/roxy.css into lib/client.js, copies the host half
npm run check   # contract sanity checks (package.json, artifacts, patch, bundle format)
npm test        # hermetic tests — drive lib/client.js and lib/index.js with stubbed DOM/ctx
```

There is deliberately **no bundler and no dependency**: the client bundle is authored in the DSH `window.__ModuleLoader__.load({ id, factory })` contract, so the package builds and runs anywhere Node can run.

## Notes & limitations

- Roxy is **off by default** — it never changes stock DSH until you enable it in Settings.
- The palette layers **on top of** Light/Dark/System; switch Appearance and Roxy re-reads its per-scheme values automatically.
- The favicon and brand SVGs are the full-resolution Roxy artwork (several MB); they are served lazily and only referenced while the theme is on.
- This plugin targets the DSH **web** shell (browser); it does not theme the terminal TUI.

## License

MIT — see [LICENSE](LICENSE). The Roxy brand artwork and the Roxy design are provided as part of the theme for personal use.
