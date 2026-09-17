<script setup lang="ts">
import type { ScrollbarInstance } from 'element-plus'
import type { Episode } from '@/service'

import { ArrowLeftBold, Sort } from '@element-plus/icons-vue'
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
  isEpisodeOrderDesc,
} = inject(contentInjectionKey)!

const prefix = 'crx-episode'
const loadingSet = ref(new Set())
const scrollbarRef = ref<ScrollbarInstance>()

const episodes = computed(() => {
  if (typeof selectedVideoId.value !== 'number')
    return []

  return episodesMap.value.get(selectedVideoId.value) ?? []
})

interface EpisodeGroup {
  season: string
  items: Episode[]
}

/**
 * 按 season 分组，保持平台返回的顺序；倒序时季度与季内集数一并反转。
 * 这里用数组而非以 season 为键的对象：season 若是 "1"、"2" 这类整数样式的字符串，
 * JS 对象会按数值升序重排键，插入顺序失效，反转也就无从谈起。
 */
const episodesGroup = computed<EpisodeGroup[]>(() => {
  const groups: EpisodeGroup[] = []
  const groupMap = new Map<string, EpisodeGroup>()

  for (const episode of episodes.value) {
    let group = groupMap.get(episode.season)

    if (!group) {
      group = { season: episode.season, items: [] }
      groupMap.set(episode.season, group)
      groups.push(group)
    }

    group.items.push(episode)
  }

  if (isEpisodeOrderDesc.value) {
    groups.reverse() // 最新一季排最前
    for (const group of groups)
      group.items.reverse() // 季内集数反转
  }

  return groups
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

function toggleEpisodeOrder() {
  isEpisodeOrderDesc.value = !isEpisodeOrderDesc.value
  chrome.storage.local.set({ episodeOrderDesc: isEpisodeOrderDesc.value })
  nextTick(() => scrollbarRef.value?.setScrollTop(0))
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
      <div
        :class="`${prefix}__header-order`"
        :title="isEpisodeOrderDesc ? '当前倒序（最新在前），点击切回正序' : '当前正序，点击切换为倒序'"
        @click="toggleEpisodeOrder"
      >
        <el-icon><Sort /></el-icon>
        <span>{{ isEpisodeOrderDesc ? '倒序' : '正序' }}</span>
      </div>
    </div>
    <el-scrollbar ref="scrollbarRef">
      <template v-for="group in episodesGroup" :key="group.season">
        <div v-if="episodesGroup.length > 1 && group.season" :class="`${prefix}__season`">
          {{ group.season }}
        </div>
        <div :class="`${prefix}__wrapper`">
          <el-button
            v-for="episode in group.items"
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
