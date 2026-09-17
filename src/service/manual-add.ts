import { Platform } from './base'
import { extractTvidFromUrl } from './search'

/**
 * 支持「手动添加当前页面」的网址（顺序敏感，先命中先返回）。
 *
 * prefix 只能定位站点，站点首页/频道页一样满足，必须再用 pattern 确认是播放页
 * —— 否则卡片会出现在取不到参数的页面上，点了必然报错。
 * 每条 pattern 都与对应解析器手里的正则保持一致，保证「卡片出现 = 参数可取」。
 */
export const MANUAL_ADD_TARGETS: Array<{ prefix: string, pattern: RegExp, platform: Platform }> = [
  // 番剧播放页 /ep<id> 或 /ss<id>，裸的 /bangumi/play/ 是索引页
  { prefix: 'https://www.bilibili.com/bangumi/play/', pattern: /\/(?:ep|ss)[0-9a-z]+/i, platform: Platform.BILIBILI },
  // 与 search.ts 里解析腾讯剧集地址的正则一致
  { prefix: 'https://v.qq.com/x/cover/', pattern: /\/x\/cover\/[0-9a-z]+\/[0-9a-z]+\.html/i, platform: Platform.TENCENT },
  // 爱奇艺主站短链：v_=视频页、w_/p_=片花、a_=专辑页，首页与频道页都不带这个形态
  { prefix: 'https://www.iqiyi.com/', pattern: /\/[vwpa]_[0-9a-z]+\.html/i, platform: Platform.IQIYI },
  // 爱奇艺国际站播放页：/play/<短链>
  { prefix: 'https://www.iq.com/', pattern: /\/play\/[0-9a-z]+/i, platform: Platform.IQIYI },
]

export interface ManualAddInfo {
  name: string
  platform: Platform
  params: Record<string, any>
}

export type ManualAddResult
  = | { ok: true, data: ManualAddInfo }
    | { ok: false, message: string }

/**
 * URL → 平台，popup 判断能否手动添加与内容脚本解析参数共用的唯一判据
 */
export function matchManualAddPlatform(url?: string): Platform | undefined {
  if (!url) {
    return undefined
  }

  return MANUAL_ADD_TARGETS.find(item => (
    url.includes(item.prefix) && item.pattern.test(getPathname(url))
  ))?.platform
}

function getPathname(url: string): string {
  try {
    return new URL(url).pathname
  }
  catch {
    return url
  }
}

function toVideoName(title: string): string {
  return title.split(' ')[0].split('_')[0]
}

function parseBilibili(url: string, title: string): ManualAddResult {
  const match = /\/(ep|ss)([^/?]*)[/?]?/.exec(url)
  const type = match?.[1]
  const id = match?.[2]

  if (!type || !id) {
    return { ok: false, message: '未能识别出视频资源！' }
  }

  return {
    ok: true,
    data: {
      name: toVideoName(title),
      platform: Platform.BILIBILI,
      params: type === 'ss' ? { season_id: id } : { ep_id: id },
    },
  }
}

function parseTencent(url: string, title: string): ManualAddResult {
  // 用 pathname 切分，避免 query（如 ?ptag=1）混进 vid
  const paths = getPathname(url).split('/').filter(Boolean)
  const cid = paths[paths.length - 2]
  const vid = paths[paths.length - 1]?.replace(/\.html$/i, '')

  if (!cid || !vid || paths.length < 4) {
    return { ok: false, message: '未能识别出视频资源！' }
  }

  return {
    ok: true,
    data: {
      name: toVideoName(title),
      platform: Platform.TENCENT,
      params: { cid, vid },
    },
  }
}

/**
 * 爱奇艺 tvid：属性 → 全量脚本文本 → 路径解码，必须运行在页面里
 */
function parseIqiyiVideoParams(): Record<string, any> | null {
  const readAttr = (...keys: string[]) => {
    for (const key of keys) {
      const el = document.querySelector<HTMLElement>(`[${key}]`)
      const value = el?.getAttribute(key)
      if (value) {
        return value
      }
    }
    return ''
  }

  const tvidFromAttr = readAttr('data-tvid', 'data-player-tvid', 'data-tv-id')
  const vidFromAttr = readAttr('data-vid', 'data-player-vid')
  const aidFromAttr = readAttr('data-aid', 'data-albumid', 'data-album-id')

  const scriptText = Array.from(document.scripts).map(item => item.textContent || '').join('\n')
  const html = document.documentElement.innerHTML
  const mergedText = `${scriptText}\n${html}`

  const tvidMatch
    = mergedText.match(/"tvId"\s*:\s*"?(\d{8,})"?/i)
      || mergedText.match(/"tvid"\s*:\s*"?(\d{8,})"?/i)
      || mergedText.match(/\\"tvId\\"\s*:\s*"?(\d{8,})"?/i)
      || mergedText.match(/\\"tvid\\"\s*:\s*"?(\d{8,})"?/i)
      || mergedText.match(/(?:^|\W)tvid\s*[:=]\s*["']?(\d{8,})["']?/i)

  const vidMatch
    = mergedText.match(/"vid"\s*:\s*"([a-zA-Z0-9]+)"/)
      || mergedText.match(/\\"vid\\"\s*:\s*\\"([a-zA-Z0-9]+)\\"/)

  const aidMatch
    = mergedText.match(/"albumId"\s*:\s*"?(\d{8,})"?/i)
      || mergedText.match(/"aid"\s*:\s*"?(\d{8,})"?/i)
      || mergedText.match(/\\"albumId\\"\s*:\s*"?(\d{8,})"?/i)
      || mergedText.match(/\\"aid\\"\s*:\s*"?(\d{8,})"?/i)

  const tvid = tvidFromAttr || tvidMatch?.[1] || extractTvidFromUrl(location.href)
  if (!tvid) {
    return null
  }

  return {
    tvid,
    vid: vidFromAttr || vidMatch?.[1] || '',
    aid: aidFromAttr || aidMatch?.[1] || '',
  }
}

/**
 * 只依赖 url / title：bilibili、腾讯可独立解析，爱奇艺只能退回路径解码（拿不到 aid）
 */
export function resolveManualAddFromUrl(url: string, title: string): ManualAddResult {
  const platform = matchManualAddPlatform(url)

  if (platform === Platform.BILIBILI) {
    return parseBilibili(url, title)
  }

  if (platform === Platform.TENCENT) {
    return parseTencent(url, title)
  }

  if (platform === Platform.IQIYI) {
    return resolveIqiyiFromUrl(url, title)
  }

  return { ok: false, message: '未能识别出视频资源！' }
}

function resolveIqiyiFromUrl(url: string, title: string): ManualAddResult {
  const tvid = extractTvidFromUrl(url)

  if (!tvid) {
    return { ok: false, message: '未能识别出爱奇艺视频参数！' }
  }

  return {
    ok: true,
    data: {
      name: toVideoName(title),
      platform: Platform.IQIYI,
      params: { tvid, vid: '', aid: '' },
    },
  }
}

/**
 * 只能在页面上下文（内容脚本）调用：爱奇艺需要读 DOM，其余平台等同「按 URL 解析」
 */
export function resolveManualAddFromDocument(): ManualAddResult {
  const platform = matchManualAddPlatform(location.href)

  if (platform === Platform.IQIYI) {
    const params = parseIqiyiVideoParams()

    if (!params) {
      return resolveIqiyiFromUrl(location.href, document.title)
    }

    return {
      ok: true,
      data: {
        name: toVideoName(document.title),
        platform,
        params,
      },
    }
  }

  return resolveManualAddFromUrl(location.href, document.title)
}
