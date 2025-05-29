declare module 'danmaku' {
  interface DanmakuItem {
    text: string
    color?: string
    size?: string | number
    mode?: 'scroll' | 'top' | 'bottom'
    time: number
    [key: string]: any
  }

  interface DanmakuOptions {
    container: HTMLElement
    media?: HTMLMediaElement
    comments?: DanmakuItem[]
    engine?: 'canvas' | 'dom'
    speed?: number
    area?: number
    fontSize?: number
    lineHeight?: number
    mode?: 'scroll' | 'top' | 'bottom'
    direction?: 'ltr' | 'rtl'
    visible?: boolean
    unlimited?: boolean
    duration?: number
    useWorker?: boolean
    onDraw?: (comment: DanmakuItem) => void
    onHide?: (comment: DanmakuItem) => void
  }

  export default class Danmaku {
    speed: number
    comments: DanmakuItem[]
    engine: 'canvas' | 'dom'

    constructor(options: DanmakuOptions)

    clear(): void
    emit(comment: DanmakuItem): void
    show(): void
    hide(): void
    resize(): void
    destroy(): void

    readonly comments: DanmakuItem[]
  }
}