# AGENTS.md

此文件为 Codex（Codex.ai/code）在本仓库中工作时提供指导。

> `CLAUDE.md` 是本文件的完整副本（供 Claude Code 使用），改动请两边同步。

## 构建与开发命令

```bash
pnpm dev          # 启动 Vite 开发服务器（扩展开发热更新）
pnpm build        # 生产构建 → dist/
pnpm preview      # 预览构建产物
pnpm lint         # ESLint 检查（Antfu 配置，TypeScript + Vue）
pnpm lint:fix     # ESLint 自动修复
pnpm protoc       # 根据 src/protobuf/barrage.proto 重新生成 protobuf 绑定
```

本项目没有测试。

## 项目概览

一个 Chrome 扩展（Manifest V3），在视频页面上注入弹幕。支持 Bilibili、腾讯视频和爱奇艺。基于 Vue 3 + Vite + TypeScript，使用 `@crxjs/vite-plugin` 打包，Element Plus 按需自动导入。

依赖里有几个是「非它不可」的，换掉就等于重写：`danmaku`（弹幕引擎）、`protobufjs`（B 站分段解码）、`pako`（爱奇艺 zlib 解压）、`idb`（IndexedDB 封装）、`axios`。

## 目录结构

```
src/
├── background.ts            Service Worker：消息路由 + declarativeNetRequest 动态规则
├── content.ts               Content Script 引导：建 #crx-root、注册 <crx-content>、挂载 content.vue
├── popup.ts                 Popup 引导：挂载 popup.vue
├── message-type.ts          MessageType 枚举
├── symbol.ts                contentInjectionKey + ContentInjection 接口
├── components/
│   ├── content.vue          轻 DOM 包装层：floatBubbleOpened 开关，只渲染 <crx-content>
│   ├── content.ce.vue       核心（约 1410 行）：弹幕、播放、悬浮条、全屏、增删改查 UI
│   ├── video-list.ce.vue    视频网格 + 右键菜单 + 行内重命名
│   ├── episode-list.vue     剧集列表（无 <style> 块，样式在 content.ce.scss）
│   ├── context-menu.ce.vue  右键下拉菜单
│   ├── scroll-label.ce.vue  长文本跑马灯
│   ├── popup.vue            工具栏弹窗外壳：「搜索」/「设置」两个 tab
│   └── search-panel.vue     搜索面板 + 当前页面卡片
├── hooks/
│   ├── useDraggableRail.ts     悬浮条拖拽 + 吸附
│   ├── useIframeMouseBridge.ts 全屏 iframe 鼠标事件桥
│   └── useCatchMouseMove.ts    mousemove 空闲检测（注意：导出名是 useCatchMoveMouse）
├── service/                 仅 Service Worker 侧使用
│   ├── base.ts              axios 实例、getDB()、Platform、Video、BaseResponse
│   ├── video.ts             videos store 的唯一 CRUD 面
│   ├── barrage.ts           3 个平台弹幕抓取器 + BarrageMode
│   ├── episode.ts           3 个平台剧集获取
│   ├── search.ts            3 个平台搜索 + extractTvidFromUrl
│   ├── emoji.ts             腾讯弹幕表情
│   ├── manual-add.ts        URL→平台匹配 + 按 URL / 按页面 DOM 解析
│   └── index.ts             桶导出
├── utils/
│   └── barrage-settings.ts  播放设置 + 过滤/密度管线
├── style/                   theme / common / animation / content.ce.scss
├── types/                   auto-imports.d.ts、components.d.ts、danmaku.d.ts
└── protobuf/                barrage.proto + 生成的绑定
```

## 架构

### 三个入口

| 入口 | 文件 | 用途 |
|------|------|------|
| Service Worker | `src/background.ts` | 消息中枢、declarativeNetRequest 跨域规则、连接 content ↔ popup |
| Content Script | `src/content.ts` | 注入到每个页面。通过 `defineCustomElement` 创建 Web Component（`<crx-content>`）并挂载一个 Vue 包装组件 |
| Popup | `src/popup.ts` | 工具栏按钮弹窗（搜索/手动添加视频 + 设置面板） |

`content.ts` 只做引导：建 `#crx-root` 追加到 `document.body`、`customElements.define('crx-content', defineCustomElement(ContentCe))`、再把 `content.vue` 挂到该 root。它自身**不含任何消息处理**，监听器都在 `content.vue` 与 `content.ce.vue` 里。`vite.config.ts` 里 `isCustomElement: tag => tag === 'crx-content'` 让 Vue 编译器把这个标签当原生元素。

### 消息流转

```
Content Script ←→ Service Worker ←→ 平台 API（Bilibili/腾讯/爱奇艺）
     ↕                    ↑
   Popup（搜索添加 / 设置项）  └── 手动添加：popup 直接 chrome.tabs.sendMessage 到内容脚本
```

**这里有两套互不相干的命名空间**，改消息时最容易搞混：

- **`MessageType` 数字枚举**（`src/message-type.ts`）——走 `chrome.runtime.sendMessage`，由 background 路由。定义在独立文件是为了避免 popup 导入 background 带来副作用；`background.ts` 把它 **re-export** 了一次（`export { MessageType }`），而 `content.ce.vue` / `video-list.ce.vue` / `episode-list.vue` 三个组件是从 `@/background` 导入的，所以这层转出是承重的，不能删。只有 `search-panel.vue` 直接从 `@/message-type` 导入。
- **裸字符串 `{ type: 'popup', ... }`** ——popup ↔ content 之间的设置同步，**不经 background**，也不属于 `MessageType`。popup 用 `sendMsgToAllContent` 遍历所有标签页发 `chrome.tabs.sendMessage`；`content.vue` 认 `floatBubbleOpened`，`content.ce.vue` 认 `isCustomPlay`。

background 的路由是单个 `chrome.runtime.onMessage.addListener` 里的 `switch (message.type)`，**`return true` 写在 switch 外面、是无条件的**（不是只在异步分支里），所以包括 `GET_VIDEO_NAME`、`OPEN_ADD_PANEL` 这些没有 case 的类型也会返回 `true`。监听器回调不能写成 `async`。

例外：`MessageType.OPEN_ADD_PANEL`（popup → 内容脚本，弹「添加当前页面」确认框）由 popup 直接 `chrome.tabs.sendMessage` 发给标签页，**不经 background**，因此 `background.ts` 里没有对应 case。手动添加的参数解析与保存全部在内容脚本里完成（爱奇艺必须读页面 DOM），popup 只用 `matchManualAddPlatform` 判断能否添加，成功后关闭自己以免挡住页面弹窗。监听器与弹窗都在 `content.ce.vue` 中；解析是同步的，所以**不要 `return true`**。

`MessageType.GET_VIDEO_NAME` 是死枚举——全仓库只有它自己的声明，没有任何发送方或 handler。

### 数据与存储

**IndexedDB**（`barrage_database`，version 1，store `videos`，`keyPath: 'id'` + `autoIncrement`）：持久化用户添加的视频条目。`getDB()`（`service/base.ts`）把连接 promise 惰性缓存起来。记录形状即 `Video`：

```ts
{ id?: number, name: string, platform: Platform, params: Record<string, any> }
```

`id` 可选，因为是 autoIncrement 分配的。**只有 Service Worker 侧碰 IndexedDB**，CRUD 全部收口在 `service/video.ts`（content 与 popup 一律通过消息间接读写）。

**chrome.storage.local** —— 共 5 个键：

| 键 | 形状 | 读 | 写 | 同步 |
|----|------|----|----|------|
| `floatBubbleOpened` | `boolean` | `content.vue`、`popup.vue` | `popup.vue` | **是**（`type: 'popup'` 广播） |
| `isCustomPlay` | `boolean` | `content.ce.vue`、`popup.vue` | `popup.vue`、`content.ce.vue` | **仅 popup → content**，反向不同步 |
| `barrageSettings` | `BarragePlaybackSettings` | `content.ce.vue` | `content.ce.vue` | 否 |
| `episodeOrderDesc` | `boolean` | `content.ce.vue` | `episode-list.vue` | 否 |
| `floatBubblePosition` | `{ side: 'left' \| 'right', top: number }` | `content.ce.vue` | `content.ce.vue` | 否 |

`floatBubblePosition.top` 是**视口 px**；`restoreBubblePosition` 会校验两个字段并拒绝非有限的 `top`。`content.ce.vue` 在初始化时用一次 `chrome.storage.local.get([...])` 批量读 4 个键（不含 `floatBubbleOpened`），读完才把 `initialized` 置为 `true` —— **`initialized` 才是悬浮条的挂载开关**，所以这个顺序不能调。

注意 `popup.vue` 里 `isCustomPlay` 的 watcher 带 `{ immediate: true }`（`floatBubbleOpened` 的不带），因此每次打开 popup 都会重写一次并广播。

**弹幕数据**：按需从平台 API 获取，缓存在内存中的 `barragesMap`（`Map<string, Barrage[]>`，以剧集 `vid` 为键）。不持久化。

### 平台支持

`Platform` 枚举（`service/base.ts`）：**1 = 腾讯，2 = Bilibili，3 = 爱奇艺**（B 站是中间值，别按直觉假设顺序）。分发通过以 `Platform` 为键的 `platformToRequest` 查找对象实现。

| 平台 | 弹幕抓取器 | 分段 | 并发 | 格式 |
|------|----------|------|------|------|
| Bilibili | `BiliBiliBarrageFetcher` | 6 分钟，1-based | 6（默认） | protobuf，`protobufjs` 解码，`elem.mode` 原样透传 |
| 腾讯视频 | `TencentBarrageFetcher` | 30 秒，按 `segment_start` 过滤 | 8 | JSON |
| 爱奇艺 | `IqiyiBarrageFetcher` | 5 分钟，1-based | 4 | zlib 压缩 XML，`pako` 解压后正则解析 |

剧集来源：Bilibili 走 `pgc/view/web/season`；腾讯走 `PageServer/GetPageData` RPC（两阶段，先 `page_context: ''` 抓 tab 再逐页取）；爱奇艺走 `album/avlistinfo`，只有 `tvid` 时回退 `playervideoinfo`。

抓取侧公共设施在 `service/barrage.ts`：`requestWithRetry`（最多 3 次，退避 `250 * 2 ** attempt` ms）与 `fetchInBatches`（标称并发 6）。各抓取器在 `!params.duration || !params.vid` 或抛错时返回 `[]`，不会向上抛。

**一个坑**：`GET_BARRAGES` 的调用方（`content.ce.vue`、`episode-list.vue`）都会在 `params` 里多传一个 `filter: true`，但**服务端完全忽略它** —— 过滤发生在客户端的渲染管线里，不在抓取侧。

### 跨域请求

`background.ts` 里 3 条 **declarativeNetRequest 动态规则**（不是静态 `rule_resources`），在 `onInstalled` 时用 `updateDynamicRules` 注册，全部 `resourceTypes: ['xmlhttprequest']`，作用是补上各平台 API 要求的 `referer` / `origin`：

| id | urlFilter | 设置的头 |
|----|-----------|---------|
| 1 | `video.qq.com` | `referer` + `origin` → `https://v.qq.com` |
| 2 | `bilibili.com` | `referer` → `https://www.bilibili.com`（无 origin） |
| 3 | `iqiyi.com` | `referer` + `origin` → `https://www.iqiyi.com` |

## 弹幕管线

### 播放设置（`src/utils/barrage-settings.ts`）

`barrageSettings` 在 `content.ce.vue` 里是 `reactive({ ...DEFAULT_BARRAGE_SETTINGS })`，**默认值定义在 `utils/barrage-settings.ts`**，不在组件里。

| 字段 | 默认 | `normalizeBarrageSettings` 归一化 | 作用 |
|------|------|-----------------------------------|------|
| `speed` | 1 | `clamp(0.5, 2)` | 滚动速度 = `BASE_BARRAGE_SPEED`(144) × speed；同时参与轨道碰撞的 duration 计算 |
| `displayArea` | 25 | 吸附到 `[20, 25, 50, 75, 100]` | 容器高 `calc(Nvh + 1px)`；**兼作密度的 `areaScale = N / 25`** |
| `density` | 60 | `round(clamp(20, 100))` | 见下 |
| `fontSize` | 16 | `round(clamp(12, 32))` | 行高 `max(24, ceil(fontSize * 1.5))` |
| `opacity` | 85 | `round(clamp(MIN_BARRAGE_OPACITY=10, 100))` | 容器 `opacity` |

`displayArea` 兼容一个旧字段 `rows`（`rows / 24 * 100` 迁移），当前没有代码写它。

### 过滤与密度

`filterBarragesForDisplay(barrages, platform, settings, stageWidth, stageHeight)` 是唯一入口，按固定顺序跑：

1. 按 `offset` 升序排序（`weight` 降序打破并列），**排的是副本**。
2. 丢弃 `content.length < minimumContentLength || weight < minimumWeight`。
3. `mode === TOP || mode === BOTTOM` → `special[]`，**其余全部进 `scroll[]`**。
4. 两个数组各自 `sampleEvenly` 抽稀。
5. 滚动弹幕走 `selectNonOverlappingScrollBarrages` 分配轨道。
6. 固定弹幕走 `limitSpecialBarrages`。

**没有模式白名单**。`BarrageMode`（`service/barrage.ts`）有 `SCROLL=0 / BOTTOM=4 / TOP=5 / REVERSE=6 / ADVANTAGE=7 / CODE=8 / SCRIPT=9`，但代码只特判 TOP/BOTTOM，`REVERSE`/`ADVANTAGE`/`CODE`/`SCRIPT` 会被当成滚动弹幕渲染。渲染侧 `specialComments` 又进一步收敛成 `mode === TOP ? 'top' : 'bottom'` —— **任何非 TOP 的 special 都按底部渲染**。实际抓取器只产出 SCROLL/TOP/BOTTOM。

一个 `density` 驱动 5 套机制：

- `getMinimumWeight` —— `density >= 100` 时直接 `-Infinity`（等于关闭权重过滤）；`<= 60` 用 `profile.minWeight`；60→100 之间在 `minWeight` 与 `denseMinWeight` 线性过渡。
- `sampleEvenly` —— 比例抽稀（`density / 100` 累加器）。
- `selectNonOverlappingScrollBarrages` —— 轨道分配 + 每秒上限 + 最小间隔 + 同时间戳上限；**找不到空轨道就丢弃该条**，接受时写入 `lane`。
- `limitSpecialBarrages` —— 固定弹幕的每秒上限与按模式最小间隔，top/bottom 分别计数。
- `areaScale` —— 由 `displayArea` 参与缩放上述限流阈值（`displayArea` 越大允许越密）。

**`density === 100` 是逃生舱**：权重过滤关闭、`minContentLength` 降到 1、每秒上限 `Infinity`、最小间隔 0、同时间戳上限放宽到轨道数，但**轨道防重叠仍然生效**。UI 提示文案（`content.ce.vue` 设置面板）说的就是这件事。

各平台的 `DENSITY_PROFILES`（`minWeight / denseMinWeight / minContentLength / scrollPerSecond / specialPerSecond / scrollInterval / specialInterval / maxSameTimestamp`）：

| 平台 | 值 |
|------|-----|
| BILIBILI | 2 / 1 / 2 / 7 / 2 / 150 / 500 / 1 |
| TENCENT | 50 / 20 / 2 / 4 / 2 / 220 / 500 / 3 |
| IQIYI | 1 / 0 / 2 / 3 / 2 / 260 / 600 / 3 |

腾讯的 `minWeight` 门槛（50/20）显著高于另外两家，这是按平台弹幕质量定的，不要「顺手对齐」。

### 渲染

`content.ce.vue` 中两个模块级（**普通 `let`，不是 ref**）的 `Danmaku` 库实例：

- **`danmaku`** —— 滚动弹幕，`speed: BASE_BARRAGE_SPEED * barrageSettings.speed`
- **`specialDanmaku`** —— 顶部/底部固定弹幕，**`speed` 硬编码 500**，不乘 `barrageSettings.speed`

两者共享一个媒体元素（自动模式用真实的 `<video>`，自定义模式用 `fakeMedia`）。生命周期三个函数分工明确：

- `initDanmaku()` —— 一起创建。内部先解析媒体元素：非自定义模式找页面 `<video>`，找不到再扫同源 iframe；仍然没有就弹 `ElNotification` 并**直接赋值 `isCustomPlay.value = true` 回退到自定义模式**（这里刻意不走 `setCustomPlay`）。Danmaku 库构造函数内部会调用 `resize()`，因此仅在视口/布局变化后才需要显式 `resize()`。
- `destroyInstances()` —— 只销毁实例、清 `loadedVId`，**不动时间也不动播放态**。
- `destroyDanmaku(resetTime = true)` —— 在 `destroyInstances()` 之上停表 + `isPlaying = false` + 复位时间。

`rebuildDanmakuForSettings()`（设置变更 / 视口变化 / 全屏切换后）走的是 `destroyInstances()` + `initDanmaku()`。

## 播放模式

- **自动模式**：同步到页面上的真实 `<video>` 元素。找不到视频时回退到自定义模式。
- **自定义模式**：使用响应式 `fakeMedia` 对象驱动。控件为播放/暂停、±10 秒步进（`STEP_SECONDS = 10`）、进度条、分/秒输入框，另有循环播放开关；到达结尾自动暂停。切换模式或选中剧集时会自动加载该集弹幕并停在 0:00。

### `fakeMedia` 的约束

它是个手写的 `reactive({...})`，只有 5 个成员：`currentTime`、`paused`、`playbackRate`、`addEventListener`、`removeEventListener`。几个不显然的地方：

- **不能用 `class extends EventTarget`**：`reactive()` 的 Proxy 会破坏 EventTarget 的内部槽，`dispatchEvent` 会抛 `Illegal invocation`。所以事件表是手写的 `Map`，且这些方法都不依赖 `this`。（`playbackRate` 声明了但全仓库没有任何读写，属历史遗留。）
- Danmaku 库是事件驱动的（构造时绑定 `play`/`playing`/`pause`/`waiting`/`seeking`），所以 `addEventListener`/`removeEventListener` **不能写成空函数**——那等于废掉库的全部能力。补上之后暂停 = 库自己停掉 RAF（弹幕冻在原地）、seek = 库自己重算二分游标（不必销毁重建）。
- `emitMediaEvent` 迭代的是 `[...set]` 快照：handler 可能触发 `destroy` → `unbindEvents` 而改动同一个 Set。`clearMediaListeners()` 在 `initDanmaku` 开头调用，清掉上一次构造失败残留的孤儿 handler。
- 只派发 `play` / `pause` / `seeking`；库绑的 `playing` / `waiting` 是缓冲语义，伪媒体没有缓冲。注意 Map 的键只是 TS 类型，库若真注册了 `playing` handler，它会静静躺在 Map 里永不触发。
- `fakeMedia.paused` **只有一个写点**：`initDanmaku()` 构造实例之前设为 `!isPlaying.value`。库构造函数据此决定是否自动 `seek()+play()`，所以重建实例时能自动续播，不需要额外的状态记录。其余地方改播放态一律走 `setLibraryPaused()` 发事件。
- `applySeek()` 是所有定位操作的唯一入口（钳制到 `[0, totalDuration]` + 写 `currentTime` + 派发 `seeking`）。
- `setLibraryPaused()` 只同步库实例的播放状态（拖动期间临时用），不动 `isPlaying`、不动时钟。

### 播放时钟

时间推进用 `requestAnimationFrame`，**用的是 rAF 回调的 `wall` 时间戳参数**（不是显式调用 `performance.now()`，虽然同源）。唯一实现是 `timeDriverTick`：

- 每帧先把自己重新排进 rAF，再算 `delta = (wall - lastFrameWall) / 1000`。
- `lastFrameWall === 0` 表示未播种：只记基线、不推进。暂停后重新起播、以及 `visibilitychange` 回到可见时（`document.hidden` 为假就 `lastFrameWall = 0`），都靠这个机制重新播种，因此**不累积漂移、也不跳变**。
- `delta > MAX_FRAME_DELTA`（0.25s）时被钳到上限，兜住后台/长卡顿。
- 只在 `isPlaying && !isSeeking` 时推进，终点交给 `advanceTime`：开了循环就 `applySeek(0)` 保持播放态，否则 `applySeek(total)` + `applyPlayState(false)`。

## 悬浮条

悬浮条（`.crx-content`）**整条**都是拖拽把手（含图标按钮和彩色气泡），松手后横向**必须**吸附到左/右边缘（取较近的一侧），纵向保留拖放高度。拖动逻辑在 `src/hooks/useDraggableRail.ts`。

### 拖拽手势

- **拖拽监听挂 window，不给悬浮条 `setPointerCapture`**。指针捕获会把后续指针事件的目标重定向到捕获元素，`click` 的事件目标因此变成悬浮条本身，而图标按钮是它的**后代**（不是兄弟节点），就再也收不到点击了。代价是要自己收尾：`pointerup` / `pointercancel` / window `blur` 三条路径都收敛到 `endDrag()`，并在 `onBeforeUnmount` 里调 `stop()`。挂的是 `rail.ownerDocument.defaultView`（不是裸 `window`），全屏搬进 iframe 后仍然挂在正确的窗口上。
- 拖拽结束那一次 `click` 由捕获阶段的 `@click.capture` 吞掉（`onClickCapture`）。必须在捕获阶段：只有在悬浮条上先拦下来，才能挡住下面图标按钮和气泡各自的点击处理。该标志每次 `pointerdown` 重置，只吞一次。
- 面板（`-popup` / `-settings`）是悬浮条的**子元素**，所以在悬浮条上按下时要跳过命中面板的情况，否则在剧集列表里滚动、拖滑块都会被当成拖拽。这就是 `useDraggableRail` 的 `ignore` 选项（传入 `.crx-content-popup, .crx-content-settings`）。
- **抓取偏移必须在越过 5px 阈值时才量**（`DRAG_THRESHOLD`）：悬浮条平时处于收起态，按下瞬间多半还在 `:hover` 的 left 过渡中途，提前量到的是旧坐标，会导致起步横向跳变。
- 拖拽中**横向不做钳制**：悬浮条收起时有一截在视口外，硬把它拽回屏幕内会让起步跳一整段收起距离；而横向位置不持久化（只存左/右停靠方向），松手必定吸附到边缘，所以中途甩出视口无所谓。纵向要钳制，因为高度会被持久化。
- `pointerdown` 要 `preventDefault()`（否则拖拽会选中宿主页面文字）。`click` 不是 compatibility mouse event，不会被 `preventDefault` 一并取消，所以气泡和图标按钮的 `@click` 都照常有效。
- `touch-action: none` **不能**挂在 `.crx-content` 上：`touch-action` 由祖先链取交集，祖先禁掉了后代无法重新打开，会让面板里的列表没法触摸滚动。只能加在气泡和图标区这种不滚动的区域上。光标不做特殊处理，整条保持默认。

### 停靠与吸附

定位只用 `left` 一个属性表达，两个方向共用：

| 变量 | 值 | 说明 |
|------|-----|------|
| `--crx-rail-w` | `142px` | 与原 content-box 的 `width:130 + padding:0 5px + border:1px` 等宽 |
| `--crx-rail-h` | `38px` | 同上，原 `height:36 + border:1px` |
| `--crx-rail-dock` | `calc(100% - var(--crx-rail-w))` | 完全展开时的 left；`.is-left` 覆盖为 `0px` |
| `--crx-rail-dir` | `1` | 右停靠；`.is-left` 覆盖为 `-1` |
| `--crx-rail-peek` | `92px` | 收起时移出视口的距离，留下 50px 可见 |
| `--crx-rail-peek-idle` | `72px` | 全屏闲置时收得更深 |
| `--crx-rail-offset` | `var(--crx-rail-peek)` | 基类消费；见下 |

```scss
top: clamp(0px, var(--crx-rail-top, 18%), calc(100% - var(--crx-rail-h)));
left: calc(var(--crx-rail-dock) + var(--crx-rail-dir) * var(--crx-rail-offset));
```

- 这样拖拽的内联 `left: <px>` 与吸附后的 `calc()` 同为 `<length>`，吸附过程能走 `left` 的 transition（`right` 与 `auto` 之间无法插值）。改回 `left`/`right` 双份会丢掉吸附动画。
- `--crx-rail-offset` **只在** `:hover` / `.active` / `.idle-fullscreen` 里赋值，在基类里消费；不要把它写进 `.is-left`/`.is-right`，那几条规则同为 (0,2,0) 特指度，只能靠源码顺序决胜。同样的「特指度相同、靠源码顺序决胜」还出现在 `.crx-content-popup__transport` 的禁用态上，那里用注释标了「必须排在最后」。
- 纵向不越界由 CSS 的 `top: clamp(...)` 兜底，不需要在 load/resize/全屏三处写 JS 钳制。
- **视口尺寸取 `rail.ownerDocument.documentElement.clientWidth/clientHeight`**，不能用 `window.innerWidth/innerHeight`：`innerWidth` 含滚动条，且全屏时 `#crx-root` 会被搬进 iframe。

### 尺寸与滚动条

**尺寸必须显式声明 `box-sizing: border-box`，并让停靠公式从 `--crx-rail-w` / `--crx-rail-h` 派生**。shadow tree 里没有全局 `box-sizing` 重置（`common.scss` 只重置了 `html/body` 的 margin，且它被注入到 shadow 后那两条选择器什么都不匹配），默认 content-box 会让 `width: 130px` 的实际占位变成 130 + padding 10 + border 2 = 142px；而停靠公式 `calc(100% - var(--crx-rail-w))` 拿的是内容宽，悬浮条右边缘就会跑到视口右边 12px 之外。有竖直滚动条的页面上，右侧的「播放列表」图标正好被滚动条盖住一截。

（顺带记一条容易误判的：`position: fixed` 元素的 `left: 100%` 与 `right: 0` 解析到的是同一个宽度，都**不含**经典滚动条，所以这个锅不在 `left`/`right` 上。）

### 面板

面板是悬浮条的绝对定位子元素：

- 左停靠时整体镜像（`is-left` 下 `border-radius` 反向、`flex-direction: row-reverse`，图标容器再反向一次抵消，面板 `right: auto; left: 15px`）。镜像后气泡才紧贴停靠边，收起时探出来的是彩色气泡而不是一截图标，两侧收起后的观感一致。
- 位置偏低时要翻到悬浮条上方（`is-panel-above`，判定见 `refreshPanelAbove`），否则固定 500px 高的播放列表会掉出视口底部。
- 翻转判定拿的是常量 `PANEL_HEIGHT = 500`（配 `PANEL_OFFSET = 51`、`PANEL_MARGIN = 8`），所以两个面板的高度都必须钉死在预算内：**播放列表是固定 `height: 500px`，设置面板是 `max-height: 500px` + `__body` 内部滚动**。设置项只增不减，一旦让它按内容撑开，变高之后翻转就会算错（该翻不翻、翻了又顶出视口上沿）。
- `idle-fullscreen` 的条件必须排除 `isDraggingBubble`：`preventDefault()` 抑制了按住期间的 compatibility mouse events，全屏下 `isMoving` 收不到信号会在 3s 后衰减，悬浮条会当场消失。

### 悬浮气泡

`.crx-float-bubble` 是悬浮条上的播放模式开关：平常显示 `A`（自动）或 `C`（自定义），自定义模式下若播放列表面板开着则显示当前时间（`formatTime(fakeMedia.currentTime)`），hover 300ms 后变成切换图标。点击即 `setCustomPlay(!isCustomPlay)`。

`isMoving` 来自 `useCatchMoveMouse()`（无参调用 → 3s 衰减；内部用 300ms 节流监听 `mousemove`）。它只做两件事：给 `idle-fullscreen` 供信号、以及在全屏下触发两个实例的 `resize()`（全屏时 canvas 会被视频盖住）。进入拖拽时会 `handleBubbleMouseleave()` 清掉待触发的 300ms hover 定时器。

## 全屏（iframe）适配

`fullscreenchange` 处理器（`content.ce.vue`）把 `#crx-root` 搬进全屏元素：全屏元素是同源 iframe 时搬进它的 `body`，并把 element-plus 的 CSS 变量以 `<style>` 注入该文档（变量来自 `element-plus/theme-chalk/el-var.css?raw` 的原始导入）；否则直接 append 到全屏元素下。**DOM 换了文档，JS 仍在顶层 realm**，所以第三方代码里挂在裸 `window` / `document` 上的监听会全部失灵：

- element-plus 的滑块拖拽就栽在这里：`use-slider-button` 把 `mousemove`/`mouseup`/`contextmenu` 挂在模块作用域的 `window`（顶层）上，而按下走的 `mousedown` 是元素上的（发生在 iframe 里），于是全屏下拖不动；`onDragEnd` 不执行还会让 `initData.dragging` 卡在 true，之后连点轨道都失效。`src/hooks/useIframeMouseBridge.ts` 因此在 iframe 文档上旁听鼠标/触摸事件、原样重投到顶层 `window` 来兜住它。
- 已有先例：`useDraggableRail` 用 `el.ownerDocument.defaultView` 取窗口，视口尺寸一律取 `ownerDocument.documentElement.clientWidth/clientHeight`。桥是同一个问题的反向解法 —— 那边能自己挑窗口，这边挑不了（element-plus 写死在 `window` 上），只能把事件送过去。

### 事件桥的约束

- **只在「按在插件 UI 里」的期间转发**。按下时用 `composedPath().includes(uiRoot)` 武装，每次按下都重新赋值而不是置位：视频在 `#crx-root` 之外（弹幕容器 `pointer-events: none`，按下去命中的是 `<video>`），要能立刻解除武装。命中判定只能用 `composedPath`：UI 在 `crx-content` 的开放 shadow root 里，`document` 上的监听拿到的 `event.target` 已被重定向成宿主元素 `crx-content`，只有 `composedPath` 里还留着 shadow root 之外的 `#crx-root`。
- **重投目标是顶层 `window` 而不是顶层 `document`**：派发到 `window` 的传播路径只有 `window` 一层（AT_TARGET），宿主页挂在 `document` 上的监听不会被顺带打起来；反过来派发到 `document` 会连它一起打。代价是宿主页挂在 `window` 上的 `mousemove` 也会收到，所以上面那条「只在按住的期间转发」是必需的，不是优化。
- **坐标必须原样搬运**：element-plus 拿 `event.clientX` 减去 iframe 里那个滑块的 `getBoundingClientRect()`，两边同属 iframe 视口坐标系。换算成顶层坐标反而是错的，而且真全屏下 iframe 铺满屏幕、两种坐标恰好接近，写错了也不容易发现。
- **`buttons === 0` 是补投信号**：把指针拖出浏览器窗口再松手时，iframe 收不到那一次 `mouseup`。此后如果还按过期的 `startX` 转发 `mousemove`，element-plus 会把滑块直接甩到指针位置。看到 `buttons === 0` 就补投一次 `mouseup` 收尾，顺带解开卡住的 `initData.dragging`（否则轨道会一直点不动）。
- **触摸走同一条路，但重投成鼠标事件**：element-plus 的 `onDragging` / `onDragEnd` 本来就同时注册在 `mousemove` / `mouseup` 上，而 `getClientXY` 只在 type 以 `touch` 开头时才去掏 `event.touches[0]`（空列表会直接抛异常），投成 `mousemove` 省事又不用构造 `Touch` 对象。注意 **`touchstart` 只武装、不转发**，从不合成 `mousedown`。
- `touchstart` 必须自己收：滑块把手上 element-plus 注册的 `touchstart` 是 `passive: false` 且会 `preventDefault`，兼容鼠标事件被一并取消，光靠 `mousedown` 武装不起来；而触摸结束也不会有 `mouseup`，滑块会永久卡死。`touchmove` 取 `event.touches[0]`，`touchend`/`touchcancel` 时 `touches` 已空，只能取 `changedTouches[0]`。
- **一律用捕获阶段**：只是旁听，不能被 iframe 里页面自己的 `stopPropagation` 挡掉。触摸还要 `passive`，同样只是旁听，绝不能挡住 iframe 里页面的滚动。
- 桥必须在 `fullscreenchange` 处理器**开头无条件 `stop()`**，再在 iframe 分支里 `start()`：处理器有多个早退分支，且退出全屏时若桥还在，会把 iframe 坐标系的事件投给已搬回顶层、按顶层坐标布局的滑块。

### 尚未处理

同一原因的遗留问题（暂未影响功能）：

- 全屏 iframe 下「添加视频」对话框的 ESC 关闭失效（element-plus 把 keydown 挂在顶层 `document` 上），其滚动锁与焦点恢复也作用在顶层 `document.body` 上。
- `to="body"` 的传送目标解析的是全局 document，往 body 上 teleport 的组件在全屏下会不可见。现有 `el-message` / `el-notification` 都显式传了 `appendTo`，滑块也全部关掉了 tooltip。

## UI 组件与样式

### Web Components

Content Script 的 UI 使用 Vue Custom Elements 以避免与宿主页面的 CSS 冲突。`content.vue` 是唯一的例外（轻 DOM，直接挂在 `#crx-root` 下），它只负责 `floatBubbleOpened` 开关，`v-if` 控制 `<crx-content>` 的存在与否。

组件间通过 Vue `provide/inject` 使用 `contentInjectionKey`（定义在 `src/symbol.ts`，接口 `ContentInjection` 共 12 个字段：`dialogEl`、`barragesMap`、`videos`、`selectedVideoId`、`selectedVId`、`episodesMap`、`videoMap`、`selectedEpisode`、`isCustomPlay`、`isEpisodeOrderDesc`、`videoGroup`、`emojiMap`）共享状态。provide 在 `content.ce.vue`，inject 在 `video-list.ce.vue` / `episode-list.vue`（两处都用了非空断言 `!`）。

### 样式

- Element Plus 按需自动导入（unplugin-vue-components + unplugin-auto-import），`IconsResolver` 的 `enabledCollections: ['ep']` 且**排在 `ElementPlusResolver` 前面**。
- Vue 的 API 全部自动导入，组件里看不到 `import { ref }`。
- Content Script 样式集中在 `src/style/content.ce.scss`（约 634 行，整个 shadow tree 的唯一样式表，里面 `@use` 了 15 个 element-plus 组件样式）。`episode-list.vue` 没有 `<style>` 块，它的 `.crx-episode` 样式也在这里。Popup 样式内联在 `popup.vue` 中。
- `common.scss` 只做 `html, body { margin: 0 }`。它被**两个地方**引入：`content.ts` 的 `import './style/index.scss'` 进宿主页轻 DOM（margin 真的生效）、`content.ce.scss` 的 `@use './index.scss'` 进 shadow（那两条选择器什么都不匹配）—— 所以别指望 shadow tree 里有任何全局重置。
- `theme.scss` 用 `:host, :root` 双选择器写 element-plus 的 `--el-color-primary*`，`:host` 命中 shadow、`:root` 命中普通页面（popup），各自在对方语境下不匹配。
- 自定义属性的值不会被 Sass 求值，**必须用 `#{}` 插值**，否则会原样输出 `$brand`。

## 扩展打包

`@crxjs/vite-plugin` 在构建时处理 `manifest.json`。它解析 content script 路径（`src/content.ts`）、注入 Web Components polyfill（`custom-elements.min.js`，manifest 里显式列在 `content.ts` 之前），并生成可直接加载的 `dist/` 目录。在 Chrome 中以「已解压的扩展程序」方式加载 `dist/` 目录即可使用。

`manifest.json` 的权限是 6 个（`activeTab`、`tabs`、`storage`、`declarativeNetRequest`、`declarativeNetRequestWithHostAccess`、`declarativeNetRequestFeedback`）配 6 条 host_permissions，content script 匹配 `<all_urls>`。没有 `web_accessible_resources`，样式靠 JS 导入注入而不是 manifest 的 `css` 字段。
