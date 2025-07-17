<script setup lang="ts">
import type { Barrage, Episode, Video } from '@/service'

import {
  CloseBold,
  Plus,
  Refresh,
  Setting,
  Switch,
} from '@element-plus/icons-vue'
import Danmaku from 'danmaku'
import { ElMessage } from 'element-plus'
import { MessageType } from '@/background'
import { useCatchMoveMouse } from '@/hooks/useCatchMouseMove'
import { Platform } from '@/service'
import { contentInjectionKey } from '@/symbol'
import EpisodeList from './episode-list.vue'
import VideoList from './video-list.vue'

const videos = ref<Video[]>([])
const activeMenu = ref(Platform.TENCENT)
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

provide(contentInjectionKey, {
  videos,
  selectedVideoId,
  episodesMap,
  videoGroup,
  videoMap,
  selectedEpisode,
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
let timer: number | null = null

const dialog = ref<HTMLElement>()
const barrageEl = ref<HTMLElement>()
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

// 全屏处理
const isFullscreen = ref(false)
const { start, close, isMoving } = useCatchMoveMouse()

document.addEventListener('fullscreenchange', () => {
  const root = document.querySelector('#crx-root')

  if (!dialog.value || !root)
    return

  if (document.fullscreenElement) {
    isFullscreen.value = true
    document.fullscreenElement.appendChild(root)
    start(document.fullscreenElement)
  }
  else {
    isFullscreen.value = false
    document.body.appendChild(root)
    close()
  }

  dialog.value.hidePopover()
  dialog.value.showPopover()
  danmaku?.resize()
})

const comments = computed(() => {
  const existTimeMap = new Map<number, number>()
  const barrages = barragesMap.value.get(selectedVId.value)

  if (!barrages)
    return []

  const data = [] as Barrage[]

  barrages.forEach((barrage) => {
    const count = existTimeMap.get(barrage.offset)

    if (count && count >= 3)
      return

    existTimeMap.set(barrage.offset, count ? count + 1 : 1)
    data.push(barrage)
  })

  return data.map(item => ({
    text: item.content,
    time: Number(item.offset) / 1000,
    style: {
      fontSize: '16px',
      color: '#fff',
    },
  }))
})

function initDanmaku() {
  if (!barrageEl.value || danmaku)
    return

  danmaku = new Danmaku({
    container: barrageEl.value!,
    media: fakeMedia,
    comments: comments.value,
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

function destroyDanmaku() {
  stopDanmaku()
  danmaku?.destroy()
  danmaku = null
  mediaDuration.value = 0
  fakeMedia.currentTime = 0
}

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

/* ==================== 选项面板 ==================== */
const prefix = 'crx-content'
const playLoading = ref(false)
const showPopup = ref(false)
const time = reactive({
  minute: 0,
  second: 0,
})

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
  (val) => {
    time.minute = Math.floor(val / 60)
    time.second = val % 60
  },
)

function closePopup() {
  showPopup.value = false
}

function formatTooltip(_: number) {
  return `${time.minute} : ${time.second}`
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

      destroyDanmaku()
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
      const pattern = /\/(ep|ss)([^/?]*)[/?]/
      const match = pattern.exec(location.href)

      if (match !== null) {
        const type = match[1]
        const id = match[2]
        const params = type === 'ss' ? { season_id: id } : { ep_id: id }

        formData.platform = Platform.BILIBILI
        formData.params = params
        formData.name = document.title.split(' ')[0].split('_')[0]
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
    const appendTo = document.querySelector('crx-content')?.shadowRoot?.querySelector('.dialog-wrapper') as HTMLElement

    if (response.data) {
      await getVideos()

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

onMounted(() => {
  observer = new MutationObserver(domChange)
  observer.observe(document.body, { childList: true })
  dialog.value?.showPopover()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
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
      <div v-show="isMoving || !isFullscreen || showPopup" :class="`${prefix} ${showPopup ? 'active' : ''}`">
        <div class="crx-float-bubble">
          <span style="transform: scale(0.9)">{{ time.minute }}:{{ time.second }}</span>
        </div>
        <div :class="`${prefix}__controls`">
          <el-icon :class="{ disabled: !currTargetPlatform }" @click="showAddPanel = true">
            <Plus />
          </el-icon>
          <el-icon @click="destroyDanmaku()">
            <Refresh />
          </el-icon>
          <el-icon :class="{ active: showPopup }" @click="showPopup = !showPopup">
            <Switch />
          </el-icon>
        </div>
        <Transition name="move-in-right">
          <div v-show="showPopup" :class="`${prefix}-popup`">
            <div :class="`${prefix}-popup__header`">
              <div :class="`${prefix}-popup__title`">
                <el-icon size="14" style="margin-top: 1px">
                  <Setting />
                </el-icon>
                <span>控制面板</span>
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
                <EpisodeList v-else />
              </Transition>
            </div>
            <div :class="`${prefix}-popup__control`">
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
                  :model-value="fakeMedia.currentTime"
                  :min="0"
                  :max="maxTime.duration"
                  :disabled="!selectedEpisode"
                  :format-tooltip="formatTooltip"
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
          </div>
        </Transition>
      </div>
    </Transition>
    <div ref="barrageEl" class="crx-barrage" />
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
