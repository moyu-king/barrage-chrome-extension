import { defineStore } from 'pinia'
import { Platform, getAllVideos } from '@/service'

import type { Video } from '@/service'

export const platformToName = {
  [Platform.TENCENT]: '腾讯',
  [Platform.BILIBILI]: 'bilibili'
}

export const usePopupStore = defineStore('popupStore', () => {
  const videos = ref<Video[]>([])
  const selectedVideoId = ref<Video['id']>()

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

  const platformMenus = computed(() => {
    return (Object.keys(videoGroup.value)).map(key => ({
      value: parseInt(key),
      label: (platformToName as Record<string, any>)[key]
    }))
  })

  async function initState() {
    videos.value = await getAllVideos()
  }

  return {
    selectedVideoId,
    platformMenus,
    videos,
    videoGroup,
    initState
  }
})
