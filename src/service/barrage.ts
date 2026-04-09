import type { BaseResponse } from './base'

import pako from 'pako'
import { barrage } from '@/protobuf/compiler/barrage'
import { instance, Platform } from './base'

export enum BarrageMode {
  SCROLL, // 普通弹幕1-3
  BOTTOM = 4,
  TOP = 5,
  REVERSE = 6,
  ADVANTAGE = 7,
  CODE = 8,
  SCRIPT = 9,
}

export interface Barrage {
  offset: number // ms
  content: string
  weight: number
  style: string
  mode: BarrageMode
}

export interface BarrageParams {
  vid: string
  duration: number // ms
  platform: Platform
}

const platformToRequest = {
  [Platform.BILIBILI]: getBiliBiliBarrages,
  [Platform.TENCENT]: getTencentBarrage,
  [Platform.IQIYI]: getIqiyiBarrage,
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
    return fetcher.fetchAll(params.duration, params.vid)
  }
  catch {
    return []
  }
}

export async function getIqiyiBarrage(params: BarrageParams) {
  try {
    if (!params.duration || !params.vid) {
      return []
    }

    const fetcher = new IqiyiBarrageFetcher()
    return fetcher.fetchAll(params.duration, params.vid)
  }
  catch {
    return []
  }
}

export class TencentBarrageFetcher {
  private timeOffset = 30000

  async fetchAll(duration: number, vid: string) {
    const timestamps = Array.from({ length: duration / 1000 / 60 * 2 }, (_, i) => i * this.timeOffset)
    const tasks = timestamps.map(time => this.fetchOne(time, vid))
    return (await Promise.all(tasks)).flat()
  }

  async fetchOne(timeEnd: number, vid: string) {
    const baseUrl = `https://dm.video.qq.com/barrage/segment/${vid}/t/v1`
    const timeBegin = timeEnd + this.timeOffset

    try {
      const url = `${baseUrl}/${timeEnd}/${timeBegin}`
      const res: { barrage_list: any[] } = await instance.get(url)
      const items = res?.barrage_list || []

      return items.map(item => ({
        style: item.content_style,
        weight: Number(item.content_score),
        offset: Number(item.time_offset),
        content: item.content,
        mode: BarrageMode.SCROLL,
      }))
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

      const reply = barrage.BarrageReply.decode(new Uint8Array(buffer))

      return reply.elems.map(elem => ({
        content: elem.content ?? '',
        style: elem.color ? `color:#${elem.color.toString(16)}` : '',
        offset: elem.progress ?? 0,
        weight: elem.weight ?? 1,
        mode: elem.mode ?? BarrageMode.SCROLL,
      }))
    }
    catch {
      return []
    }
  }
}

function parseIqiyiStyle(color = '') {
  return color ? `color:#${color}` : ''
}

function parseIqiyiMode(position?: string) {
  if (position === '6')
    return BarrageMode.TOP

  if (position === '4')
    return BarrageMode.BOTTOM

  return BarrageMode.SCROLL
}

function inflateDeflateBuffer(buffer: ArrayBuffer) {
  const inflated = pako.inflate(new Uint8Array(buffer))
  return new TextDecoder().decode(inflated)
}

function getXmlTagText(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  return match?.[1] ?? ''
}

function parseIqiyiBulletInfos(xml: string): Barrage[] {
  const barrages: Barrage[] = []
  const matches = xml.matchAll(/<bulletInfo>([\s\S]*?)<\/bulletInfo>/g)

  for (const match of matches) {
    const itemXml = match[1] || ''
    const showTime = getXmlTagText(itemXml, 'showTime')
    const content = getXmlTagText(itemXml, 'content')
    const likeCount = getXmlTagText(itemXml, 'likeCount')
    const color = getXmlTagText(itemXml, 'color')
    const position = getXmlTagText(itemXml, 'position')

    barrages.push({
      offset: Number(showTime || 0) * 1000,
      content,
      weight: Number(likeCount || 1),
      style: parseIqiyiStyle(color),
      mode: parseIqiyiMode(position),
    })
  }

  return barrages
}

export class IqiyiBarrageFetcher {
  private timeOffset = 5 * 60 * 1000

  async fetchAll(duration: number, tvid: string) {
    const segments = Math.max(1, Math.ceil(duration / this.timeOffset))
    const tasks = Array.from({ length: segments }, (_, i) => this.fetchOne(tvid, i + 1))

    return (await Promise.all(tasks)).flat()
  }

  async fetchOne(tvid: string, segment: number) {
    try {
      const suffix = tvid.slice(-4)
      if (suffix.length < 4)
        return []

      const path = `${suffix.slice(0, 2)}/${suffix.slice(2)}/${tvid}`
      const baseUrl = `https://cmts.iqiyi.com/bullet/${path}_300_${segment}.z`
      const buffer: ArrayBuffer = await instance.get(baseUrl, { responseType: 'arraybuffer' })
      const xml = inflateDeflateBuffer(buffer)
      return parseIqiyiBulletInfos(xml)
    }
    catch {
      return []
    }
  }
}
