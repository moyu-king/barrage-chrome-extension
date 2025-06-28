import type { Barrage, BarrageParams } from '@/service'

import { defineStore } from 'pinia'
import { getAllBarrages } from '@/service'

export const useContentStore = defineStore('contentStore', () => {
  const barragesMap = ref(new Map<string, Barrage[]>())

  async function getBarrages(params: BarrageParams, disabledCache = false) {
    if (barragesMap.value.has(params.vid) && !disabledCache)
      return

    const response = await getAllBarrages(params)

    barragesMap.value.set(params.vid, response.data)
  }

  return {
    barragesMap,
    getBarrages,
  }
})
