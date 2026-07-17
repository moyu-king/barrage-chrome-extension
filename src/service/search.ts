import type { BaseResponse } from './base'
import { instance, Platform } from './base'

export interface SearchResult {
  title: string
  cover: string
  platform: Platform
  params: Record<string, any>
  /** 类型标签，如 电视剧 / 电影 / 番剧 */
  typeName?: string
  /** 年份 */
  year?: string
}

const platformToSearch = {
  [Platform.BILIBILI]: searchBilibili,
  [Platform.TENCENT]: searchTencent,
  [Platform.IQIYI]: searchIqiyi,
}

/** 校验搜索结果是否具备可添加的必要参数 */
export function isSearchResultValid(result: SearchResult): boolean {
  const { platform, params } = result
  if (platform === Platform.BILIBILI)
    return Boolean(params?.season_id)
  if (platform === Platform.TENCENT)
    return Boolean(params?.cid && params?.vid)
  if (platform === Platform.IQIYI)
    return Boolean(params?.tvid || params?.aid)
  return false
}

/**
 * 搜索视频，统一入口
 */
export async function searchVideos(
  platform: Platform,
  keyword: string,
  page = 1,
) {
  const resp: BaseResponse<SearchResult[]> = { status: 1, message: 'success', data: [] }

  try {
    const search = platformToSearch[platform]
    if (!search)
      throw new Error('不支持的平台')

    const data = await search(keyword.trim(), page)
    resp.data = data.filter(isSearchResultValid)
  }
  catch (e) {
    resp.status = 0
    resp.message = (e as Error).message || '搜索失败'
  }

  return resp
}

function stripHtml(text: string): string {
  return String(text || '').replace(/<[^>]*>/g, '').trim()
}

function extractYear(value: unknown): string | undefined {
  if (value == null || value === '')
    return undefined
  // 爱奇艺等平台：{ key: '年份', value: '2023' }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return extractYear(obj.value ?? obj.year ?? obj.text)
  }
  // unix 秒级时间戳
  if (typeof value === 'number' && value > 1e9) {
    const y = new Date(value * 1000).getFullYear()
    return y > 1900 ? String(y) : undefined
  }
  const m = String(value).match(/(19|20)\d{2}/)
  return m?.[0]
}

function normalizeCover(url: string): string {
  const src = String(url || '').trim()
  if (!src)
    return ''
  if (src.startsWith('//'))
    return `https:${src}`
  if (src.startsWith('http://'))
    return `https://${src.slice(7)}`
  return src
}

/** 标题与关键词的简单相关度：用于过滤「相关推荐」噪声 */
function titleRelevance(title: string, keyword: string): number {
  const t = title.toLowerCase().replace(/\s+/g, '')
  const k = keyword.toLowerCase().replace(/\s+/g, '')
  if (!k || !t)
    return 0
  if (t === k)
    return 100
  if (t.includes(k))
    return 80
  // 去掉常见后缀后再比
  const trimmed = t.replace(/【.*?】|\[.*?\]/g, '').replace(/第.+[季部期]|全季|特别版|抢先看|剧场版|动态漫|回顾特辑/g, '')
  if (trimmed.includes(k) || k.includes(trimmed))
    return 60
  // 关键词字符覆盖率
  let hit = 0
  for (const ch of k) {
    if (t.includes(ch))
      hit++
  }
  return Math.round((hit / k.length) * 40)
}

const SECONDARY_TITLE_RE = /特别版|抢先看|回顾特辑|花絮|动态漫|精讲|解读|纯享/

/**
 * Bilibili：合并番剧 (media_bangumi) + 影视 (media_ft)
 */
async function searchBilibili(keyword: string, page: number): Promise<SearchResult[]> {
  const url = 'https://api.bilibili.com/x/web-interface/search/all/v2'
  const response = (await instance.get(url, {
    params: { keyword, page },
  })) as Record<string, any>

  if (response?.code !== undefined && response.code !== 0)
    throw new Error(response.message || 'Bilibili 搜索失败')

  const resultList = response?.data?.result || []
  const blocks = ['media_bangumi', 'media_ft']
  const seen = new Set<string>()
  const results: SearchResult[] = []

  for (const type of blocks) {
    const block = resultList.find((r: Record<string, any>) => r.result_type === type)
    for (const item of block?.data || []) {
      const seasonId = String(item.season_id ?? '')
      if (!seasonId || seen.has(seasonId))
        continue
      seen.add(seasonId)

      results.push({
        title: stripHtml(item.title),
        cover: normalizeCover(item.cover || item.pic || ''),
        platform: Platform.BILIBILI,
        typeName: String(item.season_type_name || (type === 'media_bangumi' ? '番剧' : '影视')),
        year: extractYear(item.pubtime || item.release_date || item.year),
        params: { season_id: seasonId },
      })
    }
  }

  return results
}

/**
 * 从腾讯搜索条目中提取 cid / vid
 */
function extractTencentCidVid(item: Record<string, any>): { cid: string, vid: string } | null {
  const doc = item.doc || {}
  if (doc.dataType !== 2 || !doc.id)
    return null

  const info = item.videoInfo || {}
  const cid = String(doc.id)
  let vid = ''

  const sites = [
    ...(info.episodeSites || []),
    ...(info.playSites || []),
  ]
  for (const site of sites) {
    const ep = site?.episodeInfoList?.[0]
    if (!ep)
      continue
    if (ep.id) {
      vid = String(ep.id)
      break
    }
    const m = String(ep.url || '').match(/\/x\/cover\/([a-z0-9]+)\/([a-z0-9]+)\.html/i)
    if (m) {
      vid = m[2]
      break
    }
  }

  return { cid, vid }
}

async function resolveTencentVid(cid: string): Promise<string> {
  try {
    const resp = (await instance.get('https://node.video.qq.com/x/api/float_vinfo2', {
      params: { cid },
    })) as Record<string, any>
    const ids = resp?.c?.video_ids
    if (Array.isArray(ids) && ids.length)
      return String(ids[0])
    if (resp?.c?.vid)
      return String(resp.c.vid)
  }
  catch {
    // ignore
  }
  return ''
}

/**
 * 腾讯视频搜索
 */
async function searchTencent(keyword: string, page: number): Promise<SearchResult[]> {
  const json = (await instance.post(
    'https://pbaccess.video.qq.com/trpc.videosearch.mobile_search.MultiTerminalSearch/MbSearch?vversion_platform=2',
    {
      query: keyword,
      pagenum: Math.max(0, page - 1),
      pagesize: 30,
      version: '26022601',
      clientType: 1,
      isneedQc: true,
      filterValue: '',
      featureList: ['DEFAULT_FEFEATURE', 'PC_WANT_EPISODE_V2', 'PC_WANT_EPISODE'],
    },
  )) as Record<string, any>

  if (json?.data?.errcode && json.data.errcode !== 0)
    throw new Error(json.data.errmsg || '腾讯视频搜索失败')

  const normalItems = (json?.data?.normalList?.itemList || []) as Record<string, any>[]
  const areaItems = ((json?.data?.areaBoxList || []) as Record<string, any>[]).flatMap(
    box => box?.itemList || [],
  )

  const normalCovers = normalItems.filter(item => item?.doc?.dataType === 2)
  // normalList 无正片时走 areaBox，并按标题相关度过滤弱相关推荐
  const sourceItems = normalCovers.length > 0
    ? normalCovers
    : areaItems.filter((item) => {
        const title = stripHtml(item?.videoInfo?.title || '')
        return titleRelevance(title, keyword) >= 50
      })

  const seen = new Set<string>()
  const pending: Array<{
    title: string
    cover: string
    cid: string
    vid: string
    typeName: string
    year: string
    score: number
  }> = []

  for (const item of sourceItems) {
    const info = item.videoInfo
    if (!info?.title)
      continue

    const ids = extractTencentCidVid(item)
    if (!ids || seen.has(ids.cid))
      continue
    seen.add(ids.cid)

    const title = stripHtml(info.title)
    let score = titleRelevance(title, keyword)
    if (SECONDARY_TITLE_RE.test(title))
      score -= 15

    pending.push({
      title,
      cover: normalizeCover(info.imgUrl || ''),
      cid: ids.cid,
      vid: ids.vid,
      typeName: String(info.typeName || ''),
      year: extractYear(info.year) || '',
      score,
    })
  }

  await Promise.all(
    pending
      .filter(item => !item.vid)
      .map(async (item) => {
        item.vid = await resolveTencentVid(item.cid)
      }),
  )

  return pending
    .filter(item => item.cid && item.vid)
    .sort((a, b) => b.score - a.score)
    .map(item => ({
      title: item.title,
      cover: item.cover,
      platform: Platform.TENCENT,
      typeName: item.typeName || undefined,
      year: item.year || undefined,
      params: { cid: item.cid, vid: item.vid },
    }))
}

/**
 * 从 iQiyi 页面 URL 中提取 tvid（base36 解码 + XOR）
 */
function extractTvidFromUrl(pageUrl: string): string {
  try {
    const match = pageUrl.match(/\/[vwp]_([a-z0-9]+)\.html/i)
    const pathId = match?.[1]
    if (!pathId)
      return ''

    const chars = '0123456789abcdefghijklmnopqrstuvwxyz'
    let result = 0n
    for (const char of pathId.toLowerCase()) {
      const idx = chars.indexOf(char)
      if (idx < 0)
        return ''
      result = result * 36n + BigInt(idx)
    }

    const key = 0x75706971676Cn
    let tvidBig = result ^ key
    if (tvidBig < 900000n) {
      tvidBig = (tvidBig + 900000n) * 100n
    }
    return tvidBig.toString()
  }
  catch {
    return ''
  }
}

/** 爱奇艺正片频道（channel 形如 "电视剧,2"） */
const IQIYI_CHANNEL_ALLOW = new Set([
  '1', // 电影
  '2', // 电视剧
  '3', // 纪录片
  '4', // 动漫
  '6', // 综艺
  '15', // 儿童
])

function parseIqiyiChannelId(channel: string): string {
  const parts = String(channel || '').split(',')
  return (parts[1] || parts[0] || '').trim()
}

function extractIqiyiIds(album: Record<string, any>): { tvid: string, aid: string } {
  const playUrl = String(album.playUrl || '')
  const tvidFromPlay = (playUrl.match(/tvid=(\d+)/i) || [])[1] || ''
  const aidFromPlay = (playUrl.match(/albumid=(\d+)/i) || [])[1] || ''

  const tvid = tvidFromPlay
    || String(album.playQipuId || '')
    || extractTvidFromUrl(album.pageUrl || '')

  // qipuId 对正片专辑通常是 albumId；与 tvid 相同时不要当 aid 用
  let aid = aidFromPlay || String(album.qipuId || '')
  if (aid && tvid && aid === tvid)
    aid = ''

  return { tvid: tvid ? String(tvid) : '', aid: aid ? String(aid) : '' }
}

/**
 * 爱奇艺搜索：只保留本站正片，优先从 playUrl 取 tvid/aid
 */
async function searchIqiyi(keyword: string, page: number): Promise<SearchResult[]> {
  const url = 'https://mesh.if.iqiyi.com/portal/lw/search/homePageV3'
  const response = (await instance.get(url, {
    params: { key: keyword, pageNum: page, pageSize: 25 },
  })) as Record<string, any>

  const templates = response?.data?.templates
  if (!Array.isArray(templates)) {
    if (response?.code && response.code !== 0)
      throw new Error(response.msg || '爱奇艺搜索失败')
    return []
  }

  const seen = new Set<string>()
  const results: SearchResult[] = []

  for (const t of templates) {
    const album = t?.albumInfo
    if (!album || album.siteId !== 'iqiyi')
      continue

    const channelId = parseIqiyiChannelId(album.channel)
    if (!IQIYI_CHANNEL_ALLOW.has(channelId))
      continue

    const title = stripHtml(album.title)
    if (!title || SECONDARY_TITLE_RE.test(title))
      continue

    // 弱相关过滤
    if (titleRelevance(title, keyword) < 40)
      continue

    const { tvid, aid } = extractIqiyiIds(album)
    if (!tvid && !aid)
      continue

    const key = aid || tvid
    if (seen.has(key))
      continue
    seen.add(key)

    const channelName = String(album.channel || '').split(',')[0] || ''
    const params: Record<string, string> = {}
    if (tvid)
      params.tvid = tvid
    if (aid)
      params.aid = aid

    results.push({
      title,
      cover: normalizeCover(album.img || album.imgH || ''),
      platform: Platform.IQIYI,
      typeName: channelName || undefined,
      year: extractYear(album.year),
      params,
    })
  }

  return results
    .sort(
      (a, b) => titleRelevance(b.title, keyword) - titleRelevance(a.title, keyword),
    )
    .slice(0, 20)
}
