import { instance } from './base'

export enum Platform {
  TENCENT = 1,
  BILIBILI
}
export interface Video {
  id: number,
  name: string,
  platform: Platform
}

export async function getAllVideos(): Promise<Video[]> {
  return instance.get('/videos')
}