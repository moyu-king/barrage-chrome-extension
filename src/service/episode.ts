import type { BaseResponse } from './base'
import type { Platform } from './video'

import { instance } from './base'

export interface Episode {
  vid: string
  union_title: string
  title: string
  duration: number
  season: string
}

export async function getEpisodes(vid: number, platform: Platform): Promise<BaseResponse<Episode[]>> {
  return await instance.get(`/proxy/episode?vid=${vid}&platform=${platform}`)
}
