<script setup lang="ts">
import type { Barrage, EmojiInfo, Episode, Video } from '@/service'

import {
  CloseBold,
  Film,
  Operation,
  Plus,
  Refresh,
  Switch,
} from '@element-plus/icons-vue'
import Danmaku from 'danmaku'
import { ElMessage, ElNotification } from 'element-plus'
import elementPlusVars from 'element-plus/theme-chalk/el-var.css?raw'
import { MessageType } from '@/background'
import { useCatchMoveMouse } from '@/hooks/useCatchMouseMove'
import { BarrageMode, Platform } from '@/service'
import { contentInjectionKey } from '@/symbol'
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
      videos.value = response.data
      activeMenu.value = Number.parseInt(Object.keys(videoGroup.value)[0])
      resolve(videos.value)
    })
  })
}

getVideos()

/* ==================== 弹幕容器 ==================== */
let danmaku: Danmaku | null = null
let specialDanmaku: Danmaku | null = null
let timer: number | null = null
let lastTime = 0 // 记录上一个时间点，判断进度条方向

const dialog = ref<HTMLElement>()
const scrollBarrageEl = ref<HTMLElement>()
const specialBarrageEl = ref<HTMLElement>()
const initialized = ref(false)
const isCustomPlay = ref(false) // 播放模式，自动/自定义

// 自定义播放模式变量
const mediaDuration = ref(0)
const fakeMedia = reactive<HTMLMediaElement>({
  // 伪造 video elements
  currentTime: 0, // s
  addEventListener: () => {},
  removeEventListener: () => {},
  paused: false,
  playbackRate: 1,
  play: () => {},
} as any)

// 播放模式选项变化监听
chrome.storage.local.get(['isCustomPlay']).then((result) => {
  if (result.isCustomPlay !== undefined) {
    isCustomPlay.value = result.isCustomPlay
  }

  initialized.value = true
})
chrome.runtime.onMessage.addListener((request) => {
  if (request.type === 'popup' && 'isCustomPlay' in request) {
    isCustomPlay.value = request.isCustomPlay
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
  danmaku?.resize()
})

const barrageFilterGroup = computed(() => {
  const group = [[], []] as [Barrage[], Barrage[]]
  const existTimeMap = new Map<number, number>()
  const barrages = barragesMap.value.get(selectedVId.value)?.sort((prev, next) => {
    if (prev.offset !== next.offset) {
      return prev.offset - next.offset
    }

    return next.weight - prev.weight
  })

  if (!barrages) {
    return group
  }

  // 不同平台的过滤策略不一样
  if (activeMenu.value === Platform.BILIBILI) {
    let lastScrollTime = 0
    let lastSpecialTime = 0
    const scrollInterval = 150
    const specialInterval = 500

    barrages.forEach((barrage) => {
      const { offset, weight, content, mode } = barrage

      if (weight < 2 || content.length < 2) {
        return
      }

      if (mode !== BarrageMode.TOP && mode !== BarrageMode.BOTTOM) {
        if (offset - lastScrollTime < scrollInterval) {
          return
        }

        lastScrollTime = offset
        group[0].push(barrage)
      }
      else {
        if (offset - lastSpecialTime < specialInterval) {
          return
        }
        lastSpecialTime = offset
        group[1].push(barrage)
      }
    })
  }
  else {
    barrages.forEach((barrage) => {
      const { offset, weight, content, mode } = barrage
      const count = existTimeMap.get(offset)

      if ((count && count >= 3) || content.length <= 1 || weight < 50) {
        return
      }

      existTimeMap.set(offset, count ? count + 1 : 1)
      if (mode !== BarrageMode.TOP && mode !== BarrageMode.BOTTOM) {
        group[0].push(barrage)
      }
      else {
        group[1].push(barrage)
      }
    })
  }

  return group
})

// 滚动弹幕
const scrollComments = computed(() => {
  return barrageFilterGroup.value[0].map(item => ({
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
      itemEl.style.fontSize = '16px'
      itemEl.style.color = '#fff'
      itemEl.style.opacity = '0.85'
      itemEl.style.textShadow = '-1px -1px rgba(0, 0, 0, 85%), 1px -1px rgba(0, 0, 0, 85%), -1px 1px rgba(0, 0, 0, 85%), 1px 1px rgba(0, 0, 0, 85%)'
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
        itemEl.style.fontSize = '16px'
        itemEl.style.color = 'orange'
        itemEl.style.opacity = '0.85'
        itemEl.style.textShadow = '-1px -1px rgba(0, 0, 0, 85%), 1px -1px rgba(0, 0, 0, 85%), -1px 1px rgba(0, 0, 0, 85%), 1px 1px rgba(0, 0, 0, 85%)'
        return itemEl
      },
    }
  })
})

function initDanmaku() {
  if (!scrollBarrageEl.value || danmaku)
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
    media = fakeMedia
    isCustomPlay.value = true
  }

  danmaku = new Danmaku({
    media,
    container: scrollBarrageEl.value!,
    comments: scrollComments.value,
  })

  specialDanmaku = new Danmaku({
    container: specialBarrageEl.value!,
    media,
    speed: 500,
    comments: specialComments.value,
  })

  dialog.value?.showPopover()
  danmaku.resize()
}

function stopDanmaku() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function destroyDanmaku(resetTime = true) {
  stopDanmaku()
  danmaku?.destroy()
  danmaku = null
  specialDanmaku?.destroy()
  specialDanmaku = null
  mediaDuration.value = 0

  if (resetTime) {
    fakeMedia.currentTime = 0
    lastTime = 0
  }
}

/**
 * 自定义播放模式下播放弹幕
 */
function playDanmaku() {
  fakeMedia.currentTime += 1

  if (!timer) {
    timer = setInterval(() => {
      fakeMedia.currentTime += 1
      if (mediaDuration.value < fakeMedia.currentTime) {
        stopDanmaku()
      }
    }, 1000)
  }
}

/**
 * 非自定义播放模式下弹幕准备
 */
function handleReadyPlay() {
  destroyDanmaku()
  initDanmaku()
}

/* ==================== 选项面板 ==================== */
const prefix = 'crx-content'
const isHoverBubble = ref(false)
const playLoading = ref(false)
const showPopup = ref(false)
const time = reactive({
  minute: 0,
  second: 0,
})

let bubbleTimeout: ReturnType<typeof setTimeout> | null = null

const maxTime = computed(() => {
  const max: Record<string, number | undefined> = {
    minus: undefined,
    second: 59,
    duration: 60 * 60,
  }

  if (!selectedEpisode.value) {
    return max
  }

  const { duration } = selectedEpisode.value
  max.minus = Math.ceil(duration / (60 * 1000))
  max.duration = Math.ceil(duration / 1000)

  return max
})

watch(
  () => fakeMedia.currentTime,
  (val, oldVal) => {
    lastTime = oldVal
    time.minute = Math.floor(val / 60)
    time.second = val % 60
  },
)

function closePopup() {
  showPopup.value = false
}

function togglePlayMode() {
  isCustomPlay.value = !isCustomPlay.value
}

function handleBubbleMouseenter() {
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

function handleSliderChange(value: number | number[]) {
  const val = value as number

  if (val < lastTime) {
    destroyDanmaku(false)
    initDanmaku()
    playDanmaku()
  }
}

function handleMinuteChange(val?: number) {
  time.minute = val ?? 0
  fakeMedia.currentTime = time.minute * 60 + time.second
}

function handleSecondChange(val?: number) {
  time.second = val ?? 0
  fakeMedia.currentTime = time.minute * 60 + time.second
}

function playBarrages() {
  if (!selectedEpisode.value || !selectedVideoId.value) {
    return
  }

  const { vid, duration } = selectedEpisode.value
  const video = videoMap.value.get(selectedVideoId.value)

  if (!video) {
    return
  }

  playLoading.value = true

  chrome.runtime.sendMessage(
    {
      type: MessageType.GET_BARRAGES,
      params: { vid, duration, platform: video.platform, filter: true },
    },
    (response) => {
      selectedVideoId.value = video.id
      selectedVId.value = vid
      barragesMap.value.set(vid, response.data)

      destroyDanmaku(false)
      initDanmaku()
      playDanmaku()

      mediaDuration.value = duration
      playLoading.value = false
    },
  )
}

/* ==================== 添加视频 ==================== */
const platformOptions = [
  { label: 'bilibili', value: Platform.BILIBILI },
  { label: '腾讯视频', value: Platform.TENCENT },
]

let observer: MutationObserver | null = null

const targetPlatform = [
  { url: 'https://www.bilibili.com/bangumi/play/', platform: Platform.BILIBILI },
  { url: 'https://v.qq.com/x/cover/', platform: Platform.TENCENT },
]
const lastUrl = ref(location.href)
const showAddPanel = ref(false)
const formData = reactive({
  name: '',
  params: {} as Record<string, any>,
  platform: Platform.BILIBILI,
})

const currTargetPlatform = computed(() => {
  return targetPlatform.find(item => lastUrl.value.includes(item.url))
})

watch(showAddPanel, async (val) => {
  if (!val || !currTargetPlatform.value) {
    return
  }

  switch (currTargetPlatform.value.platform) {
    case Platform.BILIBILI: {
      const pattern = /\/(ep|ss)([^/?]*)[/?]?/
      const match = pattern.exec(location.href)

      if (match !== null) {
        const type = match[1]
        const id = match[2]
        const params = type === 'ss' ? { season_id: id } : { ep_id: id }

        formData.platform = Platform.BILIBILI
        formData.params = params
        formData.name = document.title.split(' ')[0].split('_')[0]
      }
      else {
        showAddPanel.value = false
        ElMessage({
          type: 'error',
          message: '未能识别出视频资源！',
          appendTo: dialog.value,
        })
      }
      break
    }
    case Platform.TENCENT: {
      const paths = location.href.split('/')
      const cid = paths[paths.length - 2]
      const vid = paths[paths.length - 1].replace('.html', '')

      formData.platform = Platform.TENCENT
      formData.params = { cid, vid }
      formData.name = document.title.split(' ')[0].split('_')[0]
    }
  }
})

function domChange() {
  if (window.location.href !== lastUrl.value) {
    lastUrl.value = window.location.href
  }
}

async function saveVideo() {
  chrome.runtime.sendMessage({
    type: MessageType.CREATE_VIDEO,
    data: formData,
  }, async (response) => {
    const appendTo = dialog.value

    if (response.data) {
      chrome.runtime.sendMessage({ type: MessageType.SYNC_CONTENT_DATA })

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

function prepareAdd() {
  if (!currTargetPlatform.value) {
    return
  }
  showAddPanel.value = true
}

// 同步数据
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === MessageType.SYNC_CONTENT_DATA) {
    getVideos()
  }
})

onMounted(() => {
  observer = new MutationObserver(domChange)
  observer.observe(document.body, { childList: true })
  dialog.value?.showPopover()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
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
  emojiMap,
})
</script>

<template>
  <div
    ref="dialog"
    class="dialog-wrapper"
    part="wrapper"
    popover="manual"
  >
    <Transition name="move-in-right" mode="out-in">
      <div
        v-if="(isMoving || !isFullscreen || showPopup) && initialized"
        :class="`${prefix} ${showPopup ? 'active' : ''}`"
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
                    <span v-else style="transform: scale(0.9)">{{ time.minute }}:{{ time.second }}</span>
                  </Transition>
                </template>
              </Transition>
            </template>
          </Transition>
        </div>
        <div :class="`${prefix}__controls`">
          <el-icon
            :class="{ disabled: !currTargetPlatform }"
            :title="`添加视频${!currTargetPlatform ? '，该网址不可操作' : ''}`"
            @click="prepareAdd"
          >
            <Plus />
          </el-icon>
          <el-icon title="重置弹幕" @click="destroyDanmaku()">
            <Refresh />
          </el-icon>
          <el-icon
            :class="{ active: showPopup }"
            title="播放列表"
            @click="showPopup = !showPopup"
          >
            <Operation />
          </el-icon>
        </div>
        <Transition name="move-in-right">
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
              <div :class="`${prefix}-popup__buttons`">
                <el-button
                  :disabled="!selectedEpisode"
                  :loading="playLoading"
                  type="primary"
                  size="small"
                  @click="playBarrages"
                >
                  播放
                </el-button>
                <el-button type="warning" size="small" @click="destroyDanmaku()">
                  重置
                </el-button>
              </div>
              <div :class="`${prefix}-popup__timer`">
                <el-slider
                  v-model="fakeMedia.currentTime"
                  :show-tooltip="false"
                  :min="0"
                  :max="maxTime.duration"
                  :disabled="!selectedEpisode"
                  @change="handleSliderChange"
                />
                <div style="display: flex">
                  <el-input-number
                    :model-value="time.minute"
                    :controls="false"
                    :max="maxTime.minus"
                    :min="0"
                    :disabled="!selectedEpisode"
                    size="small"
                    @change="handleMinuteChange"
                  />
                  <span style="margin: 0 5px">:</span>
                  <el-input-number
                    :model-value="time.second"
                    :controls="false"
                    :max="maxTime.second"
                    :min="0"
                    :disabled="!selectedEpisode"
                    size="small"
                    @change="handleSecondChange"
                  />
                </div>
              </div>
            </div>
            <div v-else />
          </div>
        </Transition>
      </div>
    </Transition>
    <div ref="scrollBarrageEl" class="crx-barrage-scroll" />
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
      <div class="add-panel-item">
        <div class="add-panel-item__label">
          视频平台
        </div>
        <el-radio-group v-model="formData.platform">
          <el-radio-button
            v-for="item in platformOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-radio-group>
      </div>
      <template #footer>
        <div class="dialog-footer">
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
