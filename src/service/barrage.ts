import type { BaseResponse } from './base'

import { barrage } from '@/protobuf/compiler/barrage'
import { instance, Platform } from './base'

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

const platformToRequest = {
  [Platform.BILIBILI]: getBiliBiliBarrages,
  [Platform.TENCENT]: getTencentBarrage,
}

export async function getAllBarrages(params: BarrageParams) {
  const resp = { status: 1, message: 'success', data: [] } as BaseResponse<Barrage[]>
  const { platform } = params

  try {
    const data = await platformToRequest[platform](params)
    resp.data = data
  }
  catch (e) {
    resp.status = 0
    resp.message = (e as Error).message
  }

  return resp
}

export async function getBiliBiliBarrages(params: BarrageParams) {
  try {
    if (!params.duration || !params.vid) {
      return []
    }

    const fetcher = new BiliBiliBarrageFetcher()
    return fetcher.fetchAll(params.duration, params.vid)
  }
  catch {
    return []
  }
}

export async function getTencentBarrage(params: BarrageParams) {
  try {
    if (!params.duration || !params.vid) {
      return []
    }

    const fetcher = new TencentBarrageFetcher()
    return fetcher.fetchAll(params.duration, params.vid, params.filter)
  }
  catch {
    return []
  }
}

export class TencentBarrageFetcher {
  private timeOffset = 30000
  private contentScore = 50

  async fetchAll(duration: number, vid: string, filter: boolean) {
    const timestamps = Array.from({ length: duration / 1000 / 60 * 2 }, (_, i) => i * this.timeOffset)
    const tasks = timestamps.map(time => this.fetchOne(time, vid, filter))
    return (await Promise.all(tasks)).flat()
  }

  async fetchOne(timeEnd: number, vid: string, filter: boolean) {
    const baseUrl = `https://dm.video.qq.com/barrage/segment/${vid}/t/v1`
    const timeBegin = timeEnd + this.timeOffset

    try {
      const url = `${baseUrl}/${timeEnd}/${timeBegin}`
      const res: { barrage_list: any[] } = await instance.get(url)
      const items = res?.barrage_list || []

      const barrages: Barrage[] = []

      for (const item of items) {
        const score = Number(item.content_score)
        const content = item.content
        if (filter && (score < this.contentScore || content.length <= 1)) {
          continue
        }

        barrages.push({
          style: item.content_style,
          weight: score,
          offset: Number(item.time_offset),
          content,
        })
      }

      return barrages
    }
    catch {
      return []
    }
  }
}

export class BiliBiliBarrageFetcher {
  private baseUrl = 'https://api.bilibili.com/x/v2/dm/web/seg.so'

  async fetchAll(duration: number, vid: string) {
    const segments = Math.ceil(duration / (1000 * 60 * 6))

    const tasks = Array.from({ length: segments }, (_, i) =>
      this.fetchOne(vid, i + 1))

    return (await Promise.all(tasks)).flat()
  }

  async fetchOne(vid: string, segmentIndex: number) {
    try {
      const params = { oid: vid, segment_index: segmentIndex, type: 1 }
      const buffer: ArrayBuffer = await instance.get(this.baseUrl, {
        params,
        responseType: 'arraybuffer',
      })

      const reply = barrage.BarrageSegMobi1eReply.decode(new Uint8Array(buffer))

      return reply.elems.map(elem => ({
        content: elem.content ?? '',
        style: elem.color ? `color:#${elem.color.toString(16)}` : '',
        offset: elem.progress ?? 0,
        weight: elem.weight ?? 1,
      }))
    }
    catch {
      return []
    }
  }
}
