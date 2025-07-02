import type { BaseResponse, Video, Platform } from './base'

import { getDB } from './base'

export interface VideoCreateOpt {
  name: string
  params: Record<string, any>
  platform: Platform
}

export async function getAllVideos() {
  const resp = {
    status: 1,
    message: 'success',
    data: []
  } as BaseResponse<Video[]>

  try {
    const db = await getDB()
    const videos = await db.getAll('videos')

    resp.data = videos
  } catch (e) {
    resp.status = 0
    resp.message = (e as Error).message
  }

  return resp
}

export async function createVideo(data: VideoCreateOpt) {
  const resp = {
    status: 1,
    message: 'success',
    data: {}
  } as BaseResponse<Video>

  try {
    const db = await getDB()
    const id = await db.add('videos', { ...data })
    resp.data = { ...data, id }
  } catch (e) {
    resp.status = 0
    resp.message = (e as Error).message
  }

  return resp
}
