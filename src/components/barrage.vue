<script setup lang="ts">
import Danmaku from 'danmaku'
import { getAllBarrages } from '@/service'

import type { Barrage } from '@/service'

let danmaku: Danmaku | null = null
let timer: number | null = null

const barrageEl = ref<HTMLElement>()
const barrages = ref<Barrage[]>([])
const visible = ref(false)
const fakeMedia = reactive<HTMLMediaElement>({
  // 伪造 video elements
  currentTime: 0, // s
  addEventListener: () => {},
  removeEventListener: () => {},
  paused: false,
  playbackRate: 1,
  play: () => {}
} as any)

const comments = computed(() => {
  return barrages.value.map(item => ({
    text: item.content,
    time: Number(item.time_offset) / 1000,
    style: {
      fontSize: '14px',
    },
  }))
})

getBarrage()

async function getBarrage() {
  barrages.value = await getAllBarrages()
}

function playDanmaku() {
  fakeMedia.currentTime += 1

  if (!timer) {
    timer = setInterval(() => {
      fakeMedia.currentTime += 1
    }, 1000)
  }
}

function stopDanmaku() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function initDanmaku() {
  if (!barrageEl.value || danmaku) return

  danmaku = new Danmaku({
    container: barrageEl.value!,
    media: fakeMedia,
    comments: comments.value,
    speed: 100
  })
}

chrome.runtime.onMessage.addListener(message => {
  switch (message.type) {
    case 'play': {
      initDanmaku()
      playDanmaku()
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
      stopDanmaku()
      fakeMedia.currentTime = 0
      danmaku?.destroy()
      danmaku = null
      break
    }
    case 'getTime': {
      stopDanmaku()
      fakeMedia.currentTime = message.time
      playDanmaku()
      break
    }
    case 'visible': {
      visible.value = message.display ?? false
    }
  }
})
</script>

<template>
  <div id="crx-barrage">
    <div v-show="!visible" ref="barrageEl" id="crx-barrage__content"></div>
  </div>
</template>

<style lang="scss">
#crx-barrage {
  &__content {
    width: 100vw;
    height: 300px;
    line-height: 24px;
  }
}
</style>
