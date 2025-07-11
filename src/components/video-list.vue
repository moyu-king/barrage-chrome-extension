<script setup lang="ts">
import type { Video } from '@/service'

import { MessageType } from '@/background'
import { contentInjectionKey } from '@/symbol'
import { Platform } from '@/service'

const activeMenu = defineModel<Platform>('active', { default: Platform.TENCENT })

const platformToName = {
  [Platform.TENCENT]: '腾讯',
  [Platform.BILIBILI]: 'bilibili',
}

const {
  videos,
  episodesMap,
  selectedVideoId
} = inject(contentInjectionKey)!

const prefix = 'crx-video-list'
const loadingId = ref()

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

const platformMenus = computed(() => {
  return (Object.keys(videoGroup.value)).map(key => ({
    value: Number.parseInt(key),
    label: (platformToName as Record<string, any>)[key],
  }))
})

const currMenuVideos = computed(() => {
  return videoGroup.value[activeMenu.value] ?? []
})

async function selectVideo(vid: number) {
  if (!vid) {
    return
  }

  loadingId.value = vid

  chrome.runtime.sendMessage({
    type: MessageType.GET_EPISODES,
    id: vid,
  }, (response) => {
    episodesMap.value.set(vid, response.data)
    loadingId.value = undefined
    selectedVideoId.value = vid
  })
}
</script>

<template>
  <div :class="prefix">
    <el-segmented v-model="activeMenu" :options="platformMenus" />
    <el-scrollbar style="flex: 1;">
      <div :class="`${prefix}__wrapper`">
        <el-button
          v-for="video in currMenuVideos"
          :key="video.id"
          :type="selectedVideoId === video.id ? 'primary' : undefined"
          :loading="loadingId === video.id"
          :title="video.name"
          class="video-item"
          @click="selectVideo(video.id!)"
        >
          {{ video.name }}
        </el-button>
      </div>
    </el-scrollbar>
  </div>
</template>
