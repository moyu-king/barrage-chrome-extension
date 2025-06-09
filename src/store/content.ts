import type { Barrage } from '@/service'

import { defineStore } from 'pinia'
import { getAllBarrages } from '@/service'

export const useContentStore = defineStore('contentStore', () => {
  const barragesMap = ref(new Map<string, Barrage[]>())

  async function getBarrages(id: string, duration = 30, disabledCache = false) {
    if (barragesMap.value.has(id) && !disabledCache)
      return

    const response = await getAllBarrages(id, duration)

    barragesMap.value.set(id, response.data)
  }

  return {
    barragesMap,
    getBarrages,
  }
})
