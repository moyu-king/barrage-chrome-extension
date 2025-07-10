<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { MessageType } from '@/background'
import { Platform } from '@/service'
import { usePopupStore } from '@/store'

const activeMenu = defineModel<Platform>('active', { default: Platform.TENCENT })
const prefix = 'crx-video-list'
const loadingId = ref()
const store = usePopupStore()
const {
  videoGroup,
  selectedVideoId,
  platformMenus,
  episodesMap,
} = storeToRefs(store)

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
  }, async (response) => {
    episodesMap.value.set(vid, response.data)
    loadingId.value = undefined
    await nextTick()
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
    padding-right: 10px;
  }

  &__wrapper {
    display: grid;
    gap: 10px;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));

    .el-button {
      display: block;
      padding: 5px;
      margin: 0;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;

      & > span {
        display: inline;
      }
    }
  }
}
</style>
