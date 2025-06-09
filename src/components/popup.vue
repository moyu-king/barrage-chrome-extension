<script setup lang="ts">
import { Setting } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import { usePopupStore } from '@/store'
import { sendMsgToContent } from '@/utils'
import EpisodeList from './episode-list.vue'
import VideoList from './video-list.vue'

const prefix = 'crx-popup'
const playLoading = ref(false)
const popupStore = usePopupStore()
const { selectedVideoId, selectedEpisode, timerTime } = storeToRefs(popupStore)

popupStore.getVideos()

chrome.runtime.onMessage.addListener(async (message, sender) => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (message.type === 'time' && sender.tab?.id === tab?.id) {
      timerTime.value = message.time || 0
    }
  })
})

const time = reactive({
  minute: 0,
  second: 0,
})

const maxTime = computed(() => {
  const max = { minus: 999, second: 59 }

  if (!selectedEpisode.value) {
    return max
  }

  const { duration } = selectedEpisode.value
  max.minus = Math.ceil(Number(duration) / 60)

  return max
})

watch(timerTime, () => {
  time.minute = Math.floor(timerTime.value / 60)
  time.second = timerTime.value % 60
})

function handleMinuteChange(val?: number) {
  time.minute = val ?? 0

  sendMsgToContent({
    type: 'changeTime',
    time: time.minute * 60 + time.second,
  })
}

function handleSecondChange(val?: number) {
  time.second = val ?? 0

  sendMsgToContent({
    type: 'changeTime',
    time: time.minute * 60 + time.second,
  })
}

function playBarrages() {
  if (!selectedEpisode.value)
    return

  const { vid, duration } = selectedEpisode.value
  playLoading.value = true
  sendMsgToContent({
    type: 'play',
    vid,
    duration,
  }, (_) => {
    playLoading.value = false
  })
}
</script>

<template>
  <div :class="prefix">
    <div :class="`${prefix}__header`">
      <div :class="`${prefix}__title`">
        <el-icon size="16">
          <Setting />
        </el-icon>
        <span>控制面板</span>
      </div>
    </div>
    <div :class="`${prefix}__content`">
      <Transition :name=" selectedVideoId === undefined ? 'fade-in-left' : 'fade-in-right'" mode="out-in">
        <VideoList v-if="!selectedVideoId" />
        <EpisodeList v-else />
      </Transition>
    </div>
    <div :class="`${prefix}__control`">
      <div :class="`${prefix}__timer`">
        <el-input-number
          :model-value="time.minute"
          :controls="false"
          :max="maxTime.minus"
          :min="0"
          :disabled="!selectedEpisode"
          @change="handleMinuteChange"
        />
        <span>:</span>
        <el-input-number
          :model-value="time.second"
          :controls="false"
          :max="maxTime.second"
          :min="0"
          :disabled="!selectedEpisode"
          @change="handleSecondChange"
        />
      </div>
      <div :class="`${prefix}__buttons`">
        <el-button
          type="primary"
          :disabled="!selectedEpisode"
          :loading="playLoading"
          @click="playBarrages"
        >
          播放
        </el-button>
        <el-button
          type="warning"
          @click="sendMsgToContent({ type: 'reset' })"
        >
          重置
        </el-button>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
#app {
  width: 380px;
  overflow: hidden;
}

.crx-popup {
  display: flex;
  flex-direction: column;
  gap: 10px;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px;
    border-bottom: 1px solid rgba(0, 0, 0, 15%);
  }

  &__title {
    display: flex;
    align-items: center;
    font-size: 16px;
    font-weight: 700;

    .el-icon {
      margin-right: 5px;
    }
  }

  &__content {
    height: 300px;
    padding-left: 10px;
  }

  &__control {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    border-top: 1px solid rgba(0, 0, 0, 15%);
    padding: 10px;
  }

  &__timer {
    display: flex;
    align-items: center;
    gap: 6px;

    .el-input__wrapper {
      padding: 0 5px !important;
    }

    .el-input-number {
      width: 2.5rem;
    }
  }

  &__buttons {
    display: flex;
    gap: 10px;
  }

  .el-scrollbar {
    padding-right: 10px;
  }

  .el-button {
    margin: 0;
    padding: 10px;
  }
}
</style>
