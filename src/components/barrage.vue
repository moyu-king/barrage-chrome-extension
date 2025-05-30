<script setup lang="ts">
import Danmaku from 'danmaku'

let danmaku: Danmaku | null = null
let timer: number | null = null

const barrage = ref<HTMLElement>()
const fakeMedia = reactive({ // 伪造 video
  currentTime: 0, // s
  addEventListener: () => {},
  removeEventListener: () => {},
  paused: false,
  playbackRate: 1,
  play: () => {}
})

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
  if (!barrage.value || danmaku) return

  danmaku = new Danmaku({
    container: barrage.value!,
    media: fakeMedia as any,
    comments: [
      { text: '第一', time: 0 },
      { text: 'xxx，我知道你在看', time: 2 },
    ]
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
    }
  }
})
</script>

<template>
  <div ref="barrage" id="crx-barrage"></div>
</template>

<style lang="scss">
#crx-barrage {
  width: 100vw;
  height: 100px
}
</style>
