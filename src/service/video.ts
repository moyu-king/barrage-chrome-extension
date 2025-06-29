import type { BaseResponse } from './base'

import { instance } from './base'

export enum Platform {
  TENCENT = 1,
  BILIBILI,
}

export interface VideoCreateOpt {
  name: string
  params: string
  platform: Platform
}

export interface Video {
  id: number
  name: string
  platform: Platform
  params: Record<string, any>
}

export async function getAllVideos(): Promise<BaseResponse<Video[]>> {
  return instance.get('/video/all')
}

export async function createVideo(data: VideoCreateOpt): Promise<BaseResponse<Video>> {
  return instance.post('video', data)
}
