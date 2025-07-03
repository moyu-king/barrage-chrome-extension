import type { Barrage, BarrageParams, Episode, Video } from '@/service'

import { defineStore } from 'pinia'
import { getAllBarrages, getAllVideos, getEpisodes } from '@/service'

export const useBackgroundStore = defineStore('backgroundStore', () => {
  const videos = ref<Video[]>([])
  const episodesMap = ref(new Map<number, Episode[]>())
  const barragesMap = ref(new Map<string, Barrage[]>())

  async function getBarrages(params: BarrageParams, disabledCache = false) {
    if (barragesMap.value.has(params.vid) && !disabledCache)
      return

    const response = await getAllBarrages(params)

    barragesMap.value.set(params.vid, response.data)
  }

  async function getVideos(disableCache = false) {
    if (videos.value.length && !disableCache)
      return

    const response = await getAllVideos()

    videos.value = response.data
  }

  async function getVideoEpisode(id: number, disableCache = false) {
    if (episodesMap.value.get(id) && !disableCache)
      return []

    const response = await getEpisodes(id)

    episodesMap.value.set(id, response.data)

    return response.data
  }

  return {
    barragesMap,
    getBarrages,
    getVideos,
    getVideoEpisode,
  }
})
