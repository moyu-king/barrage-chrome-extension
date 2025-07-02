import { Platform, type BaseResponse } from './base'

import { instance, getDB } from './base'

export interface Episode {
  vid: string
  union_title: string
  title: string
  duration: number
  season: string
}

const platformToRequest = {
  [Platform.BILIBILI]: getBiliBiliEpisodes,
  [Platform.TENCENT]: getTencentEpisodes
}

export async function getEpisodes(vid: number) {
  const resp = { status: 1, message: 'success', data: [] } as BaseResponse<Episode[]>

  try {
    const db = await getDB()
    const video = await db.get('videos', vid)

    if (!video) throw new Error('无效视频id')

    const data = await platformToRequest[video.platform](video.params)
    resp.data = data
  } catch (e) {
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
    const episodes = response.result as Record<string, any>[]

    return episodes.map(e => ({
      vid: e.cid,
      duration: e.duration,
      season: '',
      title: e.title,
      union_title: e.show_title
    }))
  } catch {
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
  } catch {
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
    'Content-Type': 'application/json'
  }
  params: Record<string, string | number> = {
    video_appid: '3000010',
    vplatform: 2,
    vversion_name: '8.2.96'
  }

  cid = ''
  vid = ''
  page_num = 30

  async fetchAll(cid: string, vid: string): Promise<Episode[]> {
    this.cid = cid
    this.cid = vid

    const pageContextList = await this.getPageContext()
    const tasks = pageContextList.map(ctx => this.fetchOne(ctx))
    const data = await Promise.all(tasks)

    return data.flat()
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
      has_cache: 1
    }

    try {
      const response = await instance.post(this.baseUrl, json, {
        headers: this.headers,
        params: this.params
      })

      const episodes: Episode[] = []
      const data = response.data.data
      const moduleListData = data.module_list_datas[0]
      const itemDatas = moduleListData.module_datas[0].item_data_lists.item_datas

      for (const item of itemDatas) {
        const itemParams = item.item_params
        if ('cid' in itemParams) {
          episodes.push({
            vid: itemParams.vid,
            union_title: itemParams.union_title,
            title: itemParams.title,
            duration: parseInt(itemParams.duration) * 1000,
            season: pageContext.season
          })
        }
      }

      return episodes
    } catch (e) {
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
      has_cache: 1
    }

    try {
      const response = await instance.post(this.baseUrl, json, {
        headers: this.headers,
        params: this.params
      })

      const data = response.data.data
      const moduleData = data.module_list_datas[0].module_datas[0]
      const pageContextList: PageContextItem[] = []

      const tabs = moduleData.module_params.tabs
      if (tabs) {
        const matches = [...tabs.matchAll(/page_context":"(.*?)"/g)]
        for (const match of matches) {
          pageContextList.push({
            page_context: match[1],
            season: ''
          })
        }
      } else {
        const itemDatas = moduleData.item_data_lists.item_datas
        for (const item of itemDatas) {
          const params = item.item_params
          if (params?.page_context) {
            pageContextList.push({
              page_context: params.page_context,
              season: params.title || ''
            })
          }
        }
      }

      return pageContextList
    } catch (e) {
      console.error('getPageContext error:', e)
      return []
    }
  }
}