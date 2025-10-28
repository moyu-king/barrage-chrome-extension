import type { BaseResponse, Platform, Video } from './base'

import { getDB } from './base'

export interface VideoCreateOpt {
  name: string
  params: Record<string, any>
  platform: Platform
}

/**
 * 获取全部的视频参数
 */
export async function getAllVideos() {
  const resp = {
    status: 1,
    message: 'success',
    data: [],
  } as BaseResponse<Video[]>

  try {
    const db = await getDB()
    const videos = await db.getAll('videos')

    resp.data = videos
  }
  catch (e) {
    resp.status = 0
    resp.message = (e as Error).message
  }

  return resp
}

/**
 * 添加视频参数
 */
export async function createVideo(data: VideoCreateOpt) {
  const resp = {
    status: 1,
    message: 'success',
    data: null,
  } as BaseResponse<Video | null>

  try {
    const db = await getDB()
    const id = await db.add('videos', { ...data })

    resp.data = { ...data, id }
  }
  catch (e) {
    resp.status = 0
    resp.message = (e as Error).message
  }

  return resp
}

export async function deleteVideo(id: number) {
  const resp = {
    status: 1,
    message: 'success',
    data: true,
  }

  try {
    const db = await getDB()
    db.delete('videos', id)
  }
  catch (e) {
    resp.status = 0
    resp.message = (e as Error).message
    resp.data = false
  }

  return resp
}

export async function updateVideo(id: number, data: Partial<VideoCreateOpt>) {
  const resp = {
    status: 1,
    message: 'success',
    data: null,
  } as BaseResponse<Video | null>

  try {
    const db = await getDB()
    const video = await db.get('videos', id)

    if (video) {
      await db.put('videos', { ...video, ...data })
    }
    else {
      throw new Error('未找到视频！')
    }

    resp.data = { ...video, ...data }
  }
  catch (e) {
    resp.status = 0
    resp.message = (e as Error).message
  }

  return resp
}
