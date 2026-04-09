import type { BaseResponse } from './base'
import { getDB, instance, Platform } from './base'

export interface Episode {
  vid: string
  union_title: string
  title: string
  duration: number
  season: string
}

const platformToRequest = {
  [Platform.BILIBILI]: getBiliBiliEpisodes,
  [Platform.TENCENT]: getTencentEpisodes,
  [Platform.IQIYI]: getIqiyiEpisodes,
}

/**
 * 获取视频剧集，统一入口
 */
export async function getEpisodes(vid: number) {
  const resp = { status: 1, message: 'success', data: [] } as BaseResponse<Episode[]>

  try {
    const db = await getDB()
    const video = await db.get('videos', vid)

    if (!video)
      throw new Error('无效视频id')

    const data = await platformToRequest[video.platform](video.params)
    resp.data = data
  }
  catch (e) {
    resp.status = 0
    resp.message = (e as Error).message
  }

  return resp
}

/**
 * 获取哔哩哔哩剧集
 */
export async function getBiliBiliEpisodes(params: Record<string, any>): Promise<Episode[]> {
  try {
    const baseURL = 'https://api.bilibili.com/pgc/view/web/season'
    const response = (await instance.get(baseURL, { params })) as Record<string, any>
    const episodes = response.result.episodes as Record<string, any>[]

    return episodes.map(e => ({
      vid: e.cid,
      duration: e.duration,
      season: '',
      title: e.title,
      union_title: e.show_title,
    }))
  }
  catch {
    return []
  }
}

/**
 * 获取 tencent 剧集
 */
export async function getTencentEpisodes(params: Record<string, any>): Promise<Episode[]> {
  try {
    if (!('cid' in params) || !('vid' in params)) {
      return []
    }

    const fetcher = new TencentEpisodeFetcher()

    return fetcher.fetchAll(params.cid, params.vid)
  }
  catch {
    return []
  }
}

function parseDurationToMs(duration: string) {
  if (!duration)
    return 0

  const pieces = duration.split(':').map(Number)
  if (!pieces.length || pieces.some(Number.isNaN))
    return 0

  if (pieces.length === 3) {
    const [hour, minute, second] = pieces
    return (hour * 3600 + minute * 60 + second) * 1000
  }

  if (pieces.length === 2) {
    const [minute, second] = pieces
    return (minute * 60 + second) * 1000
  }

  return pieces[0] * 1000
}

/**
 * 获取爱奇艺剧集
 */
export async function getIqiyiEpisodes(params: Record<string, any>): Promise<Episode[]> {
  try {
    const aid = params?.aid
    const tvid = params?.tvid

    const toEpisode = (item: Record<string, any>) => {
      const order = Number(item.order ?? 0)
      const orderTitle = order > 0 ? String(order) : ''

      return {
        vid: String(item.tvId ?? ''),
        duration: parseDurationToMs(String(item.duration ?? '0')),
        season: '',
        title: String(orderTitle || item.shortTitle || item.name || ''),
        union_title: String(orderTitle || item.shortTitle || item.name || ''),
      }
    }

    const getAlbumEpisodes = async (albumId: string, totalEpisodes?: number) => {
      const pageSize = totalEpisodes && totalEpisodes > 0
        ? Math.min(totalEpisodes, 200)
        : 50
      const firstResp = (await instance.get('https://pcw-api.iqiyi.com/albums/album/avlistinfo', {
        params: {
          aid: albumId,
          page: 1,
          size: pageSize,
        },
      })) as Record<string, any>
      const firstList = (firstResp?.data?.epsodelist || []) as Record<string, any>[]
      const total = Math.max(
        Number(totalEpisodes ?? 0),
        Number(firstResp?.data?.total ?? 0),
        firstList.length,
      )
      const pageCount = Math.max(1, Math.ceil(total / pageSize))

      const restTasks = Array.from({ length: pageCount - 1 }, (_, i) =>
        instance.get('https://pcw-api.iqiyi.com/albums/album/avlistinfo', {
          params: {
            aid: albumId,
            page: i + 2,
            size: pageSize,
          },
        }) as Promise<Record<string, any>>)
      const restResp = await Promise.all(restTasks)
      const restList = restResp.flatMap(resp => (resp?.data?.epsodelist || []) as Record<string, any>[])
      const merged = [...firstList, ...restList]
      const seen = new Set<string>()

      return merged
        .map(toEpisode)
        .filter((item) => {
          if (!item.vid || seen.has(item.vid))
            return false

          seen.add(item.vid)
          return true
        })
    }

    // 优先：有专辑 id 直接拉整季
    if (aid) {
      return await getAlbumEpisodes(String(aid))
    }

    if (!tvid)
      return []

    // 兜底：只有 tvid 时，先查 playervideoinfo 取 albumId，再拉整季
    const response = (await instance.get('https://pcw-api.iqiyi.com/video/video/playervideoinfo', {
      params: { tvid },
    })) as Record<string, any>
    const data = response?.data

    if (!data)
      return []

    const albumId = String(data.albumId ?? data.aid ?? '')
    if (albumId) {
      const episodes = await getAlbumEpisodes(albumId, Number(data.es ?? 0))
      if (episodes.length)
        return episodes
    }

    // 再兜底：专辑列表拉不到时返回单集
    return [{
      vid: String(data.tvid ?? tvid),
      duration: Number(data.plg ?? 0) * 1000,
      season: '',
      title: String(data.vn || ''),
      union_title: String(data.vn || ''),
    }]
  }
  catch {
    return []
  }
}

interface PageContextItem {
  page_context: string
  season: string
}

export class TencentEpisodeFetcher {
  baseUrl = 'https://pbaccess.video.qq.com/trpc.universal_backend_service.page_server_rpc.PageServer/GetPageData'
  headers = {
    'Content-Type': 'application/json',
  }

  params: Record<string, string | number> = {
    video_appid: '3000010',
    vplatform: 2,
    vversion_name: '8.2.96',
  }

  cid = ''
  vid = ''
  page_num = 30

  async fetchAll(cid: string, vid: string): Promise<Episode[]> {
    this.cid = cid
    this.vid = vid

    const pageContextList = await this.getPageContext()
    if (pageContextList.length) {
      const tasks = pageContextList.map(ctx => this.fetchOne(ctx))
      const data = await Promise.all(tasks)
      return data.flat()
    }
    else {
      return this.fetchOne({ page_context: '', season: '' })
    }
  }

  async fetchOne(pageContext: PageContextItem): Promise<Episode[]> {
    const json = {
      page_params: {
        req_from: 'web_vsite',
        page_id: 'vsite_episode_list',
        page_type: 'detail_operation',
        id_type: '1',
        cid: this.cid,
        vid: this.vid,
        lid: '',
        page_num: '',
        detail_page_type: '1',
        page_context: pageContext.page_context,
      },
      has_cache: 1,
    }

    try {
      const response = await instance.post(this.baseUrl, json, {
        headers: this.headers,
        params: this.params,
      })

      const episodes: Episode[] = []
      const data = response.data
      const moduleListData = data.module_list_datas[0]
      const itemDatas = moduleListData.module_datas[0].item_data_lists.item_datas

      for (const item of itemDatas) {
        const itemParams = item.item_params
        if ('cid' in itemParams) {
          episodes.push({
            vid: itemParams.vid,
            union_title: itemParams.union_title,
            title: itemParams.title,
            duration: Number.parseInt(itemParams.duration) * 1000,
            season: pageContext.season,
          })
        }
      }

      return episodes
    }
    catch (e) {
      console.error('fetchOne error:', e)
      return []
    }
  }

  async getPageContext() {
    const json = {
      page_params: {
        req_from: 'web_vsite',
        page_id: 'vsite_episode_list',
        page_type: 'detail_operation',
        id_type: '1',
        cid: this.cid,
        vid: this.vid,
        lid: '',
        page_num: '',
        detail_page_type: '1',
        page_context: '',
      },
      has_cache: 1,
    }

    try {
      const response = await instance.post(this.baseUrl, json, {
        headers: this.headers,
        params: this.params,
      })

      const data = response.data

      const moduleData = data.module_list_datas[0].module_datas[0]
      const pageContextList: PageContextItem[] = []

      const tabs = moduleData.module_params.tabs
      if (tabs) {
        const matches = [...tabs.matchAll(/page_context":"(.*?)"/g)]
        for (const match of matches) {
          pageContextList.push({
            page_context: match[1],
            season: '',
          })
        }
      }
      else {
        const itemDatas = moduleData.item_data_lists.item_datas
        for (const item of itemDatas) {
          const params = item.item_params
          if (params?.page_context) {
            pageContextList.push({
              page_context: params.page_context,
              season: params.title || '',
            })
          }
        }
      }

      return pageContextList
    }
    catch (e) {
      console.error('getPageContext error:', e)
      return []
    }
  }
}
