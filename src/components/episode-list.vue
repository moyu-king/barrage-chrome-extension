<script setup lang="ts">
import type { Episode } from '@/service'

import { ArrowLeftBold } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import { usePopupStore } from '@/store'

const prefix = 'crx-episode'
const store = usePopupStore()
const {
  selectedVideoId,
  selectedEpisode,
  episodesMap,
  videoMap,
} = storeToRefs(store)

const episodes = computed(() => {
  if (typeof selectedVideoId.value !== 'number')
    return []

  return episodesMap.value[selectedVideoId.value] ?? []
})
const episodesGroup = computed(() => {
  return episodes.value.reduce((acc, v) => {
    const key = v.season

    if (!acc[key]) {
      acc[key] = []
    }

    acc[key].push(v)
    return acc
  }, {} as Record<string, Episode[]>)
})

const videoName = computed(() => {
  if (typeof selectedVideoId.value !== 'number')
    return '???'
  const video = videoMap.value.get(selectedVideoId.value)

  return video?.name ?? '???'
})

function selectEpisode(episode: Episode) {
  selectedEpisode.value = episode
}

function backVideoList() {
  selectedVideoId.value = undefined
}

function getEpisodeTitle(episode: Episode) {
  const { union_title, title, duration } = episode
  return Number(duration) < 60 * 5 ? union_title : title
}

function episodeItemClass(episode: Episode) {
  const titleLen = getEpisodeTitle(episode).length

  return titleLen < 5 ? '' : titleLen >= 12 ? 'plus-item' : titleLen >= 8 ? 'large-item' : 'wide-item'
}
</script>

<template>
  <div :class="`${prefix}`">
    <div :class="`${prefix}__header`">
      <div :class="`${prefix}__header-left`" @click="backVideoList">
        <el-icon><ArrowLeftBold /></el-icon>
        <div style="margin-left: 5px;">
          {{ videoName }}
        </div>
      </div>
    </div>
    <el-scrollbar>
      <template v-for="(items, season) in episodesGroup" :key="season">
        <div v-if="Object.keys(episodesGroup).length > 1" :class="`${prefix}__season`">
          {{ season }}
        </div>
        <div :class="`${prefix}__wrapper`">
          <el-button
            v-for="episode in items"
            :key="episode.vid"
            :type="selectedEpisode?.vid === episode.vid ? 'primary' : undefined"
            :title="getEpisodeTitle(episode)"
            :class="episodeItemClass(episode)"
            class="episode-item"
            @click="selectEpisode(episode)"
          >
            {{ getEpisodeTitle(episode) }}
          </el-button>
        </div>
      </template>
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

  &__season {
    font-size: 16px;
    padding: 15px 5px;

    &:first-child {
      padding-top: 0;
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

      &.wide-item {
        grid-column: span 2;
      }

      &.large-item {
        grid-column: span 3;
      }

      &.plus-item {
        grid-column: span 4;
      }

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
