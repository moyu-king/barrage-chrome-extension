<script setup lang="ts">
import type { Barrage, EmojiInfo, Episode, Video } from '@/service'

import {
  CloseBold,
  Film,
  Operation,
  Refresh,
  RefreshLeft,
  RefreshRight,
  Setting,
  Switch,
  VideoPause,
  VideoPlay,
} from '@element-plus/icons-vue'
import Danmaku from 'danmaku'
import { ElMessage, ElNotification } from 'element-plus'
import elementPlusVars from 'element-plus/theme-chalk/el-var.css?raw'
import { MessageType } from '@/background'
import { useCatchMoveMouse } from '@/hooks/useCatchMouseMove'
import { useDraggableRail } from '@/hooks/useDraggableRail'
import { BarrageMode, Platform, resolveManualAddFromDocument } from '@/service'
import { contentInjectionKey } from '@/symbol'
import {
  BASE_BARRAGE_SPEED,
  DEFAULT_BARRAGE_SETTINGS,
  estimateBarrageWidth,
  filterBarragesForDisplay,
  getBarrageLineHeight,
  normalizeBarrageSettings,
} from '@/utils/barrage-settings'
import EpisodeList from './episode-list.vue'
import VideoList from './video-list.ce.vue'

const videos = ref<Video[]>([])
const activeMenu = ref(Platform.TENCENT)
const emojiMap = ref(new Map<Video['id'], EmojiInfo[]>())
const episodesMap = ref(new Map<number, Episode[]>())
const selectedVideoId = ref<Video['id']>() // 此为插件内保存的视频id
const selectedVId = ref<string>('') // 此为视频平台的的视频id
const selectedEpisode = ref<Episode | null>(null)
const barragesMap = ref(new Map<string, Barrage[]>())

const videoMap = computed(() => {
  return new Map(videos.value.map(v => [v.id, v]))
})

const videoGroup = computed(() => {
  return videos.value.reduce((acc, v) => {
    const key = v.platform

    if (!acc[key]) {
      acc[key] = []
    }

    acc[key].push(v)
    return acc
  }, {} as Record<Platform, Video[]>)
})

const currentEmojiMap = computed(() => {
  const emojis = emojiMap.value.get(selectedVideoId.value) ?? []

  return new Map(emojis.map(e => [e.code, e.url]))
})

function getVideos() {
  return new Promise<Video[]>((resolve) => {
    chrome.runtime.sendMessage({ type: MessageType.GET_VIDEOS }, (response) => {
      if (chrome.runtime.lastError || !response?.data) {
        resolve(videos.value)
        return
      }

      videos.value = response.data
      const platforms = Object.keys(videoGroup.value)
      if (platforms.length && !platforms.includes(String(activeMenu.value)))
        activeMenu.value = Number.parseInt(platforms[0])

      resolve(videos.value)
    })
  })
}

function upsertVideo(video: Video) {
  const idx = videos.value.findIndex(v => v.id === video.id)
  if (idx >= 0)
    videos.value.splice(idx, 1, video)
  else
    videos.value = [...videos.value, video]

  activeMenu.value = video.platform
}

getVideos()

/* ==================== 弹幕容器 ==================== */
let danmaku: Danmaku | null = null
let specialDanmaku: Danmaku | null = null

const dialog = ref<HTMLElement>()
const scrollBarrageEl = ref<HTMLElement>()
const specialBarrageEl = ref<HTMLElement>()
const initialized = ref(false)
const isCustomPlay = ref(false) // 播放模式，自动/自定义
const isEpisodeOrderDesc = ref(false) // 剧集列表排序，正序/倒序
const barrageSettings = reactive({ ...DEFAULT_BARRAGE_SETTINGS })

const currentPlatform = computed(() => {
  if (typeof selectedVideoId.value === 'number')
    return videoMap.value.get(selectedVideoId.value)?.platform ?? activeMenu.value

  return activeMenu.value
})

const currentPlatformName = computed(() => {
  const names: Record<Platform, string> = {
    [Platform.BILIBILI]: '哔哩哔哩',
    [Platform.TENCENT]: '腾讯视频',
    [Platform.IQIYI]: '爱奇艺',
  }

  return names[currentPlatform.value]
})

// 多出的 1px 用于规避 danmaku 轨道取模时损失最末一行。
const barrageContainerStyle = computed(() => ({
  height: `calc(${barrageSettings.displayArea}vh + 1px)`,
}))

const barrageLineHeight = computed(() => getBarrageLineHeight(barrageSettings.fontSize))

const displayAreaOptions = [
  { label: '1/4', value: 25 },
  { label: '1/2', value: 50 },
  { label: '3/4', value: 75 },
  { label: '全屏', value: 100 },
]

const densityLevel = computed(() => {
  if (barrageSettings.density <= 30)
    return '稀疏'
  if (barrageSettings.density <= 50)
    return '较少'
  if (barrageSettings.density <= 70)
    return '标准'
  if (barrageSettings.density <= 90)
    return '较多'
  return '密集'
})

/* ==================== 伪造媒体的事件表 ==================== */
/**
 * Danmaku 库是事件驱动的（构造时绑定 play/playing/pause/waiting/seeking），
 * 把 addEventListener 实现成空函数等于废掉库的全部能力。
 * 这里手写事件表补上：暂停 = 库自己停掉 RAF、弹幕冻在原地；seek = 库自己重算游标。
 *
 * 不能用 class extends EventTarget —— reactive() 的 Proxy 会破坏 EventTarget 的内部槽，
 * dispatchEvent 会抛 Illegal invocation。下面这些方法不依赖 this，可以安全放进 reactive 对象。
 */
type MediaEventType = 'play' | 'pause' | 'seeking'
type MediaEventHandler = () => void

const mediaListeners = new Map<MediaEventType, Set<MediaEventHandler>>()

function addMediaListener(type: MediaEventType, handler: MediaEventHandler) {
  let set = mediaListeners.get(type)

  if (!set) {
    set = new Set()
    mediaListeners.set(type, set)
  }

  set.add(handler)
}

function removeMediaListener(type: MediaEventType, handler: MediaEventHandler) {
  mediaListeners.get(type)?.delete(handler)
}

/** 只派发 play / pause / seeking —— 库绑的 playing / waiting 是缓冲语义，伪造媒体没有缓冲 */
function emitMediaEvent(type: MediaEventType) {
  const set = mediaListeners.get(type)

  if (!set?.size)
    return

  // 快照后再遍历：handler 内部可能触发 destroy → unbindEvents 修改同一个 Set
  for (const handler of [...set])
    handler()
}

/** 防御：构造中途抛异常会留下孤儿 handler */
function clearMediaListeners() {
  mediaListeners.clear()
}

// 自定义播放模式变量
const fakeMedia = reactive({
  currentTime: 0, // s，单位是秒，与播放时钟一致
  paused: true, // 关键：构造库实例时据此决定是否自动开播，true 表示停在原地
  playbackRate: 1,
  addEventListener: addMediaListener,
  removeEventListener: removeMediaListener,
})

/* ==================== 播放时钟 ==================== */
let rafId: number | null = null
let lastFrameWall = 0 // performance 时间基准(ms)，0 = 未播种
let resumeAfterSeek = false
let loadedVId = '' // 当前弹幕实例装载的是哪个剧集
const MAX_FRAME_DELTA = 0.25 // s，单帧最大推进量（兜底）
const STEP_SECONDS = 10

const isPlaying = ref(false) // 用户意图，唯一的播放态来源
const isSeeking = ref(false) // 是否正在拖动进度条
const loopEnabled = ref(false) // 循环播放，仅会话内有效
const playLoading = ref(false) // 弹幕请求中

// 全模块唯一的时长来源，单位统一为秒（Episode.duration 是毫秒）
const totalDuration = computed(() => {
  const ms = selectedEpisode.value?.duration ?? 0

  return ms > 0 ? Math.max(1, Math.round(ms / 1000)) : 0
})

const canControl = computed(() => isCustomPlay.value && totalDuration.value > 0)

const displayMinute = computed(() => Math.floor(fakeMedia.currentTime / 60))
const displaySecond = computed(() => Math.floor(fakeMedia.currentTime % 60))

/** 秒 → mm:ss */
function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds || 0))

  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// 播放模式选项变化监听
chrome.storage.local.get([
  'isCustomPlay',
  'barrageSettings',
  'episodeOrderDesc',
  'floatBubblePosition',
]).then((result) => {
  if (result.isCustomPlay !== undefined)
    isCustomPlay.value = result.isCustomPlay

  isEpisodeOrderDesc.value = result.episodeOrderDesc === true

  // 悬浮条停靠位置。必须在这里读：下面的 initialized 才是悬浮条的挂载开关，
  // 晚读会让它先画在默认位置再动画飞过去。
  restoreBubblePosition(result.floatBubblePosition)

  Object.assign(barrageSettings, normalizeBarrageSettings(result.barrageSettings))
  initialized.value = true
})
chrome.runtime.onMessage.addListener((request) => {
  if (request.type === 'popup' && 'isCustomPlay' in request) {
    setCustomPlay(request.isCustomPlay)
  }
})

// 全屏处理
const isFullscreen = ref(false)
const { start, close, isMoving } = useCatchMoveMouse()

let lastFullscreenEl: Element | null = null

document.addEventListener('fullscreenchange', () => {
  let root: HTMLElement | null | undefined

  if (lastFullscreenEl && lastFullscreenEl.tagName === 'IFRAME') {
    const iframeDoc = (lastFullscreenEl as HTMLIFrameElement).contentDocument
    root = iframeDoc?.body.querySelector('#crx-root')
  }
  else {
    root = document.querySelector('#crx-root') as HTMLElement
  }

  if (!dialog.value || !root)
    return

  const fullscreenElement = document.fullscreenElement

  if (fullscreenElement) {
    if (fullscreenElement.tagName === 'IFRAME') {
      const iframeDoc = (fullscreenElement as HTMLIFrameElement).contentDocument

      if (!iframeDoc) {
        return
      }

      // 插入element-plus样式
      const iframeStyle = iframeDoc.createElement('style')
      iframeStyle.textContent = elementPlusVars
      iframeDoc.head.appendChild(iframeStyle)

      // 插入插件元素
      iframeDoc?.body.append(root)
      const video = iframeDoc.querySelector('video')
      video && start(video)
    }
    else {
      fullscreenElement.appendChild(root)
      start(fullscreenElement)
    }

    isFullscreen.value = true
    lastFullscreenEl = fullscreenElement
  }
  else {
    isFullscreen.value = false
    document.body.appendChild(root)
    lastFullscreenEl = null
    close()
  }

  dialog.value.hidePopover()
  dialog.value.showPopover()
  requestAnimationFrame(() => {
    rebuildDanmakuForSettings()
    // 悬浮条刚被搬进/搬出 iframe，视口尺寸要等一次重排后才准
    refreshPanelAbove()
  })
})

// 修复全屏下弹幕 canvas 被视频覆盖：鼠标恢复移动时强制 resize 刷新合成层
watch(isMoving, (moving) => {
  if (moving && isFullscreen.value) {
    danmaku?.resize()
    specialDanmaku?.resize()
  }
})

const barrageFilterGroup = computed(() => {
  const stageWidth = scrollBarrageEl.value?.clientWidth || window.innerWidth + 150
  const stageHeight = scrollBarrageEl.value?.clientHeight
    || window.innerHeight * barrageSettings.displayArea / 100 + 1

  return filterBarragesForDisplay(
    barragesMap.value.get(selectedVId.value),
    currentPlatform.value,
    barrageSettings,
    stageWidth,
    stageHeight,
  )
})

// 滚动弹幕
const scrollComments = computed(() => {
  return barrageFilterGroup.value[0].map(item => ({
    time: Number(item.offset) / 1000,
    render: () => {
      const { content } = item
      const itemEl = document.createElement('div')
      const contentEl = document.createElement('div')

      contentEl.innerHTML = content.replace(/\[.*?\]/g, (match) => {
        if (!match)
          return ''

        const emoji = currentEmojiMap.value.get(match)

        return emoji
          ? `<img src="${emoji}" style="width: 1.2em; height: 1.2em; vertical-align: middle; margin-left: 5px" />`
          : match
      })

      // 外层仅向 danmaku 提供宽度，保持 0 高度，纵向轨道由内部元素控制。
      itemEl.style.position = 'relative'
      itemEl.style.width = `${estimateBarrageWidth(content, barrageSettings.fontSize)}px`
      itemEl.style.height = '0'
      itemEl.style.overflow = 'visible'

      contentEl.style.position = 'absolute'
      contentEl.style.top = `${item.lane * barrageLineHeight.value}px`
      contentEl.style.left = '0'
      contentEl.style.display = 'flex'
      contentEl.style.alignItems = 'center'
      contentEl.style.width = 'max-content'
      contentEl.style.height = `${barrageLineHeight.value}px`
      contentEl.style.lineHeight = `${barrageLineHeight.value}px`
      contentEl.style.fontSize = `${barrageSettings.fontSize}px`
      contentEl.style.color = '#fff'
      contentEl.style.opacity = '0.85'
      contentEl.style.textShadow = '-1px -1px rgba(0, 0, 0, 85%), 1px -1px rgba(0, 0, 0, 85%), -1px 1px rgba(0, 0, 0, 85%), 1px 1px rgba(0, 0, 0, 85%)'
      itemEl.appendChild(contentEl)
      return itemEl
    },
  }))
})

// 特殊弹幕
const specialComments = computed(() => {
  return barrageFilterGroup.value[1].map((item) => {
    const mode = item.mode === BarrageMode.TOP ? 'top' : 'bottom'

    return {
      mode,
      time: Number(item.offset) / 1000,
      render: () => {
        const { content } = item
        const itemEl = document.createElement('div')

        itemEl.innerHTML = content.replace(/\[.*?\]/g, (match) => {
          if (!match)
            return ''

          const emoji = currentEmojiMap.value.get(match)

          return emoji
            ? `<img src="${emoji}" style="width: 1.2em; height: 1.2em; vertical-align: middle; margin-left: 5px" />`
            : match
        })

        itemEl.style.display = 'flex'
        itemEl.style.alignItems = 'center'
        itemEl.style.fontSize = `${barrageSettings.fontSize}px`
        itemEl.style.lineHeight = `${barrageLineHeight.value}px`
        itemEl.style.color = 'orange'
        itemEl.style.opacity = '0.85'
        itemEl.style.textShadow = '-1px -1px rgba(0, 0, 0, 85%), 1px -1px rgba(0, 0, 0, 85%), -1px 1px rgba(0, 0, 0, 85%), 1px 1px rgba(0, 0, 0, 85%)'
        return itemEl
      },
    }
  })
})

function initDanmaku() {
  if (!scrollBarrageEl.value || !specialBarrageEl.value || danmaku)
    return

  let media: HTMLMediaElement | undefined | null

  if (!isCustomPlay.value) {
    media = document.querySelector('video')

    // 如果页面中未存在video元素，再从iframe中找
    if (!media) {
      const iframes = document.querySelectorAll('iframe')

      for (const iframe of iframes) {
        media = iframe?.contentDocument?.body.querySelector('video')

        if (media) {
          break
        }
      }
    }

    if (!media) {
      ElNotification({
        title: '自动播放模式失效',
        message: '未能识别页面中的视频播放器，已暂时切换至自定义播放模式。',
        duration: 5000,
        appendTo: dialog.value,
      })
    }
  }

  if (!media) {
    media = fakeMedia as unknown as HTMLMediaElement
    // 直接赋值而非 setCustomPlay：后者会递归调用 enterCustomPlay
    isCustomPlay.value = true
  }

  // 清掉上次构造失败可能残留的 handler
  clearMediaListeners()
  // 唯一写点，必须在构造之前：库据 media.paused 决定是否自动 seek + 开播
  fakeMedia.paused = !isPlaying.value

  danmaku = new Danmaku({
    media,
    container: scrollBarrageEl.value,
    speed: BASE_BARRAGE_SPEED * barrageSettings.speed,
    comments: scrollComments.value,
  })

  specialDanmaku = new Danmaku({
    container: specialBarrageEl.value,
    media,
    speed: 500,
    comments: specialComments.value,
  })

  loadedVId = selectedVId.value
  dialog.value?.showPopover()
  danmaku.resize()
}

/** 只销毁实例，不动时间、不动播放态 —— 供 rebuild 使用 */
function destroyInstances() {
  danmaku?.destroy()
  danmaku = null
  specialDanmaku?.destroy()
  specialDanmaku = null
  loadedVId = ''
}

/** 完全停止：停表 + 暂停态 + 销毁实例 + 可选复位时间 */
function destroyDanmaku(resetTime = true) {
  stopTimeDriver()
  isPlaying.value = false
  destroyInstances()

  if (resetTime)
    fakeMedia.currentTime = 0
}

/* ==================== 播放时钟 ==================== */

function timeDriverTick(wall: number) {
  rafId = requestAnimationFrame(timeDriverTick)

  // 播种帧（首帧 / 后台切回后的第一帧）：只记基准，不推进时间
  if (lastFrameWall === 0) {
    lastFrameWall = wall
    return
  }

  let delta = (wall - lastFrameWall) / 1000
  lastFrameWall = wall

  if (delta <= 0 || !isPlaying.value || isSeeking.value)
    return

  // 兜底：长 GC / 宿主页面卡顿 / 断点调试后回来，绝不允许时间跳变
  if (delta > MAX_FRAME_DELTA)
    delta = MAX_FRAME_DELTA

  advanceTime(fakeMedia.currentTime + delta)
}

function startTimeDriver() {
  if (rafId !== null)
    return

  lastFrameWall = 0 // 重新播种：暂停期间的墙钟时间完全不计入
  rafId = requestAnimationFrame(timeDriverTick)
}

function stopTimeDriver() {
  if (rafId === null)
    return

  cancelAnimationFrame(rafId)
  rafId = null
  lastFrameWall = 0
}

/** 推进到指定秒，负责结尾判定 */
function advanceTime(next: number) {
  const total = totalDuration.value

  if (total <= 0)
    return

  if (next >= total) {
    if (loopEnabled.value) {
      applySeek(0) // 回 0 重播，播放态不变
      return
    }

    applySeek(total) // 停在结尾
    applyPlayState(false) // 到结尾自动暂停
    return
  }

  fakeMedia.currentTime = next
}

/** 一切定位的唯一入口：钳制 + 写 currentTime + 通知库重排 */
function applySeek(seconds: number) {
  const total = totalDuration.value

  fakeMedia.currentTime = total > 0
    ? Math.min(total, Math.max(0, seconds))
    : Math.max(0, seconds)
  emitMediaEvent('seeking')
}

/** 只同步库实例的播放状态（拖动期间临时用），不动 isPlaying、不动时钟 */
function setLibraryPaused(paused: boolean) {
  emitMediaEvent(paused ? 'pause' : 'play')
}

/** 完整播放态：用户意图 + 时钟 + 库 */
function applyPlayState(playing: boolean) {
  if (playing && !canControl.value)
    return

  isPlaying.value = playing
  setLibraryPaused(!playing)

  if (playing)
    startTimeDriver()
  else
    stopTimeDriver()
}

/** 后台期间时间不该推进，切回可见时丢弃隐藏期间的墙钟差 */
function handleVisibilityChange() {
  if (document.hidden)
    return

  lastFrameWall = 0
}

/**
 * 重建实例但保留时间与播放态。
 * 库构造函数会依据 fakeMedia.paused 自行 seek 到当前 currentTime 并续播，无需手工记账。
 */
function rebuildDanmakuForSettings() {
  if (!danmaku)
    return

  destroyInstances()
  initDanmaku()
}

/**
 * 非自定义播放模式下弹幕准备
 */
function handleReadyPlay() {
  stopTimeDriver()
  isPlaying.value = false

  if (isCustomPlay.value)
    fakeMedia.currentTime = 0 // 自定义模式：加载/切集后停在 0:00

  destroyInstances()
  initDanmaku()
}

/* ==================== 自定义播放控制 ==================== */

function hasLoadedCurrent() {
  return danmaku !== null && selectedVId.value !== '' && loadedVId === selectedVId.value
}

function handlePlayToggle() {
  if (isPlaying.value) {
    applyPlayState(false)
    return
  }

  if (!canControl.value)
    return

  // 停在结尾时按播放：从头开始
  if (fakeMedia.currentTime >= totalDuration.value)
    applySeek(0)

  if (!hasLoadedCurrent()) {
    void prepareBarrages().then(() => applyPlayState(true))
    return
  }

  applyPlayState(true)
}

function stepTime(delta: number) {
  if (totalDuration.value <= 0)
    return

  const next = fakeMedia.currentTime + delta

  if (next >= totalDuration.value)
    advanceTime(next) // 复用结尾逻辑
  else
    applySeek(next)
}

function handleReset() {
  destroyDanmaku() // 停表 + 暂停 + 归零
  initDanmaku() // 用 barragesMap 缓存重建，停在 0:00 暂停
}

function handleSliderInput(value: number | number[]) {
  if (!isSeeking.value) {
    isSeeking.value = true
    resumeAfterSeek = isPlaying.value

    // 拖动期间临时停库，否则每帧 seek 清屏后库的 RAF 又冒出新弹幕 → 闪烁
    if (resumeAfterSeek)
      setLibraryPaused(true)
  }

  applySeek(Number(value))
}

function handleSliderChange(value: number | number[]) {
  applySeek(Number(value))
  isSeeking.value = false

  if (resumeAfterSeek)
    setLibraryPaused(false)

  resumeAfterSeek = false
}

function handleMinuteChange(val?: number) {
  applySeek((val ?? 0) * 60 + displaySecond.value)
}

function handleSecondChange(val?: number) {
  applySeek(displayMinute.value * 60 + (val ?? 0))
}

/* ==================== 弹幕加载 ==================== */

/**
 * 拉取（或命中 barragesMap 缓存）当前剧集的弹幕，写入 barragesMap / selectedVId。
 * 不创建实例、不改变播放状态、不触碰 currentTime。
 * @returns 是否拿到了可用于渲染的数据
 */
function loadEpisodeBarrages(): Promise<boolean> {
  const episode = selectedEpisode.value
  const videoId = selectedVideoId.value
  const video = videoId != null ? videoMap.value.get(videoId) : undefined

  if (!episode || !video)
    return Promise.resolve(false)

  const { vid, duration } = episode // duration 是毫秒，fetcher 按毫秒分段

  if (barragesMap.value.has(vid)) {
    selectedVId.value = vid
    return Promise.resolve(true)
  }

  playLoading.value = true

  return new Promise<boolean>((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: MessageType.GET_BARRAGES,
        params: { vid, duration, platform: video.platform, filter: true },
      },
      (response) => {
        barragesMap.value.set(vid, response?.data ?? [])
        selectedVId.value = vid
        playLoading.value = false
        resolve(true)
      },
    )
  })
}

/** 确保当前剧集的实例就绪。停在当前 currentTime，不改变播放态。 */
async function prepareBarrages() {
  if (!await loadEpisodeBarrages())
    return

  destroyInstances()
  initDanmaku()
}

/* ==================== 播放模式 ==================== */

/** popup 与悬浮球的统一入口（含持久化） */
function setCustomPlay(custom: boolean) {
  if (isCustomPlay.value === custom)
    return

  isCustomPlay.value = custom
  chrome.storage.local.set({ isCustomPlay: custom })

  if (custom)
    enterCustomPlay()
  else
    enterAutoPlay()
}

/** 切到自定义：停在 0:00 暂停，自动加载当前剧集弹幕 */
function enterCustomPlay() {
  stopTimeDriver()
  isPlaying.value = false
  fakeMedia.currentTime = 0
  destroyInstances()
  void prepareBarrages() // 命中 barragesMap 缓存时不发请求
}

/** 切回自动：交还给页面 <video>（找不到会再次自动降级回自定义） */
function enterAutoPlay() {
  stopTimeDriver()
  isPlaying.value = false
  fakeMedia.currentTime = 0
  destroyInstances()
  initDanmaku()
}

/* ==================== 选项面板 ==================== */
const prefix = 'crx-content'
const isHoverBubble = ref(false)
const showPopup = ref(false)
const showSettings = ref(false)
let bubbleTimeout: ReturnType<typeof setTimeout> | null = null

function closePopup() {
  showPopup.value = false
}

function togglePlaylistPanel() {
  showPopup.value = !showPopup.value
  if (showPopup.value) {
    showSettings.value = false
    refreshPanelAbove()
  }
}

function toggleSettingsPanel() {
  showSettings.value = !showSettings.value
  if (showSettings.value) {
    showPopup.value = false
    refreshPanelAbove()
  }
}

/* ==================== 悬浮条拖拽 ==================== */
const PANEL_OFFSET = 51 // 面板与悬浮条的间距，与 content.ce.scss 里的 top: 51px 对齐
const PANEL_HEIGHT = 500 // 播放列表固定 500px，设置面板内容撑开约 480px，取大者判定
const PANEL_MARGIN = 8

const railEl = ref<HTMLElement | null>(null)
const bubbleSide = ref<'left' | 'right'>('right')
const bubbleTop = ref<number | null>(null) // px；null 表示沿用 CSS 里的默认 18%
const panelAbove = ref(false)

const {
  isDragging: isDraggingBubble,
  dragPos,
  onPointerDown: handleRailPointerDown,
  onClickCapture: handleRailClickCapture,
  stop: stopRailDrag,
} = useDraggableRail({
  rail: railEl,
  // 面板挂在悬浮条底下，在面板里按下是滚列表/拖滑块，不能当成拖拽
  ignore: `.${prefix}-popup, .${prefix}-settings`,
  // 松手吸附：横向取左/右较近的一侧，纵向保留拖放高度
  onDrop: ({ x, y }) => {
    const railWidth = railEl.value?.offsetWidth ?? 130
    const viewWidth = railEl.value?.ownerDocument.documentElement.clientWidth
      ?? window.innerWidth

    bubbleSide.value = x + railWidth / 2 < viewWidth / 2 ? 'left' : 'right'
    bubbleTop.value = y
    chrome.storage.local.set({ floatBubblePosition: { side: bubbleSide.value, top: y } })
    refreshPanelAbove()
  },
})

const railStyle = computed(() => {
  if (isDraggingBubble.value)
    return { left: `${dragPos.x}px`, top: `${dragPos.y}px` }

  return bubbleTop.value === null ? {} : { '--crx-rail-top': `${bubbleTop.value}px` }
})

/** 停靠方向决定面板朝哪边展开，也决定它从哪一侧飞入 */
const panelTransition = computed(() =>
  bubbleSide.value === 'left' ? 'move-in-left' : 'move-in-right',
)

/** 恢复上次的停靠位置，数据来自 chrome.storage.local，校验一次形状 */
function restoreBubblePosition(value?: { side?: unknown, top?: unknown } | null) {
  if (value?.side !== 'left' && value?.side !== 'right')
    return

  if (typeof value.top !== 'number' || !Number.isFinite(value.top))
    return

  bubbleSide.value = value.side
  bubbleTop.value = value.top
}

/** 悬浮条偏低时把面板翻到上方，否则 500px 高的播放列表会掉出视口底部 */
function refreshPanelAbove() {
  const rail = railEl.value
  if (!rail)
    return

  const { clientHeight } = rail.ownerDocument.documentElement
  const bottom = rail.getBoundingClientRect().bottom

  panelAbove.value = bottom + PANEL_OFFSET + PANEL_HEIGHT + PANEL_MARGIN > clientHeight
}

function handleBarrageSettingChange() {
  const normalized = normalizeBarrageSettings(barrageSettings)
  Object.assign(barrageSettings, normalized)
  chrome.storage.local.set({ barrageSettings: { ...normalized } })
  nextTick(rebuildDanmakuForSettings)
}

function resetBarrageSettings() {
  Object.assign(barrageSettings, DEFAULT_BARRAGE_SETTINGS)
  handleBarrageSettingChange()
}

function togglePlayMode() {
  setCustomPlay(!isCustomPlay.value)
}

function handleBubbleMouseenter() {
  if (isDraggingBubble.value)
    return

  bubbleTimeout = setTimeout(() => {
    isHoverBubble.value = true
    bubbleTimeout = null
  }, 300)
}

function handleBubbleMouseleave() {
  if (bubbleTimeout) {
    clearTimeout(bubbleTimeout)
    bubbleTimeout = null
  }

  isHoverBubble.value = false
}

// 按下时可能还挂着进入气泡时排的 300ms 计时器，拖拽一开始就把它清掉
watch(isDraggingBubble, (dragging) => {
  if (dragging)
    handleBubbleMouseleave()
})

let viewportResizeTimer: number | null = null

function handleViewportResize() {
  if (viewportResizeTimer !== null)
    clearTimeout(viewportResizeTimer)

  viewportResizeTimer = window.setTimeout(() => {
    viewportResizeTimer = null
    rebuildDanmakuForSettings()
    refreshPanelAbove()
  }, 150)
}

/* ==================== 添加视频 ==================== */
const showAddPanel = ref(false)
const formData = reactive({
  name: '',
  params: {} as Record<string, any>,
  platform: Platform.BILIBILI,
})

function saveVideo() {
  chrome.runtime.sendMessage({
    type: MessageType.CREATE_VIDEO,
    data: {
      name: formData.name,
      platform: formData.platform,
      params: formData.params,
    },
  }, (response) => {
    const appendTo = dialog.value

    if (response.data) {
      upsertVideo(response.data)
      chrome.runtime.sendMessage({
        type: MessageType.SYNC_CONTENT_DATA,
        video: response.data,
      })

      ElMessage({
        type: 'success',
        message: '添加成功!',
        appendTo,
      })
    }
    else {
      ElMessage({
        type: 'error',
        message: '添加失败！',
        appendTo,
      })
    }

    showAddPanel.value = false
  })
}

/**
 * popup 点「添加当前页面」时走到这里：参数解析必须发生在页面里（爱奇艺要读 DOM），
 * 解析成功才弹确认框，失败则把原因回给 popup 显示。解析是同步的，不需要 return true。
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== MessageType.OPEN_ADD_PANEL)
    return

  const result = resolveManualAddFromDocument()

  if (!result.ok) {
    sendResponse({ status: 0, message: result.message })
    return
  }

  formData.name = result.data.name
  formData.platform = result.data.platform
  formData.params = result.data.params
  showAddPanel.value = true

  sendResponse({ status: 1 })
})

// 同步数据（popup 添加后会带上 video，优先本地插入，避免只刷新看不到）
chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== MessageType.SYNC_CONTENT_DATA)
    return

  if (message.video?.id != null)
    upsertVideo(message.video as Video)
  else
    getVideos()
})

// 返回视频列表：自定义模式下清理播放态与残留的剧集信息
watch(selectedVideoId, (id) => {
  if (id !== undefined || !isCustomPlay.value)
    return

  stopTimeDriver()
  isPlaying.value = false
  destroyInstances()
  fakeMedia.currentTime = 0
  selectedEpisode.value = null
  selectedVId.value = ''
})

onMounted(() => {
  window.addEventListener('resize', handleViewportResize)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  dialog.value?.showPopover()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleViewportResize)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  stopRailDrag()
  stopTimeDriver()
  destroyInstances()
  if (viewportResizeTimer !== null)
    clearTimeout(viewportResizeTimer)
})

provide(contentInjectionKey, {
  barragesMap,
  videos,
  selectedVId,
  selectedVideoId,
  episodesMap,
  videoGroup,
  videoMap,
  selectedEpisode,
  isCustomPlay,
  isEpisodeOrderDesc,
  emojiMap,
  dialogEl: dialog,
})
</script>

<template>
  <div
    ref="dialog"
    class="dialog-wrapper"
    part="wrapper"
    popover="manual"
  >
    <Transition :name="panelTransition" mode="out-in">
      <div
        v-if="initialized"
        ref="railEl"
        :class="[
          prefix,
          {
            'active': showPopup || showSettings,
            'is-left': bubbleSide === 'left',
            'is-right': bubbleSide === 'right',
            'is-dragging': isDraggingBubble,
            'is-panel-above': panelAbove,
            // 拖拽中必须排除：preventDefault 抑制了 compatibility mouse events，
            // 全屏下 isMoving 会因为收不到 mousemove 而在 3s 后衰减，悬浮条会当场消失
            'idle-fullscreen': !isMoving && isFullscreen && !showPopup && !showSettings
              && !isDraggingBubble,
          },
        ]"
        :style="railStyle"
        @pointerdown="handleRailPointerDown"
        @click.capture="handleRailClickCapture"
      >
        <div
          class="crx-float-bubble"
          :title="`切换弹幕播放模式，当前为${isCustomPlay ? 'Custom' : 'Auto'}`"
          :class="{ custom: isCustomPlay }"
          @click="togglePlayMode"
          @mouseenter="handleBubbleMouseenter"
          @mouseleave="handleBubbleMouseleave"
        >
          <Transition name="zoom-in" mode="out-in">
            <el-icon v-if="isHoverBubble" size="14">
              <Switch />
            </el-icon>
            <template v-else>
              <Transition name="zoom-in" mode="out-in">
                <span v-if="!isCustomPlay">A</span>
                <template v-else>
                  <Transition name="zoom-in" mode="out-in">
                    <span v-if="showPopup">C</span>
                    <span v-else style="transform: scale(0.9)">{{ formatTime(fakeMedia.currentTime) }}</span>
                  </Transition>
                </template>
              </Transition>
            </template>
          </Transition>
        </div>
        <div :class="`${prefix}__controls`">
          <el-icon title="重置弹幕" @click="destroyDanmaku()">
            <Refresh />
          </el-icon>
          <el-icon
            :class="{ active: showSettings }"
            title="弹幕设置"
            @click="toggleSettingsPanel"
          >
            <Setting />
          </el-icon>
          <el-icon
            :class="{ active: showPopup }"
            title="播放列表"
            @click="togglePlaylistPanel"
          >
            <Operation />
          </el-icon>
        </div>
        <Transition :name="panelTransition">
          <div v-if="showPopup" :class="`${prefix}-popup`">
            <div :class="`${prefix}-popup__header`">
              <div :class="`${prefix}-popup__title`">
                <el-icon size="16" style="margin-top: 1px">
                  <Film />
                </el-icon>
                <span>播放列表</span>
              </div>
              <el-icon class="close-icon" @click="closePopup">
                <CloseBold />
              </el-icon>
            </div>
            <div :class="`${prefix}-popup__body`">
              <Transition
                :name="
                  selectedVideoId === undefined ? 'fade-in-left' : 'fade-in-right'
                "
                mode="out-in"
              >
                <VideoList v-if="!selectedVideoId" v-model:active="activeMenu" />
                <EpisodeList
                  v-else
                  @ready-play="handleReadyPlay"
                />
              </Transition>
            </div>
            <div v-if="isCustomPlay" :class="`${prefix}-popup__control`">
              <div :class="`${prefix}-popup__transport`">
                <el-button
                  :class="{ active: loopEnabled }"
                  :disabled="!canControl"
                  :title="`循环播放：${loopEnabled ? '已开启' : '已关闭'}`"
                  size="small"
                  @click="loopEnabled = !loopEnabled"
                >
                  循环
                </el-button>
                <div :class="`${prefix}-popup__transport-main`">
                  <el-button
                    :disabled="!canControl"
                    :title="`快退 ${STEP_SECONDS} 秒`"
                    size="small"
                    @click="stepTime(-STEP_SECONDS)"
                  >
                    <el-icon><RefreshLeft /></el-icon>
                  </el-button>
                  <el-button
                    :class="{ playing: isPlaying }"
                    :disabled="!canControl"
                    :loading="playLoading"
                    :title="isPlaying ? '暂停' : '播放'"
                    type="primary"
                    size="small"
                    @click="handlePlayToggle"
                  >
                    <el-icon v-if="!playLoading">
                      <VideoPause v-if="isPlaying" />
                      <VideoPlay v-else />
                    </el-icon>
                  </el-button>
                  <el-button
                    :disabled="!canControl"
                    :title="`快进 ${STEP_SECONDS} 秒`"
                    size="small"
                    @click="stepTime(STEP_SECONDS)"
                  >
                    <el-icon><RefreshRight /></el-icon>
                  </el-button>
                </div>
                <el-button :disabled="!canControl" size="small" @click="handleReset">
                  重置
                </el-button>
              </div>
              <!-- 拖动过程只发 update:modelValue（el-slider 不发 input），松手才发 change -->
              <el-slider
                :model-value="fakeMedia.currentTime"
                :disabled="!canControl"
                :max="totalDuration || 1"
                :min="0"
                :show-tooltip="false"
                :step="1"
                @change="handleSliderChange"
                @update:model-value="handleSliderInput"
              />
              <div :class="`${prefix}-popup__timer`">
                <el-input-number
                  :controls="false"
                  :disabled="!canControl"
                  :max="Math.floor(totalDuration / 60)"
                  :min="0"
                  :model-value="displayMinute"
                  size="small"
                  @change="handleMinuteChange"
                />
                <span style="margin: 0 5px">:</span>
                <el-input-number
                  :controls="false"
                  :disabled="!canControl"
                  :max="59"
                  :min="0"
                  :model-value="displaySecond"
                  size="small"
                  @change="handleSecondChange"
                />
                <span :class="`${prefix}-popup__duration`">/ {{ formatTime(totalDuration) }}</span>
              </div>
            </div>
            <div v-else />
          </div>
        </Transition>
        <Transition :name="panelTransition">
          <div v-if="showSettings" :class="`${prefix}-settings`">
            <div :class="`${prefix}-settings__header`">
              <div :class="`${prefix}-settings__title`">
                <el-icon size="16">
                  <Setting />
                </el-icon>
                <span>弹幕设置</span>
              </div>
              <el-icon class="close-icon" @click="showSettings = false">
                <CloseBold />
              </el-icon>
            </div>
            <div :class="`${prefix}-settings__body`">
              <div :class="`${prefix}-settings__item`">
                <div :class="`${prefix}-settings__label`">
                  <span>播放速度</span>
                  <strong>{{ barrageSettings.speed.toFixed(1) }}x</strong>
                </div>
                <el-slider
                  v-model="barrageSettings.speed"
                  :min="0.5"
                  :max="2"
                  :step="0.1"
                  :show-tooltip="false"
                  @change="handleBarrageSettingChange"
                />
                <div :class="`${prefix}-settings__scale`">
                  <span>慢</span>
                  <span>快</span>
                </div>
              </div>
              <div :class="`${prefix}-settings__item`">
                <div :class="`${prefix}-settings__label`">
                  <span>字体大小</span>
                  <strong>{{ barrageSettings.fontSize }}px</strong>
                </div>
                <el-slider
                  v-model="barrageSettings.fontSize"
                  :min="12"
                  :max="32"
                  :step="2"
                  :show-tooltip="false"
                  show-stops
                  @change="handleBarrageSettingChange"
                />
                <div :class="`${prefix}-settings__scale`">
                  <span>小</span>
                  <span>大</span>
                </div>
              </div>
              <div :class="`${prefix}-settings__item`">
                <div :class="`${prefix}-settings__label`">
                  <span>显示区域</span>
                  <strong>{{ barrageSettings.displayArea }}%</strong>
                </div>
                <el-segmented
                  v-model="barrageSettings.displayArea"
                  :options="displayAreaOptions"
                  @change="handleBarrageSettingChange"
                />
              </div>
              <div :class="`${prefix}-settings__item`">
                <div :class="`${prefix}-settings__label`">
                  <span>弹幕密度</span>
                  <strong>{{ densityLevel }} · {{ barrageSettings.density }}%</strong>
                </div>
                <el-slider
                  v-model="barrageSettings.density"
                  :min="20"
                  :max="100"
                  :step="10"
                  :show-tooltip="false"
                  show-stops
                  @change="handleBarrageSettingChange"
                />
                <div :class="`${prefix}-settings__scale`">
                  <span>稀疏</span>
                  <span>密集</span>
                </div>
              </div>
              <div :class="`${prefix}-settings__hint`">
                <template v-if="barrageSettings.density >= 100">
                  100% 密度已关闭{{ currentPlatformName }}的平台数量限流，仅保留轨道防重叠。
                </template>
                <template v-else>
                  当前按{{ currentPlatformName }}的数据量、密度和显示区域逐步增加每秒弹幕数量。
                </template>
              </div>
            </div>
            <div :class="`${prefix}-settings__footer`">
              <el-button size="small" @click="resetBarrageSettings">
                恢复默认
              </el-button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
    <div ref="scrollBarrageEl" class="crx-barrage-scroll" :style="barrageContainerStyle" />
    <div ref="specialBarrageEl" class="crx-barrage-custom" />
    <el-dialog
      v-model="showAddPanel"
      title="添加视频"
      width="500"
      align-center
    >
      <div class="add-panel-item">
        <div class="add-panel-item__label">
          视频名称
        </div>
        <el-input v-model="formData.name" />
      </div>
      <template #footer>
        <div>
          <el-button @click="showAddPanel = false">
            取消
          </el-button>
          <el-button type="primary" @click="saveVideo">
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style lang="scss">
@use "../style/content.ce.scss"
</style>
