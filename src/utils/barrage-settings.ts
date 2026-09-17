import type { Barrage } from '@/service'

import { BarrageMode, Platform } from '@/service'

export interface DisplayBarrage extends Barrage {
  lane: number
}

export interface BarragePlaybackSettings {
  speed: number
  displayArea: number
  density: number
  fontSize: number
  /** 弹幕不透明度，百分比（10 ~ 100） */
  opacity: number
}

export const DEFAULT_BARRAGE_SETTINGS: BarragePlaybackSettings = {
  speed: 1,
  displayArea: 25,
  density: 60,
  fontSize: 16,
  // 沿用引入该设置项之前的硬编码值，老用户观感不变
  opacity: 85,
}

/** 参考 Bilibili：不透明度最低 10%，不允许拖到全透明 */
export const MIN_BARRAGE_OPACITY = 10

export const BASE_BARRAGE_SPEED = 144

export function getBarrageLineHeight(fontSize: number) {
  return Math.max(24, Math.ceil(fontSize * 1.5))
}

interface DensityProfile {
  minWeight: number
  denseMinWeight: number
  minContentLength: number
  scrollPerSecond: number
  specialPerSecond: number
  scrollInterval: number
  specialInterval: number
  maxSameTimestamp: number
}

// 各平台的弹幕量级、权重口径并不相同。这里以原先 1/4 屏高度下的
// 过滤效果为“标准”密度，再分别控制每秒进入碰撞检测的候选数量。
const DENSITY_PROFILES: Record<Platform, DensityProfile> = {
  [Platform.BILIBILI]: {
    minWeight: 2,
    denseMinWeight: 1,
    minContentLength: 2,
    scrollPerSecond: 7,
    specialPerSecond: 2,
    scrollInterval: 150,
    specialInterval: 500,
    maxSameTimestamp: 1,
  },
  [Platform.TENCENT]: {
    minWeight: 50,
    denseMinWeight: 20,
    minContentLength: 2,
    scrollPerSecond: 4,
    specialPerSecond: 2,
    scrollInterval: 220,
    specialInterval: 500,
    maxSameTimestamp: 3,
  },
  [Platform.IQIYI]: {
    minWeight: 1,
    denseMinWeight: 0,
    minContentLength: 2,
    scrollPerSecond: 3,
    specialPerSecond: 2,
    scrollInterval: 260,
    specialInterval: 600,
    maxSameTimestamp: 3,
  },
}

interface LaneComment {
  time: number
  width: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function normalizeBarrageSettings(
  value?: (Partial<BarragePlaybackSettings> & { rows?: number }) | null,
): BarragePlaybackSettings {
  const legacyArea = value?.rows ? value.rows / 24 * 100 : DEFAULT_BARRAGE_SETTINGS.displayArea
  const requestedArea = Number(value?.displayArea) || legacyArea
  const displayArea = [25, 50, 75, 100].reduce((closest, candidate) => {
    return Math.abs(candidate - requestedArea) < Math.abs(closest - requestedArea) ? candidate : closest
  }, DEFAULT_BARRAGE_SETTINGS.displayArea)

  return {
    speed: clamp(Number(value?.speed) || DEFAULT_BARRAGE_SETTINGS.speed, 0.5, 2),
    displayArea,
    density: Math.round(clamp(Number(value?.density) || DEFAULT_BARRAGE_SETTINGS.density, 20, 100)),
    fontSize: Math.round(clamp(Number(value?.fontSize) || DEFAULT_BARRAGE_SETTINGS.fontSize, 12, 32)),
    opacity: Math.round(clamp(Number(value?.opacity) || DEFAULT_BARRAGE_SETTINGS.opacity, MIN_BARRAGE_OPACITY, 100)),
  }
}

function getMinimumWeight(profile: DensityProfile, density: number) {
  if (density >= 100)
    return Number.NEGATIVE_INFINITY

  if (density <= DEFAULT_BARRAGE_SETTINGS.density)
    return profile.minWeight

  const progress = (density - DEFAULT_BARRAGE_SETTINGS.density)
    / (100 - DEFAULT_BARRAGE_SETTINGS.density)
  return profile.minWeight - (profile.minWeight - profile.denseMinWeight) * progress
}

export function estimateBarrageWidth(content: string, fontSize: number) {
  const scale = fontSize / DEFAULT_BARRAGE_SETTINGS.fontSize
  let width = 20 * scale

  for (const char of Array.from(content)) {
    const code = char.codePointAt(0) ?? 0
    const isWide = code > 0x2E7F || char === '[' || char === ']'
    width += (isWide ? 17 : 9) * scale
  }

  // 留出余量，避免字体、表情图片和宿主页面缩放带来的估算误差。
  return Math.max(48, Math.ceil(width * 1.15))
}

function willCollide(previous: LaneComment, current: LaneComment, stageWidth: number, duration: number) {
  const elapsed = current.time - previous.time
  if (elapsed <= 0)
    return true

  const previousElapsed = (stageWidth + previous.width) * elapsed / duration
  if (previous.width > previousElapsed)
    return true

  const previousLeftTime = duration - elapsed
  const currentArrivalTime = duration * stageWidth / (stageWidth + current.width)
  return previousLeftTime > currentArrivalTime
}

function getDensityScale(density: number) {
  return (density / 100) ** 1.5
}

function getDensityLimit(base: number, density: number, areaScale = 1) {
  const defaultScale = getDensityScale(DEFAULT_BARRAGE_SETTINGS.density)
  return Math.max(1, Math.round(base * getDensityScale(density) / defaultScale * areaScale))
}

function getDensityInterval(base: number, density: number, areaScale = 1) {
  const defaultScale = getDensityScale(DEFAULT_BARRAGE_SETTINGS.density)
  return base * defaultScale / getDensityScale(density) / areaScale
}

function sampleEvenly(items: Barrage[], density: number) {
  if (density >= 100)
    return items

  const ratio = density / 100
  let accumulator = 0

  return items.filter(() => {
    accumulator += ratio
    if (accumulator < 1)
      return false

    accumulator -= 1
    return true
  })
}

function limitSpecialBarrages(items: Barrage[], profile: DensityProfile, density: number) {
  if (density >= 100)
    return items

  const perSecondLimit = getDensityLimit(profile.specialPerSecond, density)
  const minInterval = getDensityInterval(profile.specialInterval, density)
  const secondCounts = new Map<string, number>()
  const lastOffset = new Map<'top' | 'bottom', number>()

  return items.filter((item) => {
    const mode = item.mode === BarrageMode.TOP ? 'top' : 'bottom'
    const key = `${mode}:${Math.floor(item.offset / 1000)}`
    const count = secondCounts.get(key) ?? 0
    const previousOffset = lastOffset.get(mode)

    if (count >= perSecondLimit || (previousOffset !== undefined && item.offset - previousOffset < minInterval))
      return false

    secondCounts.set(key, count + 1)
    lastOffset.set(mode, item.offset)
    return true
  })
}

function selectNonOverlappingScrollBarrages(
  items: Barrage[],
  profile: DensityProfile,
  settings: BarragePlaybackSettings,
  stageWidth: number,
  stageHeight: number,
) {
  const areaScale = settings.displayArea / DEFAULT_BARRAGE_SETTINGS.displayArea
  const lineHeight = getBarrageLineHeight(settings.fontSize)
  const laneCount = Math.max(1, Math.ceil((stageHeight - lineHeight) / lineHeight))
  const isUnlimited = settings.density >= 100
  const perSecondLimit = isUnlimited
    ? Number.POSITIVE_INFINITY
    : getDensityLimit(profile.scrollPerSecond, settings.density, areaScale)
  const minInterval = isUnlimited
    ? 0
    : getDensityInterval(profile.scrollInterval, settings.density, areaScale)
  const sameTimestampLimit = isUnlimited
    ? laneCount
    : Math.max(
        1,
        Math.round(
          profile.maxSameTimestamp
          * getDensityScale(settings.density)
          / getDensityScale(DEFAULT_BARRAGE_SETTINGS.density),
        ),
      )
  const secondCounts = new Map<number, number>()
  const timestampCounts = new Map<number, number>()
  const lanes: Array<LaneComment | null> = Array.from({ length: laneCount }, () => null)
  const duration = stageWidth / (BASE_BARRAGE_SPEED * settings.speed)
  const result: DisplayBarrage[] = []
  let nextLane = 0
  let lastAcceptedOffset = Number.NEGATIVE_INFINITY

  for (const item of items) {
    const second = Math.floor(item.offset / 1000)
    const secondCount = secondCounts.get(second) ?? 0
    const timestampCount = timestampCounts.get(item.offset) ?? 0

    if (secondCount >= perSecondLimit || timestampCount >= sameTimestampLimit)
      continue

    // 同一时间点允许按平台配置形成小批次，时间点之间则保持最小间隔。
    if (timestampCount === 0 && item.offset - lastAcceptedOffset < minInterval)
      continue

    const current = {
      time: item.offset / 1000,
      width: estimateBarrageWidth(item.content, settings.fontSize),
    }
    let laneIndex = -1
    for (let step = 0; step < laneCount; step++) {
      const candidateLane = (nextLane + step) % laneCount
      const previous = lanes[candidateLane]

      if (!previous || !willCollide(previous, current, stageWidth, duration)) {
        laneIndex = candidateLane
        break
      }
    }

    // 没有安全轨道时直接丢弃，避免同一轨道中的弹幕发生重叠。
    if (laneIndex < 0)
      continue

    lanes[laneIndex] = current
    nextLane = (laneIndex + 1) % laneCount
    secondCounts.set(second, secondCount + 1)
    timestampCounts.set(item.offset, timestampCount + 1)
    lastAcceptedOffset = item.offset
    result.push({ ...item, lane: laneIndex })
  }

  return result
}

export function filterBarragesForDisplay(
  barrages: Barrage[] | undefined,
  platform: Platform,
  settings: BarragePlaybackSettings,
  stageWidth: number,
  stageHeight: number,
): [DisplayBarrage[], Barrage[]] {
  if (!barrages?.length)
    return [[], []]

  const profile = DENSITY_PROFILES[platform] ?? DENSITY_PROFILES[Platform.BILIBILI]
  const scroll: Barrage[] = []
  const special: Barrage[] = []
  const normalizedSettings = normalizeBarrageSettings(settings)
  const minimumWeight = getMinimumWeight(profile, normalizedSettings.density)
  const minimumContentLength = normalizedSettings.density >= 100 ? 1 : profile.minContentLength

  const sorted = [...barrages].sort((previous, next) => {
    if (previous.offset !== next.offset)
      return previous.offset - next.offset

    return next.weight - previous.weight
  })

  for (const item of sorted) {
    if (item.content.length < minimumContentLength || item.weight < minimumWeight)
      continue

    if (item.mode === BarrageMode.TOP || item.mode === BarrageMode.BOTTOM)
      special.push(item)
    else
      scroll.push(item)
  }

  const safeStageWidth = Math.max(320, stageWidth)
  const sampledScroll = sampleEvenly(scroll, normalizedSettings.density)
  const sampledSpecial = sampleEvenly(special, normalizedSettings.density)

  return [
    selectNonOverlappingScrollBarrages(
      sampledScroll,
      profile,
      normalizedSettings,
      safeStageWidth,
      Math.max(getBarrageLineHeight(normalizedSettings.fontSize) + 1, stageHeight),
    ),
    limitSpecialBarrages(sampledSpecial, profile, normalizedSettings.density),
  ]
}
