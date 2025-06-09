<script setup lang="ts">
import type { Barrage } from '@/service'

import Danmaku from 'danmaku'
import { storeToRefs } from 'pinia'
import { useContentStore } from '@/store'

let danmaku: Danmaku | null = null
let timer: number | null = null

const prefix = 'crx-barrage'
const dialog = ref<HTMLElement>()
const barrageEl = ref<HTMLElement>()
const selectedVId = ref('')
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

const store = useContentStore()
const { barragesMap } = storeToRefs(store)

const comments = computed(() => {
  const existTimeMap = new Map<number, number>()
  const barrages = barragesMap.value.get(selectedVId.value)

  if (!barrages)
    return []

  const data = [] as Barrage[]

  barrages.forEach((barrage) => {
    const count = existTimeMap.get(barrage.time_offset)

    if (count && count >= 3)
      return

    existTimeMap.set(barrage.time_offset, count ? count + 1 : 1)
    data.push(barrage)
  })

  return data.map(item => ({
    text: item.content,
    time: Number(item.time_offset) / 1000,
    style: {
      fontSize: '16px',
      color: '#fff',
    },
  }))
})

watch(() => fakeMedia.currentTime, (time) => {
  chrome.runtime.sendMessage({ type: 'time', time })
})

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

function destroyDanmaku(resetPlayer = true) {
  stopDanmaku()
  danmaku?.destroy()
  danmaku = null

  if (resetPlayer) {
    mediaDuration.value = 0
    fakeMedia.currentTime = 0
  }
}

chrome.runtime.onMessage.addListener(async (message, _, sendResponse) => {
  switch (message.type) {
    case 'play': {
      const { vid, duration } = message
      const minus = Number(duration) / 60

      if (typeof minus !== 'number')
        return

      await store.getBarrages(vid, Math.ceil(minus))

      selectedVId.value = vid
      mediaDuration.value = duration

      destroyDanmaku(false)
      initDanmaku()
      playDanmaku()
      sendResponse(true)
      break
    }
    case 'stop': {
      stopDanmaku()
      break
    }
    case 'show': {
      danmaku?.show()
      break
    }
    case 'hidden': {
      danmaku?.hide()
      break
    }
    case 'reset': {
      destroyDanmaku()
      break
    }
    case 'changeTime': {
      fakeMedia.currentTime = message.time
      break
    }
  }
})

/* ==================== 全屏处理 ==================== */
document.addEventListener('fullscreenchange', () => {
  if (!dialog.value)
    return

  if (document.fullscreenElement) {
    dialog.value.hidePopover()
    dialog.value.showPopover()
    danmaku?.resize()
  }
})
</script>

<template>
  <div ref="dialog" :class="prefix" popover="manual">
    <div ref="barrageEl" :class="`${prefix}__content`" />
  </div>
</template>

<style lang="scss">
.crx-barrage {
  margin: 0;
  padding: 0;
  border-width: 0;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
  background-color: transparent;

  &__content {
    width: calc(100vw + 150px);
    height: calc(100vh / 4);
    line-height: 30px;
    background-color: transparent;
  }
}
</style>
