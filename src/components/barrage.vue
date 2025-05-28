<script setup lang="ts">
import { ref } from 'vue'
import vueDanmaku from 'vue3-danmaku'

const danmus = ref(['danmu1', 'danmu2', 'danmu3'])
const danmakuEl = ref()

chrome.runtime.onMessage.addListener(message => {
  switch (message.type) {
    case 'play': {
      danmakuEl.value?.play()
      break
    }
    case 'stop': {
      danmakuEl.value?.stop()
      break
    }
  }
})
</script>

<template>
  <vueDanmaku
    ref="danmakuEl"
    v-model:danmus="danmus"
    :speeds="100"
    :autoplay="false"
    loop
  ></vueDanmaku>
</template>

<style lang="scss">
.vue-danmaku {
  width: 100vw;
  height: 100px;
}
</style>
