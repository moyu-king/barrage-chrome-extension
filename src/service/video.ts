import { instance } from './base'

import type { BaseResponse } from './base'

export enum Platform {
  TENCENT = 1,
  BILIBILI
}
export interface Video {
  id: number,
  name: string,
  platform: Platform,
  params: Record<string, any>
}

export async function getAllVideos(): Promise<BaseResponse<Video[]>> {
  return instance.get('/videos')
}