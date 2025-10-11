<script setup lang="ts">
import type { Episode } from '@/service'

import { ArrowLeftBold } from '@element-plus/icons-vue'
import { MessageType } from '@/background'
import { contentInjectionKey } from '@/symbol'
import ScrollLabel from './scroll-label.ce.vue'

const emits = defineEmits(['readyPlay'])
const attrs = useAttrs()

const {
  barragesMap,
  selectedEpisode,
  selectedVideoId,
  selectedVId,
  episodesMap,
  videoMap,
  isCustomPlay,
} = inject(contentInjectionKey)!

const prefix = 'crx-episode'
const loadingSet = ref(new Set())

const episodes = computed(() => {
  if (typeof selectedVideoId.value !== 'number')
    return []

  return episodesMap.value.get(selectedVideoId.value) ?? []
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

  if (!isCustomPlay.value && selectedEpisode.value && selectedVideoId.value) {
    const { vid, duration } = selectedEpisode.value
    const video = videoMap.value.get(selectedVideoId.value)

    if (!video) {
      return
    }

    loadingSet.value.add(vid)

    chrome.runtime.sendMessage(
      {
        type: MessageType.GET_BARRAGES,
        params: { vid, duration, platform: video.platform, filter: true },
      },
      (response) => {
        selectedVideoId.value = video.id
        selectedVId.value = vid
        barragesMap.value.set(vid, response.data)
        emits('readyPlay')
        loadingSet.value.delete(vid)
      },
    )
  }
}

function backVideoList() {
  selectedVideoId.value = undefined
}

function getEpisodeTitle(episode: Episode) {
  const { union_title, title, duration } = episode
  return Number(duration) < 60 * 1000 * 3 ? union_title : title // 小于3分钟视为预告片
}

function episodeItemClass(episode: Episode) {
  const titleLen = getEpisodeTitle(episode).length

  return titleLen < 5 ? '' : titleLen >= 12 ? 'plus-item' : titleLen >= 8 ? 'large-item' : 'wide-item'
}
</script>

<template>
  <div v-bind="attrs" :class="prefix">
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
            :loading="loadingSet.has(episode.vid)"
            :type="selectedEpisode?.vid === episode.vid ? 'primary' : undefined"
            :title="getEpisodeTitle(episode)"
            :class="episodeItemClass(episode)"
            class="episode-item"
            @click="selectEpisode(episode)"
          >
            <ScrollLabel
              v-if="!loadingSet.has(episode.vid)"
              :content="getEpisodeTitle(episode)"
              style="text-align: center;"
            />
          </el-button>
        </div>
      </template>
    </el-scrollbar>
  </div>
</template>
