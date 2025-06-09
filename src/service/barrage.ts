import type { BaseResponse } from './base'

import { instance } from './base'

export interface Barrage {
  up_count: number
  time_offset: number
  content: string
  content_score: number
  content_style: string
}

export async function getAllBarrages(vid: string, duration: number, filter = true): Promise<BaseResponse<Barrage[]>> {
  return await instance.get(`/tencent/barrage?duration=${duration}&vid=${vid}&filter=${filter}`)
}
