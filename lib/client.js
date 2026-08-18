/**
 * dsh-roxy-theme — CLIENT half (the real theme).
 *
 * Browser bundle served by the dsh web shell from
 * /plugins/dsh-roxy-theme/client.js (the dsh.client roster declaration in
 * package.json). This is a boot-time bundle plugin: lib/index.js mounts the
 * host row, the shell loads this half and calls apply(ctx).
 *
 * What it does:
 *  1. Registers a "Roxy 主题 / Roxy Theme" settings page (slot
 *     'settings.section') with a single toggle.
 *  2. While enabled it layers the Roxy palette over the CURRENT light/dark
 *     appearance via ctx.theme.overrideTokens('dsh-roxy-theme', …) — the DSH
 *     designed third-party-theme seam, composing with the built-in Appearance
 *     preference and never mutating the built-in themes.
 *  3. Switches on the crystal-glass stylesheet (gated on
 *     body[data-dsh-theme-roxy]) and swaps the favicon to the Roxy brand.
 *  4. Persists the choice in localStorage and restores it on the next start.
 *
 * The bundle ships in the DSH client-module contract format:
 * window.__ModuleLoader__.load({ id, factory }) where the factory returns
 * { inject, apply }. Only 'react' is required as an external; all services
 * (slots / locale / theme) are read off the guarded ctx by name.
 */

window.__ModuleLoader__.load({
  id: 'dsh-roxy-theme',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    var React = require('react')

    /* ── constants ───────────────────────────────────────────────────────── */

    var PLUGIN_ID = 'dsh-roxy-theme'
    var SETTINGS_NS = 'roxy-theme'
    var STORAGE_KEY = 'dsh-roxy-theme.enabled'
    var MARKER = 'data-dsh-theme-roxy'
    var ASSET_PREFIX = '/plugins/dsh-roxy-theme/assets'
    var FAVICON_HREF = ASSET_PREFIX + '/favicon-roxy.svg'
    var TITLE_SUFFIX = '洛琪希'

    /**
     * Roxy palette as { light, dark } token overrides for the DSH alias layer.
     * Values extracted from the DeepSeek Harness Roxy design platform
     * (--dsw-static-roxy-*), one pair per token so both color schemes stay
     * legible when the user switches Appearance.
     */
    var ROXY_OVERRIDES = {
      '--dsw-alias-bg-base': { light: 'rgb(244, 236, 214)', dark: 'rgb(10, 21, 48)' },
      '--dsw-alias-bg-layer-1': { light: 'rgb(250, 243, 223)', dark: 'rgb(12, 26, 54)' },
      '--dsw-alias-bg-layer-2': { light: 'rgb(250, 243, 223)', dark: 'rgb(15, 31, 61)' },
      '--dsw-alias-bg-layer-3': { light: 'rgb(236, 225, 192)', dark: 'rgb(21, 41, 75)' },
      '--dsw-alias-bg-overlay': { light: 'rgb(236, 225, 192)', dark: 'rgb(45, 66, 106)' },
      '--dsw-alias-bg-module-platform': { light: 'rgb(250, 243, 223)', dark: 'rgb(21, 41, 75)' },
      '--dsw-alias-bg-multi-select': { light: 'rgb(250, 243, 223)', dark: 'rgb(35, 55, 95)' },
      '--dsw-alias-bg-skeleton': { light: 'rgba(0, 0, 0, 0.04)', dark: 'rgba(255, 255, 255, 0.08)' },
      '--dsw-alias-border-l1': { light: 'rgba(0, 0, 0, 0.04)', dark: 'rgba(255, 255, 255, 0.06)' },
      '--dsw-alias-border-l2': { light: 'rgba(0, 0, 0, 0.1)', dark: 'rgba(255, 255, 255, 0.12)' },
      '--dsw-alias-border-l3': { light: 'rgba(0, 0, 0, 0.12)', dark: 'rgba(255, 255, 255, 0.16)' },
      '--dsw-alias-border-l4': { light: 'rgba(0, 0, 0, 0.16)', dark: 'rgba(255, 255, 255, 0.2)' },
      '--dsw-alias-brand-primary': { light: 'rgb(59, 110, 168)', dark: 'rgb(95, 184, 255)' },
      '--dsw-alias-brand-primary-invert': { light: 'rgb(18, 30, 55)', dark: 'rgb(219, 233, 255)' },
      '--dsw-alias-brand-primary-new-colorprimary-new-color': { light: 'rgb(59, 110, 168)', dark: 'rgb(95, 184, 255)' },
      '--dsw-alias-brand-text': { light: 'rgb(18, 30, 55)', dark: 'rgb(219, 233, 255)' },
      '--dsw-alias-interactive-bg-active': { light: 'rgba(59, 110, 168, 0.1)', dark: 'rgba(95, 184, 255, 0.16)' },
      '--dsw-alias-interactive-bg-hover': { light: 'rgba(59, 110, 168, 0.06)', dark: 'rgba(95, 184, 255, 0.12)' },
      '--dsw-alias-label-caption': { light: 'rgb(139, 111, 184)', dark: 'rgb(184, 147, 255)' },
      '--dsw-alias-label-dimmed': { light: 'rgb(236, 225, 192)', dark: 'rgb(35, 55, 95)' },
      '--dsw-alias-label-primary-bluish': { light: 'rgb(18, 30, 55)', dark: 'rgb(219, 233, 255)' },
      '--dsw-alias-label-primary-foreground': { light: 'rgb(250, 243, 223)', dark: 'rgb(10, 21, 48)' },
      '--dsw-alias-label-primary-inverted': { light: 'rgb(250, 243, 223)', dark: 'rgb(15, 31, 61)' },
      '--dsw-alias-label-primary': { light: 'rgb(18, 30, 55)', dark: 'rgb(219, 233, 255)' },
      '--dsw-alias-label-secondary': { light: 'rgb(26, 42, 74)', dark: 'rgb(140, 170, 215)' },
      '--dsw-alias-label-tertiary': { light: 'rgb(139, 111, 184)', dark: 'rgb(70, 135, 225)' },
      '--dsw-alias-state-business-primary': { light: 'rgb(59, 110, 168)', dark: 'rgb(95, 184, 255)' },
      '--dsw-alias-toast-bg': { light: 'rgb(26, 42, 74)', dark: 'rgb(35, 55, 95)' },
      '--dsw-alias-tooltip-bg': { light: 'rgb(26, 42, 74)', dark: 'rgb(35, 55, 95)' },
      '--dsw-specific-sidebar-fill': { light: 'rgb(250, 243, 223)', dark: 'rgb(10, 21, 48)' },
    }

    /** Crystal-glass stylesheet, gated on body[data-dsh-theme-roxy]. */
    var ROXY_CSS = "/*!\n * dsh-roxy-theme — Roxy crystal-glass stylesheet.\n *\n * Extracted from the DeepSeek Harness Roxy design (the \"crystal glass\" look):\n * gradient overlays, brand-tinted shadows, glass highlights, and typography.\n * Every rule is gated on body[data-dsh-theme-roxy] (set by the plugin's\n * browser half when the theme is enabled), so stock DSH is untouched until\n * the user turns Roxy on. Dark-mode values follow body[data-ds-dark-theme]\n * exactly like the DSH base stylesheets.\n */\n\nbody[data-dsh-theme-roxy] {\n  --dsw-linear-gradient-think: linear-gradient(180deg, #fff 20.19%, rgba(255, 255, 255, 0) 100%);\n  --dsw-linear-think-select: linear-gradient(180deg, #f5f6f7 20.19%, rgba(245, 246, 247, 0) 100%);\n  /* 阴影 —— 水晶琉璃：黑投影负责落体感，叠加品牌色光晕负责魔法感 */\n  --dsw-shadow-lv1: 0 2px 4px 0 rgba(0, 0, 0, 0.05), 0 0 12px 0 rgba(59, 110, 168, 0.06);\n  --dsw-shadow-lv1-blur: 0 4px 12px 0 rgba(0, 0, 0, 0.02);\n  --dsw-shadow-lv2:\n    0 4px 12px 0 rgba(0, 0, 0, 0.04),\n    0 2px 8px 0 rgba(0, 0, 0, 0.04),\n    0 0 20px 0 rgba(59, 110, 168, 0.08);\n  --dsw-shadow-lv3:\n    0 0 1px 0 rgba(0, 0, 0, 0.2), 0 0 4px 0 rgba(0, 0, 0, 0.02), 0 12px 32px 0 rgba(0, 0, 0, 0.08),\n    0 0 28px 0 rgba(59, 110, 168, 0.1);\n  /* 玻璃质感：内顶部高光 + 内描边，让面板/卡片有水晶厚度 */\n  --dsw-glass-highlight: inset 0 1px 0 rgba(255, 255, 255, 0.45), inset 0 0 0 1px rgba(255, 255, 255, 0.18);\n  --dsw-glass-glow: 0 0 0 1px rgba(59, 110, 168, 0.06), 0 0 18px 0 rgba(59, 110, 168, 0.08);\n  /* blur filter */\n  --dsw-mask-blur: blur(2px);\n}\n\nbody[data-dsh-theme-roxy][data-ds-dark-theme] {\n  --dsw-linear-gradient-think: linear-gradient(180deg, #151517 20.19%, rgba(21, 21, 23, 0) 100%);\n  --dsw-linear-think-select: linear-gradient(180deg, #232325 20.19%, rgba(35, 35, 37, 0) 100%);\n  /* 暗色水晶：黑投影加深（深底才看得见），光晕换魔法青 */\n  --dsw-shadow-lv1: 0 2px 4px 0 rgba(0, 0, 0, 0.28), 0 0 14px 0 rgba(95, 184, 255, 0.08);\n  --dsw-shadow-lv1-blur: 0 4px 12px 0 rgba(0, 0, 0, 0.18);\n  --dsw-shadow-lv2:\n    0 4px 12px 0 rgba(0, 0, 0, 0.32),\n    0 2px 8px 0 rgba(0, 0, 0, 0.26),\n    0 0 22px 0 rgba(95, 184, 255, 0.1);\n  --dsw-shadow-lv3:\n    0 0 1px 0 rgba(0, 0, 0, 0.4), 0 0 4px 0 rgba(0, 0, 0, 0.06), 0 12px 32px 0 rgba(0, 0, 0, 0.38),\n    0 0 32px 0 rgba(95, 184, 255, 0.12);\n  /* 暗色玻璃：高光更弱更冷 */\n  --dsw-glass-highlight: inset 0 1px 0 rgba(255, 255, 255, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.03);\n  --dsw-glass-glow: 0 0 0 1px rgba(95, 184, 255, 0.08), 0 0 20px 0 rgba(95, 184, 255, 0.1);\n}\n\n/* ---------- 字体 ---------- */\nbody[data-dsh-theme-roxy] {\n  --dsw-font-markdown-h1: 700 24px/34px var(--dsw-font-family);\n  --dsw-font-markdown-h1-font-family: var(--dsw-font-family);\n  --dsw-font-markdown-h1-font-weight: 700;\n  --dsw-font-markdown-h1-line-height: 34px;\n  --dsw-font-markdown-h1-font-size: 24px;\n  --dsw-font-markdown-h1-font-style: normal;\n\n  --dsw-font-markdown-h2: 700 22px/32px var(--dsw-font-family);\n  --dsw-font-markdown-h2-font-family: var(--dsw-font-family);\n  --dsw-font-markdown-h2-font-weight: 700;\n  --dsw-font-markdown-h2-line-height: 32px;\n  --dsw-font-markdown-h2-font-size: 22px;\n  --dsw-font-markdown-h2-font-style: normal;\n\n  --dsw-font-markdown-h3: 700 20px/30px var(--dsw-font-family);\n  --dsw-font-markdown-h3-font-family: var(--dsw-font-family);\n  --dsw-font-markdown-h3-font-weight: 700;\n  --dsw-font-markdown-h3-line-height: 30px;\n  --dsw-font-markdown-h3-font-size: 20px;\n  --dsw-font-markdown-h3-font-style: normal;\n\n  --dsw-font-markdown-h4: 600 16px/28px var(--dsw-font-family);\n  --dsw-font-markdown-h4-font-family: var(--dsw-font-family);\n  --dsw-font-markdown-h4-font-weight: 600;\n  --dsw-font-markdown-h4-line-height: 28px;\n  --dsw-font-markdown-h4-font-size: 16px;\n  --dsw-font-markdown-h4-font-style: normal;\n\n  --dsw-font-markdown-base: 16px/28px var(--dsw-font-family);\n  --dsw-font-markdown-base-font-family: var(--dsw-font-family);\n  --dsw-font-markdown-base-font-weight: 400;\n  --dsw-font-markdown-base-line-height: 28px;\n  --dsw-font-markdown-base-font-size: 16px;\n  --dsw-font-markdown-base-font-style: normal;\n\n  --dsw-font-markdown-base-strong: 600 16px/28px var(--dsw-font-family);\n  --dsw-font-markdown-base-strong-font-family: var(--dsw-font-family);\n  --dsw-font-markdown-base-strong-font-weight: 600;\n  --dsw-font-markdown-base-strong-line-height: 28px;\n  --dsw-font-markdown-base-strong-font-size: 16px;\n  --dsw-font-markdown-base-strong-font-style: normal;\n\n  --dsw-font-markdown-base-italic: italic 16px/28px var(--dsw-font-family);\n  --dsw-font-markdown-base-italic-font-family: var(--dsw-font-family);\n  --dsw-font-markdown-base-italic-font-weight: 400;\n  --dsw-font-markdown-base-italic-line-height: 28px;\n  --dsw-font-markdown-base-italic-font-size: 16px;\n  --dsw-font-markdown-base-italic-font-style: italic;\n\n  --dsw-font-markdown-base-strong-italic: italic 600 16px/28px var(--dsw-font-family);\n  --dsw-font-markdown-base-strong-italic-font-family: var(--dsw-font-family);\n  --dsw-font-markdown-base-strong-italic-font-weight: 600;\n  --dsw-font-markdown-base-strong-italic-line-height: 28px;\n  --dsw-font-markdown-base-strong-italic-font-size: 16px;\n  --dsw-font-markdown-base-strong-italic-font-style: italic;\n\n  --dsw-font-markdown-table: 15px/25px var(--dsw-font-family);\n  --dsw-font-markdown-table-font-family: var(--dsw-font-family);\n  --dsw-font-markdown-table-font-weight: 400;\n  --dsw-font-markdown-table-line-height: 25px;\n  --dsw-font-markdown-table-font-size: 15px;\n  --dsw-font-markdown-table-font-style: normal;\n\n  --dsw-font-markdown-table-head: 500 15px/25px var(--dsw-font-family);\n  --dsw-font-markdown-table-head-font-family: var(--dsw-font-family);\n  --dsw-font-markdown-table-head-font-weight: 500;\n  --dsw-font-markdown-table-head-line-height: 25px;\n  --dsw-font-markdown-table-head-font-size: 15px;\n  --dsw-font-markdown-table-head-font-style: normal;\n\n  --dsw-font-markdown-small: 14px/24px var(--dsw-font-family);\n  --dsw-font-markdown-small-font-family: var(--dsw-font-family);\n  --dsw-font-markdown-small-font-weight: 400;\n  --dsw-font-markdown-small-line-height: 24px;\n  --dsw-font-markdown-small-font-size: 14px;\n  --dsw-font-markdown-small-font-style: normal;\n\n  --dsw-font-markdown-small-strong: 600 14px/24px var(--dsw-font-family);\n  --dsw-font-markdown-small-strong-font-family: var(--dsw-font-family);\n  --dsw-font-markdown-small-strong-font-weight: 600;\n  --dsw-font-markdown-small-strong-line-height: 24px;\n  --dsw-font-markdown-small-strong-font-size: 14px;\n  --dsw-font-markdown-small-strong-font-style: normal;\n\n  --dsw-font-markdown-small-italic: italic 14px/24px var(--dsw-font-family);\n  --dsw-font-markdown-small-italic-font-family: var(--dsw-font-family);\n  --dsw-font-markdown-small-italic-font-weight: 400;\n  --dsw-font-markdown-small-italic-line-height: 24px;\n  --dsw-font-markdown-small-italic-font-size: 14px;\n  --dsw-font-markdown-small-italic-font-style: italic;\n\n  --dsw-font-markdown-small-strong-italic: italic 600 14px/24px var(--dsw-font-family);\n  --dsw-font-markdown-small-strong-italic-font-family: var(--dsw-font-family);\n  --dsw-font-markdown-small-strong-italic-font-weight: 600;\n  --dsw-font-markdown-small-strong-italic-line-height: 24px;\n  --dsw-font-markdown-small-strong-italic-font-size: 14px;\n  --dsw-font-markdown-small-strong-italic-font-style: italic;\n\n  --dsw-font-markdown-code: 14px/22px var(--ds-font-family-code);\n  --dsw-font-markdown-code-font-family: var(--ds-font-family-code);\n  --dsw-font-markdown-code-font-weight: 400;\n  --dsw-font-markdown-code-line-height: 22px;\n  --dsw-font-markdown-code-font-size: 14px;\n  --dsw-font-markdown-code-font-style: normal;\n\n  --dsw-font-markdown-code-block: 13px/22px var(--ds-font-family-code);\n  --dsw-font-markdown-code-block-font-family: var(--ds-font-family-code);\n  --dsw-font-markdown-code-block-font-weight: 400;\n  --dsw-font-markdown-code-block-line-height: 22px;\n  --dsw-font-markdown-code-block-font-size: 13px;\n  --dsw-font-markdown-code-block-font-style: normal;\n\n  /* 手工补充（非插件导出）：tool row 展开卡片内的小号 code 字体。 */\n  --dsw-font-markdown-code-block-small: 12px/18px var(--ds-font-family-code);\n  --dsw-font-markdown-code-block-small-font-family: var(--ds-font-family-code);\n  --dsw-font-markdown-code-block-small-font-weight: 400;\n  --dsw-font-markdown-code-block-small-line-height: 18px;\n  --dsw-font-markdown-code-block-small-font-size: 12px;\n  --dsw-font-markdown-code-block-small-font-style: normal;\n\n  --dsw-font-xl-24: 600 24px/32px var(--dsw-font-family);\n  --dsw-font-xl-24-font-family: var(--dsw-font-family);\n  --dsw-font-xl-24-font-weight: 600;\n  --dsw-font-xl-24-line-height: 32px;\n  --dsw-font-xl-24-font-size: 24px;\n  --dsw-font-xl-24-font-style: normal;\n\n  --dsw-font-l-20: 500 20px/28px var(--dsw-font-family);\n  --dsw-font-l-20-font-family: var(--dsw-font-family);\n  --dsw-font-l-20-font-weight: 500;\n  --dsw-font-l-20-line-height: 28px;\n  --dsw-font-l-20-font-size: 20px;\n  --dsw-font-l-20-font-style: normal;\n\n  --dsw-font-m-18: 500 16px/28px var(--dsw-font-family);\n  --dsw-font-m-18-font-family: var(--dsw-font-family);\n  --dsw-font-m-18-font-weight: 500;\n  --dsw-font-m-18-line-height: 28px;\n  --dsw-font-m-18-font-size: 16px;\n  --dsw-font-m-18-font-style: normal;\n\n  --dsw-font-base-16: 16px/24px var(--dsw-font-family);\n  --dsw-font-base-16-font-family: var(--dsw-font-family);\n  --dsw-font-base-16-font-weight: 400;\n  --dsw-font-base-16-line-height: 24px;\n  --dsw-font-base-16-font-size: 16px;\n  --dsw-font-base-16-font-style: normal;\n\n  --dsw-font-base-strong-16: 500 16px/24px var(--dsw-font-family);\n  --dsw-font-base-strong-16-font-family: var(--dsw-font-family);\n  --dsw-font-base-strong-16-font-weight: 500;\n  --dsw-font-base-strong-16-line-height: 24px;\n  --dsw-font-base-strong-16-font-size: 16px;\n  --dsw-font-base-strong-16-font-style: normal;\n\n  --dsw-font-s-14: 14px/22px var(--dsw-font-family);\n  --dsw-font-s-14-font-family: var(--dsw-font-family);\n  --dsw-font-s-14-font-weight: 400;\n  --dsw-font-s-14-line-height: 22px;\n  --dsw-font-s-14-font-size: 14px;\n  --dsw-font-s-14-font-style: normal;\n\n  --dsw-font-s-strong-14: 500 14px/22px var(--dsw-font-family);\n  --dsw-font-s-strong-14-font-family: var(--dsw-font-family);\n  --dsw-font-s-strong-14-font-weight: 500;\n  --dsw-font-s-strong-14-line-height: 22px;\n  --dsw-font-s-strong-14-font-size: 14px;\n  --dsw-font-s-strong-14-font-style: normal;\n\n  --dsw-font-xs-13: 13px/20px var(--dsw-font-family);\n  --dsw-font-xs-13-font-family: var(--dsw-font-family);\n  --dsw-font-xs-13-font-weight: 400;\n  --dsw-font-xs-13-line-height: 20px;\n  --dsw-font-xs-13-font-size: 13px;\n  --dsw-font-xs-13-font-style: normal;\n\n  --dsw-font-xs-strong-13: 500 13px/20px var(--dsw-font-family);\n  --dsw-font-xs-strong-13-font-family: var(--dsw-font-family);\n  --dsw-font-xs-strong-13-font-weight: 500;\n  --dsw-font-xs-strong-13-line-height: 20px;\n  --dsw-font-xs-strong-13-font-size: 13px;\n  --dsw-font-xs-strong-13-font-style: normal;\n\n  --dsw-font-xxs-12: 12px/18px var(--dsw-font-family);\n  --dsw-font-xxs-12-font-family: var(--dsw-font-family);\n  --dsw-font-xxs-12-font-weight: 400;\n  --dsw-font-xxs-12-line-height: 18px;\n  --dsw-font-xxs-12-font-size: 12px;\n  --dsw-font-xxs-12-font-style: normal;\n\n  --dsw-font-xxs-strong-12: 500 12px/18px var(--dsw-font-family);\n  --dsw-font-xxs-strong-12-font-family: var(--dsw-font-family);\n  --dsw-font-xxs-strong-12-font-weight: 500;\n  --dsw-font-xxs-strong-12-line-height: 18px;\n  --dsw-font-xxs-strong-12-font-size: 12px;\n  --dsw-font-xxs-strong-12-font-style: normal;\n\n  --dsw-font-xxxs-11: 11px/14px var(--dsw-font-family);\n  --dsw-font-xxxs-11-font-family: var(--dsw-font-family);\n  --dsw-font-xxxs-11-font-weight: 400;\n  --dsw-font-xxxs-11-line-height: 14px;\n  --dsw-font-xxxs-11-font-size: 11px;\n  --dsw-font-xxxs-11-font-style: normal;\n\n  --dsw-font-xxxs-strong-11: 500 11px/14px var(--dsw-font-family);\n  --dsw-font-xxxs-strong-11-font-family: var(--dsw-font-family);\n  --dsw-font-xxxs-strong-11-font-weight: 500;\n  --dsw-font-xxxs-strong-11-line-height: 14px;\n  --dsw-font-xxxs-strong-11-font-size: 11px;\n  --dsw-font-xxxs-strong-11-font-style: normal;\n}\n"

    /** Settings-page chrome (renders whenever the section is open). */
    var SETTINGS_CSS = [
      '.dsh-roxy-card { display: flex; flex-direction: column; gap: 14px; }',
      '.dsh-roxy-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }',
      '.dsh-roxy-title { font-size: 14px; font-weight: 700; }',
      '.dsh-roxy-badge { font-size: 12px; padding: 2px 10px; border-radius: 999px; border: 1px solid rgba(34,197,94,.35); background: rgba(34,197,94,.15); color: #16a34a; }',
      '.dsh-roxy-badge.off { border-color: rgba(128,128,128,.3); background: rgba(128,128,128,.12); color: var(--dsh-text-2, #8b949e); }',
      '.dsh-roxy-switch { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; }',
      '.dsh-roxy-switch input { accent-color: #3b6ea8; width: 16px; height: 16px; }',
      '.dsh-roxy-hint { font-size: 12px; color: var(--dsh-text-2, #8b949e); line-height: 1.6; }',
      '.dsh-roxy-hint code { background: rgba(128,128,128,.15); padding: 0 4px; border-radius: 4px; }',
    ].join('\n')

    var DICT = {
      zh: {
        title: 'Roxy 主题',
        on: '● 已启用',
        off: '○ 已停用',
        switchLabel: '启用 Roxy 主题（亮/暗双配色 + 水晶玻璃质感）',
        hint: '启用后，Roxy 调色板叠加到当前「外观」设置（亮/暗）之上，并切换水晶玻璃阴影、渐变与 Roxy 品牌图标。',
        tokenHint: '实现方式：通过 ctx.theme.overrideTokens 叠加主题层，不修改 DSH 自带主题。',
        persistHint: '选择保存在浏览器本地，重启 DSH 后自动恢复。',
      },
      en: {
        title: 'Roxy Theme',
        on: '● Enabled',
        off: '○ Off',
        switchLabel: 'Enable Roxy theme (light/dark palettes + crystal-glass look)',
        hint: 'When enabled, the Roxy palette layers over your current Appearance setting (light/dark) and switches in the crystal-glass shadows, gradients and Roxy brand favicon.',
        tokenHint: 'Implementation: layered through ctx.theme.overrideTokens — the built-in DSH themes are never modified.',
        persistHint: 'Your choice is saved in the browser and restored automatically after a DSH restart.',
      },
    }

    /* ── module state ────────────────────────────────────────────────────── */

    var layerDispose = null
    var styleTag = null
    var faviconTag = null
    var originalTitle = null

    /* ── helpers ─────────────────────────────────────────────────────────── */

    function readEnabled() {
      try { return localStorage.getItem(STORAGE_KEY) === '1' } catch (e) { return false }
    }

    function writeEnabled(on) {
      try {
        if (on) localStorage.setItem(STORAGE_KEY, '1')
        else localStorage.removeItem(STORAGE_KEY)
      } catch (e) { /* storage unavailable; session-only */ }
    }

    function detectLang(ctx) {
      try {
        var locale = ctx.get('locale')
        if (locale !== undefined && typeof locale.getLocale === 'function') {
          var active = locale.getLocale().active
          if (active === 'zh' || active === 'en') return active
        }
      } catch (e) { /* fall through */ }
      try {
        if (typeof navigator !== 'undefined' && /^zh/i.test(navigator.language || '')) return 'zh'
      } catch (e) { /* ignore */ }
      return 'en'
    }

    function t(ctx, key) {
      var lang = detectLang(ctx)
      var row = DICT[lang] || DICT.en
      return row[key] !== undefined ? row[key] : key
    }

    function activate(ctx) {
      // 1. Theme token layer (composes over the active light/dark theme).
      var theme = ctx.get('theme')
      if (layerDispose === null && theme !== undefined) {
        try {
          layerDispose = theme.overrideTokens(PLUGIN_ID, ROXY_OVERRIDES)
        } catch (e) {
          console.error('[dsh-roxy-theme] overrideTokens failed:', e)
        }
      }
      // 2. Marker gating the crystal-glass stylesheet.
      if (document.body !== undefined) document.body.setAttribute(MARKER, '')
      // 3. Crystal-glass stylesheet.
      if (styleTag === null) {
        styleTag = document.createElement('style')
        styleTag.setAttribute('data-plugin', PLUGIN_ID)
        styleTag.textContent = ROXY_CSS
        document.head.appendChild(styleTag)
      }
      // 4. Roxy favicon (append so it wins; removed on deactivate).
      if (faviconTag === null) {
        faviconTag = document.createElement('link')
        faviconTag.rel = 'icon'
        faviconTag.href = FAVICON_HREF
        document.head.appendChild(faviconTag)
      }
      // 5. Title suffix.
      if (originalTitle === null && document.title !== undefined) {
        originalTitle = document.title
      }
      if (originalTitle !== null) {
        document.title = originalTitle + ' · ' + TITLE_SUFFIX
      }
    }

    function deactivate() {
      if (layerDispose !== null) {
        try { layerDispose() } catch (e) { /* ignore */ }
        layerDispose = null
      }
      if (document.body !== undefined) document.body.removeAttribute(MARKER)
      if (styleTag !== null) { styleTag.remove(); styleTag = null }
      if (faviconTag !== null) { faviconTag.remove(); faviconTag = null }
      if (originalTitle !== null && document.title !== undefined) {
        document.title = originalTitle
        originalTitle = null
      }
    }

    function setEnabled(ctx, on) {
      if (on) activate(ctx)
      else deactivate()
      writeEnabled(on)
    }

    /* ── settings page ───────────────────────────────────────────────────── */

    function registerSettingsSection(ctx) {
      var slots = ctx.get('slots')
      if (slots === undefined) return
      var label = function () { return t(ctx, 'title') }
      slots.inject('settings.section', () => slots.register(
        { name: 'settings.section', id: SETTINGS_NS, order: 500, label: label },
        () => {
          var initial = readEnabled()
          var state = React.useState(initial)
          var on = state[0]
          var setOn = state[1]
          React.useEffect(() => {
            // Re-assert the persisted state once mounted (idempotent).
            setEnabled(ctx, readEnabled())
          }, [])
          var toggle = function () {
            var next = !on
            setOn(next)
            setEnabled(ctx, next)
          }
          return React.createElement('div', { className: 'dsh-roxy-card' },
            React.createElement('div', { className: 'dsh-roxy-head' },
              React.createElement('span', { className: 'dsh-roxy-title' }, t(ctx, 'title')),
              React.createElement('span', { className: 'dsh-roxy-badge' + (on ? '' : ' off') }, t(ctx, on ? 'on' : 'off'))),
            React.createElement('label', { className: 'dsh-roxy-switch' },
              React.createElement('input', { type: 'checkbox', checked: on, onChange: toggle }),
              React.createElement('span', null, t(ctx, 'switchLabel'))),
            React.createElement('div', { className: 'dsh-roxy-hint' }, t(ctx, 'hint')),
            React.createElement('div', { className: 'dsh-roxy-hint' }, t(ctx, 'tokenHint')),
            React.createElement('div', { className: 'dsh-roxy-hint' }, t(ctx, 'persistHint')))
        },
      ))
    }

    function injectSettingsStyles(ctx) {
      ctx.effect(() => {
        var style = document.createElement('style')
        style.setAttribute('data-plugin', PLUGIN_ID)
        style.textContent = SETTINGS_CSS
        document.head.appendChild(style)
        return () => { style.remove() }
      }, 'dsh-roxy-theme: settings styles')
    }

    /* ── plugin face ─────────────────────────────────────────────────────── */

    var inject = ['slots', 'locale', 'theme']

    function apply(ctx) {
      injectSettingsStyles(ctx)
      registerSettingsSection(ctx)
      // Apply the persisted state globally (works even before the settings
      // page is ever opened), and tear everything down cleanly on unload.
      ctx.effect(() => () => {
        deactivate()
      }, 'dsh-roxy-theme: unload cleanup')
      setEnabled(ctx, readEnabled())
    }

    exports.inject = inject
    exports.apply = apply
    return module.exports
  }
})
