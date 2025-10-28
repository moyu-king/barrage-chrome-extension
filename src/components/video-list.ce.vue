<script setup lang="ts">
import { MessageType } from '@/background'
import { Platform } from '@/service'
import { contentInjectionKey } from '@/symbol'
import ContextMenu from './context-menu.ce.vue'
import ScrollLabel from './scroll-label.ce.vue'

const activeMenu = defineModel<Platform>('active', { default: Platform.TENCENT })

const platformToName = {
  [Platform.TENCENT]: '腾讯',
  [Platform.BILIBILI]: 'bilibili',
}

const {
  videos,
  videoGroup,
  episodesMap,
  selectedVideoId,
  emojiMap,
} = inject(contentInjectionKey)!

const prefix = 'crx-video-list'
const loadingId = ref()

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

  chrome.runtime.sendMessage({
    type: MessageType.GET_VIDEO_EMOJI,
    id: vid,
  }, (response) => {
    emojiMap.value.set(vid, response.data)
  })
}

function handleDelete(id: number) {
  chrome.runtime.sendMessage({
    type: MessageType.DELETE_VIDEO,
    id,
  }, (response) => {
    if (response) {
      videos.value = videos.value.filter(v => v.id !== id)
    }
  })
}

function handleUpdate(id: number) {
  console.log(id)
}
</script>

<template>
  <div :class="prefix">
    <el-segmented v-model="activeMenu" :options="platformMenus" />
    <el-scrollbar style="flex: 1;">
      <div :class="`${prefix}__wrapper`">
        <ContextMenu
          v-for="video in currMenuVideos"
          :key="video.id"
          @delete="handleDelete(video.id!)"
          @update="handleUpdate(video.id!)"
        >
          <el-button
            :type="selectedVideoId === video.id ? 'primary' : undefined"
            :loading="loadingId === video.id"
            :title="video.name"
            tag="div"
            class="video-item"
            @click="selectVideo(video.id!)"
          >
            <ScrollLabel
              v-if="loadingId !== video.id"
              :content="video.name"
              style="text-align: center;"
            />
          </el-button>
        </ContextMenu>
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

  .video-item {
    position: relative;
    user-select: none;
  }
}
</style>
