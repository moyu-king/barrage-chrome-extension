<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { Setting } from '@element-plus/icons-vue'
import { usePopupStore } from '@/store'
import EpisodeList from './episode-list.vue'
import VideoList from './video-list.vue'

const prefix = 'crx-popup'
const popupStore = usePopupStore()
const { selectedVideoId } = storeToRefs(popupStore)

popupStore.initState()

function sendMessageToContent(params: Record<string, any>) {
  chrome.tabs.query(
    { active: true, currentWindow: true },
    tabs => {
      chrome.tabs.sendMessage(tabs[0].id!, params)
    }
  )
}
</script>

<template>
  <div :class="prefix">
    <div :class="`${prefix}__header`">
      <div :class="`${prefix}__title`">
        <el-icon size="18">
          <Setting />
        </el-icon>
        <span>控制面板</span>
      </div>
    </div>
    <div :class="`${prefix}__content`">
      <Transition name="vxp-fade">
        <VideoList v-if="!selectedVideoId"></VideoList>
        <EpisodeList v-else></EpisodeList>
      </Transition>
    </div>
    <div :class="`${prefix}__control`">
      <el-button type="primary" @click="sendMessageToContent({ type: 'play' })">开始</el-button>
      <el-button type="warning" @click=" sendMessageToContent({ type: 'stop' })">暂停</el-button>
      <el-button type="success" @click="sendMessageToContent({ type: 'show' })">显示</el-button>
      <el-button type="warning" @click=" sendMessageToContent({ type: 'hidden' })">隐藏</el-button>
      <el-button type="info" @click=" sendMessageToContent({ type: 'reset' })">重置</el-button>
    </div>
  </div>
</template>

<style lang="scss">
@use '../style/popup.scss';
</style>