declare module 'danmaku' {
  interface DanmakuItem {
    text?: string
    time: number
    style?: Record<string, string>
    mode?: string
    render?: () => HTMLElement | HTMLCanvasElement
  }

  interface DanmakuOptions {
    container: HTMLElement
    comments: DanmakuItem[]
    media?: HTMLMediaElement
    engine?: 'canvas' | 'dom'
    speed?: number
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
  }
}
