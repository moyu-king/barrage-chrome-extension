<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { Setting } from '@element-plus/icons-vue'
import { usePopupStore } from '@/store'
import { sendMessageToContent } from '@/utils'
import EpisodeList from './episode-list.vue'
import VideoList from './video-list.vue'

const prefix = 'crx-popup'
const popupStore = usePopupStore()
const { selectedVideoId, selectedEpisode, timerTime } = storeToRefs(popupStore)

popupStore.getVideos()

chrome.storage?.local.get('timerTime', result => {
  timerTime.value = result.timerTime || 0
})

chrome.storage?.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.timerTime) {
    timerTime.value = changes.timerTime.newValue
  }
})

const time = reactive({
  minute: 0,
  second: 0
})

watch(timerTime, () => {
  time.minute = Math.floor(timerTime.value / 60),
  time.second = timerTime.value % 60
})

function handleMinuteChange(val?: number) {
  time.minute = val ?? 0

   sendMessageToContent({
    type: 'changeTime',
    time: time.minute * 60 + time.second
  })
}

function handleSecondChange(val?: number) {
  time.second = val ?? 0

  sendMessageToContent({
    type: 'changeTime',
    time: time.minute * 60 + time.second
  })
}

function playBarrages() {
  if (!selectedEpisode.value) return

  const { vid, duration } = selectedEpisode.value

  sendMessageToContent({
    type: 'play',
    vid,
    duration
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
        <VideoList v-if="!selectedVideoId"></VideoList>
        <EpisodeList v-else></EpisodeList>
      </Transition>
    </div>
    <div :class="`${prefix}__control`">
      <div :class="`${prefix}__timer`">
          <el-input-number
            :model-value="time.minute"
            :controls="false"
            :max="999"
            :min="0"
            :disabled="!selectedEpisode"
            @change="handleMinuteChange"
            />
          <span>:</span>
          <el-input-number
            :model-value="time.second"
            :controls="false"
            :step="1"
            :max="59"
            :min="0"
            :disabled="!selectedEpisode"
            @change="handleSecondChange"
          />
      </div>
      <div :class="`${prefix}__buttons`">
        <el-button
          type="primary"
          :disabled="!selectedEpisode"
          @click="playBarrages"
        >
          播放
        </el-button>
        <el-button
          type="warning"
          @click="sendMessageToContent({ type: 'reset' })"
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