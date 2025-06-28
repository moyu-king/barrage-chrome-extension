import type { BaseResponse } from './base'
import type { Platform } from './video'

import { instance } from './base'

export interface Barrage {
  offset: number // ms
  content: string
  weight: number
  style: string
}

export interface BarrageParams {
  vid: string
  duration: number // ms
  filter: boolean
  platform: Platform
}

export async function getAllBarrages(params: BarrageParams): Promise<BaseResponse<Barrage[]>> {
  return await instance.get('/proxy/barrage', { params })
}
