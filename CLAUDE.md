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
| Popup | `src/popup.ts` | 工具栏按钮弹窗（搜索/手动添加视频 + 设置面板） |

### 消息流转

```
Content Script ←→ Service Worker ←→ 平台 API（Bilibili/腾讯/爱奇艺）
     ↕                    ↑
   Popup（搜索添加 / 设置项）  └── 手动添加：popup 直接 chrome.tabs.sendMessage 到内容脚本
```

Service Worker（`background.ts`）是消息路由器。它根据 `MessageType` 枚举将消息分发到 service 层。所有期望回调的 `chrome.runtime.sendMessage` 调用必须在监听器中 `return true`（异步 `sendResponse` 模式）。

例外：`MessageType.OPEN_ADD_PANEL`（popup → 内容脚本，弹「添加当前页面」确认框）由 popup 直接 `chrome.tabs.sendMessage` 发给标签页，**不经 background**，因此 `background.ts` 里没有对应 case。手动添加的参数解析与保存全部在内容脚本里完成（爱奇艺必须读页面 DOM），popup 只用 `matchManualAddPlatform` 判断能否添加，成功后关闭自己以免挡住页面弹窗。监听器与弹窗都在 `content.ce.vue` 中；解析是同步的，所以**不要 `return true`**。

### 数据层

- **IndexedDB**（`barrage_database`，store `videos`）：持久化用户添加的视频条目（名称、平台、平台相关参数如 `cid`/`vid`/`tvid`）。通过 `getDB()` 惰性打开。
- **chrome.storage.local**：持久化设置项。`floatBubbleOpened`（悬浮球显示/隐藏）由 popup 写入、content 读取，变更通过 `chrome.tabs.sendMessage`（`type: 'popup'`）在 content ↔ popup 之间同步；其余四项只有 content 读写，不同步 —— `isCustomPlay`（自动/自定义播放模式）、`barrageSettings`（弹幕速度/字号/区域/密度）、`episodeOrderDesc`（剧集正序/倒序）、`floatBubblePosition`（悬浮条停靠位置 `{ side: 'left' | 'right', top: number }`，top 为视口 px）。
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

两者共享一个媒体元素（自动模式用真实的 `<video>`，自定义模式用 `fakeMedia` 响应式对象）。在 `initDanmaku()` 中一起创建，在 `destroyInstances()` 中一起销毁（`destroyDanmaku()` 在其之上额外停表与复位时间）。Danmaku 库构造函数内部会调用 `resize()`，因此仅在视口/布局变化（例如全屏切换）后才需要显式调用 resize。

### 播放模式

- **自动模式**：同步到页面上的真实 `<video>` 元素。找不到视频时回退到自定义模式。
- **自定义模式**：使用响应式 `fakeMedia` 对象驱动。控件为播放/暂停、±10 秒步进、进度条、分/秒输入框，另有循环播放开关；到达结尾自动暂停。切换模式或选中剧集时会自动加载该集弹幕并停在 0:00。

`fakeMedia` 是手写的伪媒体对象，有几个不显然的约束：

- Danmaku 库是事件驱动的（构造时绑定 `play`/`playing`/`pause`/`waiting`/`seeking`），所以 `addEventListener`/`removeEventListener` 由模块内的 `mediaListeners` 事件表实现，**不能写成空函数**。补上之后暂停 = 库自己停掉 RAF（弹幕冻在原地）、seek = 库自己重算二分游标（不必销毁重建）。
- 只派发 `play` / `pause` / `seeking`；库绑的 `playing` / `waiting` 是缓冲语义，伪媒体没有缓冲。
- `fakeMedia.paused` **只有一个写点**：`initDanmaku()` 构造实例之前设为 `!isPlaying.value`。库构造函数据此决定是否自动 `seek()+play()`，所以重建实例时能自动续播，不需要额外的状态记录。其余地方改播放态一律走 `setLibraryPaused()` 发事件。
- 时间推进用 `requestAnimationFrame` + `performance.now()` 的真实 delta（`timeDriverTick`），不是 `setInterval` 累加。暂停时重新播种 `lastFrameWall` 因而不累积漂移；`visibilitychange` 与 `MAX_FRAME_DELTA` 共同防止后台/长卡顿后的时间跳变。
- `applySeek()` 是所有定位操作的唯一入口（钳制 + 写 `currentTime` + 派发 `seeking`）。

### 悬浮条拖拽与吸附

悬浮条（`.crx-content`）**整条**都是拖拽把手（含图标按钮和彩色气泡），松手后横向**必须**吸附到左/右边缘（取较近的一侧），纵向保留拖放高度。拖动逻辑在 `src/hooks/useDraggableRail.ts`。几个不显然的约束：

- **拖拽监听挂 window，不给悬浮条 `setPointerCapture`**。指针捕获会把后续指针事件的目标重定向到捕获元素，`click` 的事件目标因此变成悬浮条本身，而图标按钮是它的**后代**（不是兄弟节点），就再也收不到点击了。代价是要自己收尾：`pointerup` / `pointercancel` / window `blur` 三条路径都收敛到 `endDrag()`，并在 `onBeforeUnmount` 里调 `stop()`。
- 拖拽结束那一次 `click` 由捕获阶段的 `@click.capture` 吞掉（`onClickCapture`）。必须在捕获阶段：只有在悬浮条上先拦下来，才能挡住下面图标按钮和气泡各自的点击处理。该标志每次 `pointerdown` 重置，只吞一次。
- 面板（`-popup` / `-settings`）是悬浮条的**子元素**，所以在悬浮条上按下时要跳过命中面板的情况，否则在剧集列表里滚动、拖滑块都会被当成拖拽。这就是 `useDraggableRail` 的 `ignore` 选项。
- `touch-action: none` **不能**挂在 `.crx-content` 上：`touch-action` 由祖先链取交集，祖先禁掉了后代无法重新打开，会让面板里的列表没法触摸滚动。只能加在气泡和图标区这种不滚动的区域上。光标不做特殊处理，整条保持默认（气泡和图标各自原有的 `pointer` 不变）。

- **尺寸必须显式声明 `box-sizing: border-box`，并让停靠公式从 `--crx-rail-w` / `--crx-rail-h` 派生**。shadow tree 里没有全局 `box-sizing` 重置（`common.scss` 只重置了 `html/body` 的 margin），默认 content-box 会让 `width: 130px` 的实际占位变成 130 + padding 10 + border 2 = 142px；而停靠公式 `calc(100% - var(--crx-rail-w))` 拿的是内容宽，悬浮条右边缘就会跑到视口右边 12px 之外。有竖直滚动条的页面上，右侧的「播放列表」图标正好被滚动条盖住一截。（顺带记一条容易误判的：`position: fixed` 元素的 `left: 100%` 与 `right: 0` 解析到的是同一个宽度，都**不含**经典滚动条，所以这个锅不在 `left`/`right` 上。）
- 定位只用 `left` 一个属性表达：`--crx-rail-dock`（完全展开时的 left）+ `--crx-rail-dir × --crx-rail-offset`（收起时朝停靠边外移的距离），两个方向共用。这样拖拽的内联 `left: <px>` 与吸附后的 `calc()` 同为 `<length>`，吸附过程能走 `left` 的 transition（`right` 与 `auto` 之间无法插值）。改回 `left`/`right` 双份会丢掉吸附动画。
- `--crx-rail-offset` **只在** `:hover` / `.active` / `.idle-fullscreen` 里赋值，在基类里消费；不要把它写进 `.is-left`/`.is-right`，那几条规则同为 (0,2,0) 特指度，只能靠源码顺序决胜。
- **抓取偏移必须在越过 5px 阈值时才量**：悬浮条平时处于收起态，按下瞬间多半还在 `:hover` 的 left 过渡中途，提前量到的是旧坐标，会导致起步横向跳变。
- 拖拽中**横向不做钳制**：悬浮条收起时有一截在视口外，硬把它拽回屏幕内会让起步跳一整段收起距离；而横向位置不持久化（只存左/右停靠方向），松手必定吸附到边缘，所以中途甩出视口无所谓。纵向要钳制，因为高度会被持久化。
- `pointerdown` 要 `preventDefault()`（否则拖拽会选中宿主页面文字）。`click` 不是 compatibility mouse event，不会被 `preventDefault` 一并取消，所以气泡和图标按钮的 `@click` 都照常有效。
- 视口尺寸取 `rail.ownerDocument.documentElement.clientWidth/clientHeight`，不能用 `window.innerWidth/innerHeight`：`innerWidth` 含滚动条，且全屏时 `#crx-root` 会被搬进 iframe。
- 纵向不越界由 CSS 的 `top: clamp(0px, var(--crx-rail-top, 18%), 100% - 36px)` 兜底，不需要在 load/resize/全屏三处写 JS 钳制。
- 左停靠时内部布局也要镜像（`is-left` 下 `flex-direction: row-reverse`，图标容器再反向一次抵消）：镜像后气泡才紧贴停靠边，收起时探出来的是彩色气泡而不是一截图标，两侧收起后的观感一致。
- 面板是悬浮条的绝对定位子元素，因此左停靠时要镜像（`is-left`），位置偏低时要翻到悬浮条上方（`is-panel-above`，判定见 `refreshPanelAbove`）；否则固定 500px 高的播放列表会掉出视口底部。
- `idle-fullscreen` 的条件必须排除 `isDraggingBubble`：`preventDefault()` 抑制了按住期间的 compatibility mouse events，全屏下 `isMoving` 收不到信号会在 3s 后衰减，悬浮条会当场消失。

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
| `src/components/content.ce.vue` | 核心：所有弹幕逻辑、全屏处理、视频/剧集增删改查 UI、手动添加确认弹窗（约 1270 行） |
| `src/components/search-panel.vue` | Popup 搜索面板：搜索添加、当前页面卡片（点添加后由内容脚本弹确认框） |
| `src/service/base.ts` | Axios 实例、IndexedDB 初始化、`Platform` 枚举、`Video` 接口 |
| `src/service/barrage.ts` | 弹幕获取（3 个平台抓取器）、`Barrage`/`BarrageMode` 类型 |
| `src/service/episode.ts` | 剧集获取（3 个平台）、`TencentEpisodeFetcher` 类 |
| `src/service/manual-add.ts` | 手动添加：URL→平台映射 + 按 URL/按页面 DOM 解析视频参数 |
| `src/symbol.ts` | `provide/inject` 键 + `ContentInjection` 接口 |
| `vite.config.ts` | 路径别名 `@/` → `src/`、crx 插件、自动导入配置 |
| `manifest.json` | 扩展清单（权限、content scripts、service worker） |

### 扩展打包

`@crxjs/vite-plugin` 在构建时处理 `manifest.json`。它解析 content script 路径（`src/content.ts`）、注入 Web Components polyfill（`custom-elements.min.js`），并生成可直接加载的 `dist/` 目录。在 Chrome 中以「已解压的扩展程序」方式加载 `dist/` 目录即可使用。
