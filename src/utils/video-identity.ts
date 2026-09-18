import { Platform } from '@/service'

/** 能提供判重身份的最小结构，`Video` 与 `SearchResult` 都满足 */
export interface VideoIdentitySource {
  platform: Platform
  params?: Record<string, any>
}

/**
 * 各平台可用于判定「同一个视频」的参数键。
 *
 * 键是「候选」而不是「必须」：同一个视频经搜索添加与经播放页手动添加后，落库的
 * params 形状并不一致（爱奇艺的键按需出现、vid/aid 可能是空串，B 站手动添加写
 * ep_id 而搜索写 season_id），所以只取交集、不比相等。
 */
const PLATFORM_ID_KEYS: Record<Platform, readonly string[]> = {
  [Platform.TENCENT]: ['cid', 'vid'],
  [Platform.BILIBILI]: ['season_id', 'ep_id'],
  [Platform.IQIYI]: ['aid', 'tvid'],
}

/**
 * 归一化单个 id：只认字符串与数字，去掉空白。
 *
 * `'0'` 一并丢弃是防御性的：拿不到真实 id 时宁可漏判重复，也不能让两条无关的
 * 视频靠同一个垃圾值命中。
 */
function toToken(platform: Platform, value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number')
    return null

  const id = String(value).trim()
  if (!id || id === '0')
    return null

  // 带上平台：腾讯的 vid 与爱奇艺的 vid 不是一个命名空间，数字 id 也可能跨平台撞车
  return `${platform}:${id}`
}

/**
 * 取一个视频的身份令牌集合。平台未知或参数缺失时返回空集——空集与任何集合都
 * 不相交，调用方因此放行，这正是拿不到数据时该有的方向。
 */
export function getVideoIdentity(platform: Platform, params?: Record<string, any>): Set<string> {
  const tokens = new Set<string>()
  const keys = PLATFORM_ID_KEYS[platform]

  if (!keys)
    return tokens

  for (const key of keys) {
    const token = toToken(platform, params?.[key])

    if (token)
      tokens.add(token)
  }

  return tokens
}

/** 列表里全部视频的身份令牌并集，用来和待添加项求交集 */
export function buildVideoIdentityIndex(videos: readonly VideoIdentitySource[]): Set<string> {
  const index = new Set<string>()

  for (const video of videos) {
    for (const token of getVideoIdentity(video.platform, video.params))
      index.add(token)
  }

  return index
}

/**
 * 两个身份集合是否有交集。这里必须是「交集」而不是「相等」：若改成算一个规范
 * key 再比相等，两个都解不出 id 的视频会因为 `'' === ''` 互相命中，把所有按钮
 * 一起禁掉。
 */
export function hasIdentityOverlap(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  for (const token of b) {
    if (a.has(token))
      return true
  }

  return false
}
