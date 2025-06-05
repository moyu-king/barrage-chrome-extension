<script setup lang="ts">
import { Setting } from '@element-plus/icons-vue'
import { Platform, getAllVideos } from '@/service'

import type { Video } from '@/service'

const platformToName = {
  [Platform.TENCENT]: '腾讯',
  [Platform.BILIBILI]: 'bilibili'
}

const prefix = 'crx-popup'
const isOpen = ref(false)
const activeMenu = ref(Platform.TENCENT)
const selectedVideoId = ref<Video['id']>()
const videos = ref<Video[]>([
  { id: 1, name: '完美世界', platform: Platform.TENCENT },
  { id: 2, name: '斗破苍穹', platform: Platform.TENCENT }
])

;(async function() {
  videos.value = await getAllVideos()
})()

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
const menus = computed(() => {
  return (Object.keys(videoGroup.value)).map(key => ({
    value: parseInt(key),
    label: (platformToName as Record<string, any>)[key]
  }))
})
const currMenuVideos = computed(() => {
  return videoGroup.value[activeMenu.value] ?? []
})

function sendMessageToContent(params: Record<string, any>) {
  chrome.tabs.query(
    { active: true, currentWindow: true },
    tabs => {
      chrome.tabs.sendMessage(tabs[0].id!, params)
    }
  )
}

async function selectVideo(vid: Video['id']) {
  selectedVideoId.value = vid
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
      <el-switch v-model="isOpen" />
    </div>
    <el-segmented v-model="activeMenu" :options="menus" />
    <el-scrollbar ref="scrollbarRef" height="200px">
      <div :class="`${prefix}__videos`">
        <el-button
          v-for="video in currMenuVideos"
          :key="video.id"
          :type="selectedVideoId === video.id ? 'primary': undefined"
          class="video-item"
          @click="selectVideo(video.id)"
          >
            {{ video.name }}
      </el-button>
      </div>
    </el-scrollbar>
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