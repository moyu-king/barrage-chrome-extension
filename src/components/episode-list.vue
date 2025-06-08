<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { ArrowLeftBold } from '@element-plus/icons-vue'
import { usePopupStore } from '@/store'

import type { Episode } from '@/service'

const prefix = 'crx-episode'
const store = usePopupStore()
const {
  selectedVideoId,
  selectedEpisode,
  episodesMap,
  videoMap
} = storeToRefs(store)

const episodes = computed(() => {
  if (typeof selectedVideoId.value !== 'number') return []

  return episodesMap.value[selectedVideoId.value] ?? []
})
const videoName = computed(() => {
  if (typeof selectedVideoId.value !== 'number') return '???'
  const video = videoMap.value.get(selectedVideoId.value)

  return video?.name ?? '???'
})

function selectEpisode(episode: Episode) {
  selectedEpisode.value = episode
}

function backVideoList() {
  selectedVideoId.value = undefined
}
</script>

<template>
  <div :class="`${prefix}`">
    <div :class="`${prefix}__header`">
      <div :class="`${prefix}__header-left`" @click="backVideoList">
        <el-icon><ArrowLeftBold /></el-icon>
        <div style="margin-left: 5px;">{{ videoName }}</div>
      </div>
    </div>
    <el-scrollbar>
      <div :class="`${prefix}__wrapper`">
        <el-button
          v-for="episode in episodes"
          :key="episode.vid"
          :type="selectedEpisode?.vid === episode.vid ? 'primary': undefined"
          class="episode-item"
          @click="selectEpisode(episode)"
        >
          {{ episode.title }}
      </el-button>
      </div>
    </el-scrollbar>
  </div>
</template>

<style lang="scss">
.crx-episode {
  display: flex;
  flex-direction: column;
  row-gap: 10px;
  width: 100%;
  height: 100%;

  &__header {
    display: flex;
    align-items: center;
    font-size: 14px;

    &-left {
      display: flex;
      align-items: center;
      cursor: pointer;

      &:hover {
        color: var(--el-color-primary)
      }
    }
  }

  &__wrapper {
    display: grid;
    gap: 15px;
    grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));

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

  .el-scrollbar {
    flex: 1;
  }
}
</style>