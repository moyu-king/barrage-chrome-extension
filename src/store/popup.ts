import type { Episode, Video } from '@/service'

import { defineStore } from 'pinia'
import { getAllVideos, getEpisodes, Platform } from '@/service'

export const platformToName = {
  [Platform.TENCENT]: '腾讯',
  [Platform.BILIBILI]: 'bilibili',
}

export const usePopupStore = defineStore('popupStore', () => {
  const videos = ref<Video[]>([])
  const episodesMap = ref({} as Record<Video['id'], Episode[]>)
  const selectedVideoId = ref<Video['id']>()
  const selectedEpisode = ref<Episode | null>(null)
  const timerTime = ref(0) // s

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

  const videoMap = computed(() => {
    return new Map(videos.value.map(v => [v.id, v]))
  })

  const platformMenus = computed(() => {
    return (Object.keys(videoGroup.value)).map(key => ({
      value: Number.parseInt(key),
      label: (platformToName as Record<string, any>)[key],
    }))
  })

  async function getVideos(disableCache = false) {
    if (videos.value.length && !disableCache)
      return

    const response = await getAllVideos()

    videos.value = response.data
  }

  async function getVideoEpisode(id: Video['id'], disableCache = false) {
    if (episodesMap.value[id] && !disableCache)
      return

    const response = await getEpisodes(id)

    episodesMap.value[id] = response.data
  }

  return {
    timerTime,
    episodesMap,
    platformMenus,
    selectedVideoId,
    selectedEpisode,
    videos,
    videoMap,
    videoGroup,
    getVideos,
    getVideoEpisode,
  }
})
