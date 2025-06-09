import type { BaseResponse } from './base'

import { instance } from './base'

export interface Episode {
  cid: string
  vid: string
  union_title: string
  title: string
  duration: number
}

export async function getEpisodes(id: number): Promise<BaseResponse<Episode[]>> {
  return await instance.get(`/tencent/episode/${id}`)
}
