<script setup lang="ts">
import { Setting } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import { usePopupStore } from '@/store'
import { sendMsgToContent } from '@/utils'
import EpisodeList from './episode-list.vue'
import VideoList from './video-list.vue'

const prefix = 'crx-popup'
const playLoading = ref(false)
const store = usePopupStore()
const { selectedVideoId, selectedEpisode, timerTime, videoMap } = storeToRefs(store)

chrome.runtime.onMessage.addListener(async (message, sender) => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (message.type === 'time' && sender.tab?.id === tab?.id) {
      timerTime.value = message.time || 0
    }
  })
})

store.getVideos().then(() => {
  sendMsgToContent({
    type: 'init',
  }, async (message) => {
    if (!message?.videoId) {
      return
    }

    selectedVideoId.value = message.videoId
    const video = videoMap.value.get(message.videoId)

    if (!video) {
      return
    }

    const episodes = await store.getVideoEpisode(message.videoId)

    if (episodes?.length) {
      const episode = episodes.find(episode => episode.vid === message.vid)

      if (episode) {
        selectedEpisode.value = episode
      }
    }
  })
})

const time = reactive({
  minute: 0,
  second: 0,
})

const maxTime = computed(() => {
  const max: Record<string, number | undefined> = { minus: undefined, second: 59, duration: 60 * 60 }

  if (!selectedEpisode.value) {
    return max
  }

  const { duration } = selectedEpisode.value
  max.minus = Math.ceil(duration / (60 * 1000))
  max.duration = Math.ceil(duration / 1000)

  return max
})

watch(timerTime, () => {
  time.minute = Math.floor(timerTime.value / 60)
  time.second = timerTime.value % 60
})

function formatTooltip(_: number) {
  return `${time.minute} : ${time.second}`
}

function handleTimeChange() {
  sendMsgToContent({
    type: 'changeTime',
    time: timerTime.value,
  })
}

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
  if (!selectedEpisode.value || !selectedVideoId.value) {
    return
  }

  const { vid, duration } = selectedEpisode.value
  const video = videoMap.value.get(selectedVideoId.value)

  if (!video) {
    return
  }

  playLoading.value = true
  console.log(1111)
  sendMsgToContent({
    type: 'play',
    videoId: video.id,
    platform: video.platform,
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
      <div :class="`${prefix}__buttons`">
        <el-button
          :disabled="!selectedEpisode"
          :loading="playLoading"
          type="primary"
          size="small"
          @click="playBarrages"
        >
          播放
        </el-button>
        <el-button
          type="warning"
          size="small"
          @click="sendMsgToContent({ type: 'reset' })"
        >
          重置
        </el-button>
      </div>
      <div :class="`${prefix}__timer`">
        <el-slider
          v-model="timerTime"
          :min="0"
          :max="maxTime.duration"
          :disabled="!selectedEpisode"
          :format-tooltip="formatTooltip"
          @change="handleTimeChange"
        />
        <div style="display: flex;">
          <el-input-number
            :model-value="time.minute"
            :controls="false"
            :max="maxTime.minus"
            :min="0"
            :disabled="!selectedEpisode"
            size="small"
            @change="handleMinuteChange"
          />
          <span style="margin: 0 5px;">:</span>
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
</template>

<style lang="scss">
#app {
  width: 400px;
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
    flex-direction: column;
    align-items: center;
    border-top: 1px solid rgba(0, 0, 0, 15%);
    padding: 10px 30px;

    .el-slider__button {
      width: 12px;
      height: 12px;
    }
  }

  &__timer {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;

    .el-input__wrapper {
      padding: 0 5px !important;
    }

    .el-input-number {
      width: 2rem;
    }

    .el-input__inner {
      font-size: 12px;
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
