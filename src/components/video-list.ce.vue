<script setup lang="ts">
import type { Video } from '@/service'

import { ElMessage } from 'element-plus'
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
  dialogEl,
} = inject(contentInjectionKey)!

const prefix = 'crx-video-list'
const loadingId = ref()
const renameId = ref<Video['id'] | null>()
const videoName = ref('')

const platformMenus = computed(() => {
  return (Object.keys(videoGroup.value)).map(key => ({
    value: Number.parseInt(key),
    label: (platformToName as Record<string, any>)[key],
  }))
})
const currMenuVideos = computed(() => {
  return videoGroup.value[activeMenu.value] ?? []
})
const videoMap = computed(() => {
  const map = new Map<Video['id'], Video>()

  videos.value.forEach((v) => {
    if (map.has(v.id))
      return

    map.set(v.id, v)
  })

  return map
})

watch(renameId, (val) => {
  if (!val) {
    videoName.value = ''
  }
  else {
    videoName.value = videoMap.value.get(val)?.name ?? ''
  }
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

function handleRename() {
  if (!renameId.value) {
    return
  }

  if (!videoName.value) {
    ElMessage({
      type: 'error',
      message: '视频名称不能为空！',
      appendTo: dialogEl.value,
    })

    return
  }

  const video = videoMap.value.get(renameId.value)

  if (!video)
    return

  chrome.runtime.sendMessage({
    type: MessageType.UPDATE_VIDEO,
    id: renameId.value,
    data: { ...video, name: videoName.value },
  }, (response) => {
    const { data } = response

    if (!data) {
      return ElMessage({
        type: 'error',
        message: '重命名失败！',
        appendTo: dialogEl.value,
      })
    }

    videos.value = videos.value.filter(v => v.id !== data.id)
    videos.value.push(data)
    renameId.value = null
  })
}
</script>

<template>
  <div :class="prefix">
    <el-segmented v-model="activeMenu" :options="platformMenus" />
    <el-scrollbar style="flex: 1;">
      <div :class="`${prefix}__wrapper`">
        <template v-for="video in currMenuVideos" :key="video.id">
          <div v-if="renameId === video.id">
            <el-input
              v-model="videoName"
              autofocus
              @change="handleRename"
            />
          </div>
          <ContextMenu
            v-else
            @delete="handleDelete(video.id!)"
            @update="renameId = video.id"
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
        </template>
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
