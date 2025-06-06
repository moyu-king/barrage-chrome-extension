<script setup lang="ts">
import { Platform } from '@/service'
import { usePopupStore } from '@/store'
import { storeToRefs } from 'pinia'

import type { Video } from '@/service'

const activeMenu = defineModel<Platform>('active', { default: Platform.TENCENT })
const prefix = 'crx-video-list'
const popupStore = usePopupStore()
const { videoGroup, selectedVideoId, platformMenus } = storeToRefs(popupStore)

const currMenuVideos = computed(() => {
  return videoGroup.value[activeMenu.value] ?? []
})

async function selectVideo(vid: Video['id']) {
  selectedVideoId.value = vid
}
</script>

<template>
  <div :class="prefix">
    <el-segmented v-model="activeMenu" :options="platformMenus" />
    <el-scrollbar ref="scrollbarRef" style="flex: 1;">
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
  </div>
</template>

<style lang="scss">
.crx-video-list {
  display: flex;
  flex-direction: column;
  row-gap: 10px;
  width: 100%;
  height: 100%;

  .el-segmented {
    --el-segmented-item-selected-color: var(--el-text-color-primary);
    --el-segmented-item-selected-bg-color: #ffd100;
    --el-border-radius-base: 16px;

    width: 100%;
  }
}
</style>
