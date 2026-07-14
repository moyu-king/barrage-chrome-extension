# CLAUDE.md

此文件为 Claude Code（claude.ai/code）在本仓库中工作时提供指导。

## 构建与开发命令

```bash
pnpm dev          # 启动 Vite 开发服务器（扩展开发热更新）
pnpm build        # 生产构建 → dist/
pnpm lint         # ESLint 检查（Antfu 配置，TypeScript + Vue）
pnpm lint:fix     # ESLint 自动修复
pnpm protoc       # 根据 src/protobuf/barrage.proto 重新生成 protobuf 绑定
```

本项目没有测试。

## 架构总览

一个 Chrome 扩展（Manifest V3），功能是在视频页面上注入弹幕。支持 Bilibili、腾讯视频和爱奇艺。基于 Vue 3 + Vite + TypeScript，使用 `@crxjs/vite-plugin` 打包。

### 入口点（3 个独立 bundle）

| 入口 | 文件 | 用途 |
|------|------|------|
| Service Worker | `src/background.ts` | 消息中枢、declarativeNetRequest 跨域规则、连接 content ↔ popup |
| Content Script | `src/content.ts` | 注入到每个页面。通过 `defineCustomElement` 创建 Web Component（`<crx-content>`）并挂载一个 Vue 包装组件 |
| Popup | `src/popup.ts` | 工具栏按钮弹窗（设置面板） |

### 消息流转

```
Content Script ←→ Service Worker ←→ 平台 API（Bilibili/腾讯/爱奇艺）
     ↕
   Popup（设置项，持久化在 chrome.storage.local）
```

Service Worker（`background.ts`）是消息路由器。它根据 `MessageType` 枚举将消息分发到 service 层。所有期望回调的 `chrome.runtime.sendMessage` 调用必须在监听器中 `return true`（异步 `sendResponse` 模式）。

### 数据层

- **IndexedDB**（`barrage_database`，store `videos`）：持久化用户添加的视频条目（名称、平台、平台相关参数如 `cid`/`vid`/`tvid`）。通过 `getDB()` 惰性打开。
- **chrome.storage.local**：持久化两项设置 — `floatBubbleOpened`（悬浮球显示/隐藏）和 `isCustomPlay`（自动/自定义播放模式）。设置变更通过 `chrome.tabs.sendMessage` 在 content ↔ popup 之间同步。
- **弹幕数据**：按需从平台 API 获取，缓存在内存中的 `barragesMap`（`Map<string, Barrage[]>`，以视频 `vid` 为键）。不持久化。

### 平台支持

三个平台，每个平台对应一个弹幕抓取类和一个剧集获取函数：

| 平台 | 弹幕抓取器 | 剧集来源 |
|------|----------|---------|
| Bilibili | `BiliBiliBarrageFetcher` — 分段 protobuf API，用 `protobufjs` 解码 | `pgc/view/web/season` API |
| 腾讯视频 | `TencentBarrageFetcher` — 分段 JSON API，30 秒窗口 | `PageServer/GetPageData` RPC |
| 爱奇艺 | `IqiyiBarrageFetcher` — 分段 zlib 压缩 XML，用 `pako` 解压 | `album/avlistinfo` + `playervideoinfo` API |

平台分发通过以 `Platform` 枚举（整数值：1=腾讯，2=Bilibili，3=爱奇艺）为键的 `platformToRequest` 查找对象实现。

### 弹幕渲染

`content.ce.vue` 中作为模块级变量管理的两个 `Danmaku` 库实例：
- **`danmaku`** — 滚动弹幕，标准速度
- **`specialDanmaku`** — 顶部/底部固定弹幕，speed=500

两者共享一个媒体元素（自动模式用真实的 `<video>`，自定义模式用 `fakeMedia` 响应式对象）。在 `initDanmaku()` 中一起创建，在 `destroyDanmaku()` 中一起销毁。Danmaku 库构造函数内部会调用 `resize()`，因此仅在视口/布局变化（例如全屏切换）后才需要显式调用 resize。

### 播放模式

- **自动模式**：同步到页面上的真实 `<video>` 元素。找不到视频时回退到自定义模式。
- **自定义模式**：使用响应式 `fakeMedia` 对象。用户通过滑块 + 分钟/秒输入框控制进度。`setInterval` 每秒将 `fakeMedia.currentTime` 加 1。

### Web Components（`.ce.vue` 文件）

Content Script 的 UI 使用 Vue Custom Elements 以避免与宿主页面的 CSS 冲突：
- `content.ce.vue` — 主浮动面板（视频列表、剧集列表、弹幕容器、播放控件）
- `video-list.ce.vue` — 视频选择网格，带右键菜单
- `context-menu.ce.vue` — 右键删除/重命名下拉菜单
- `scroll-label.ce.vue` — 长文本自动滚动标签

这些组件之间通过 Vue `provide/inject` 使用 `contentInjectionKey`（定义在 `src/symbol.ts`）共享状态。

### 样式

- Element Plus 按需自动导入（unplugin-vue-components + unplugin-auto-import）
- 在 iframe 内全屏模式下，Element Plus CSS 变量以 `<style>` 元素形式注入到 iframe 的 document 中
- Content Script 样式在 `src/style/content.ce.scss`，Popup 样式内联在 `popup.vue` 中

### 核心文件

| 文件 | 用途 |
|------|------|
| `src/background.ts` | Service Worker：消息路由、网络请求规则、`MessageType` 枚举 |
| `src/components/content.ce.vue` | 核心：所有弹幕逻辑、全屏处理、视频/剧集增删改查 UI（约 960 行） |
| `src/service/base.ts` | Axios 实例、IndexedDB 初始化、`Platform` 枚举、`Video` 接口 |
| `src/service/barrage.ts` | 弹幕获取（3 个平台抓取器）、`Barrage`/`BarrageMode` 类型 |
| `src/service/episode.ts` | 剧集获取（3 个平台）、`TencentEpisodeFetcher` 类 |
| `src/symbol.ts` | `provide/inject` 键 + `ContentInjection` 接口 |
| `vite.config.ts` | 路径别名 `@/` → `src/`、crx 插件、自动导入配置 |
| `manifest.json` | 扩展清单（权限、content scripts、service worker） |

### 扩展打包

`@crxjs/vite-plugin` 在构建时处理 `manifest.json`。它解析 content script 路径（`src/content.ts`）、注入 Web Components polyfill（`custom-elements.min.js`），并生成可直接加载的 `dist/` 目录。在 Chrome 中以「已解压的扩展程序」方式加载 `dist/` 目录即可使用。
