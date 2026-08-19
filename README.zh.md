# dsh-roxy-theme

> DeepSeek Harness 的 Roxy（洛琪希）水晶琉璃主题 —— 作为一个可安装的 DSH Web 插件。

[English](README.md) | **中文**


**v1.0.0** · MIT License

---

Roxy 是 DSH Web 界面的一套可选主题层：蓝/米白的**亮色配色**、蓝/墨的**暗色配色**、品牌色调的**水晶琉璃阴影与渐变**、Roxy **品牌图标**，以及一键开启的 **Roxy 主题** 设置页。它与 DSH 自带的「外观」设置叠加生效——你仍然选择亮色/暗色/跟随系统，Roxy 在此基础上叠加自己的调色板。

## 效果一览

```
设置 → Roxy 主题

  Roxy 主题  [● 已启用]
  ☑ 启用 Roxy 主题（亮/暗双配色 + 水晶玻璃质感）

  启用后，Roxy 调色板叠加到当前「外观」设置（亮/暗）之上，
  并切换水晶玻璃阴影、渐变与 Roxy 品牌图标。
```

拨动开关即**立即、全局**生效（不止设置页），跟随你现有的亮/暗/系统选择，并在重启后记住（保存在浏览器本地）。

## 功能

1. **Roxy 调色板** —— 通过 DSH 主题服务的 `ctx.theme.overrideTokens`，在当前的亮色**或**暗色基础主题之上叠加约 30 个 `--dsw-alias-*` 令牌覆盖（背景、面板、边框、品牌色、文字、侧栏等）。DSH 自带主题永不被修改。
2. **水晶琉璃质感** —— 以 `body[data-dsh-theme-roxy]` 为门控的样式表，切出品牌阴影、渐变覆盖与玻璃高光（从 DSH Roxy 设计中提取）。
3. **Roxy 品牌** —— 启用时把 favicon 换成 Roxy 品牌图标，并在页面标题追加「· 洛琪希」。
4. **设置页** —— 设置里的「Roxy 主题」分区，只有一个开关；选择保存在 `localStorage`，下次启动自动恢复。

## 快速开始

本仓库是一个 dsh **bundle 包**（`dsh-roxy-theme`）：宿主侧 [`lib/index.js`](lib/index.js) 负责托管品牌资源，浏览器侧 [`lib/client.js`](lib/client.js) 是主题本体，插件行在 [`cordis.patch.yml`](cordis.patch.yml)。

### ① 安装

```bash
# 从 npm（发布后）：
dsh plugin --profile web add dsh-roxy-theme

# ……或直接用本仓库的本地目录：
dsh plugin --profile web add .
```

### ② 确认插件行已组合

```bash
dsh --profile web --dump-config     # 组合后的配置树里应出现 "roxy-theme" 行
```

### ③ 重启 dsh 并使用

重启 dsh，打开 **设置 → Roxy 主题**，拨动开关即可。浏览器侧从 `/plugins/dsh-roxy-theme/client.js` 加载；品牌资源位于 `/plugins/dsh-roxy-theme/assets/…`。

## 原理

- **宿主侧**（[`src/index.js`](src/index.js)）—— 一个很薄的 `webServer` 路由（`prefix /plugins/dsh-roxy-theme/assets`），负责从 `assets/` 提供 Roxy 品牌文件。宿主侧不做任何视觉工作，全部在浏览器侧完成。
- **浏览器侧**（[`src/client.js`](src/client.js)）—— 由 DSH Web 外壳加载的 boot-time bundle 插件。`apply(ctx)` 注册设置分区（`slots` → `settings.section`），开关驱动 `ctx.theme.overrideTokens('dsh-roxy-theme', …)`、标记属性 `data-dsh-theme-roxy`、玻璃样式表、favicon 与标题。主题服务以 `ctx.theme` 读取（`inject: ['slots', 'locale', 'theme']`）。
- **样式表**（[`styles/roxy.css`](styles/roxy.css)）—— 全部水晶琉璃令牌，统一以 `body[data-dsh-theme-roxy]` 门控，Roxy 关闭时对 DSH 无任何影响。构建时内联进客户端 bundle。

## 开发

```bash
npm run build   # 把 styles/roxy.css 内联进 lib/client.js，并复制宿主侧
npm run check   # 契约检查（package.json、产物、patch、bundle 格式）
npm test        # 隔离测试 —— 用打桩的 DOM/ctx 驱动 lib/client.js 与 lib/index.js
```

刻意**不引入打包器、不依赖任何包**：客户端 bundle 按 DSH 的 `window.__ModuleLoader__.load({ id, factory })` 契约直接编写，因此在任何能跑 Node 的地方都能构建运行。

## 说明与限制

- Roxy **默认关闭** —— 在设置里启用之前，不会改动 DSH 外观。
- 调色板**叠加在**亮色/暗色/系统之上；切换「外观」时 Roxy 会自动按对应配色方案取值。
- favicon 与品牌 SVG 是全分辨率 Roxy 插画（数 MB），按需懒加载，仅主题开启时被引用。
- 本插件面向 DSH **Web** 外壳（浏览器），不作用于终端 TUI。

## 许可证

MIT —— 见 [LICENSE](LICENSE)。Roxy 品牌插画与设计随主题一并提供，供个人使用。
