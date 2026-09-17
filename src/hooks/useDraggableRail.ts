import type { Ref } from 'vue'

/** 位移超过该阈值才算拖拽，否则按点击处理 */
const DRAG_THRESHOLD = 5

interface DragState {
  pointerId: number
  startX: number
  startY: number
  /** 抓取点在悬浮条内的偏移，越过阈值时才量取（见 onPointerMove 注释） */
  grabX: number
  grabY: number
  moved: boolean
}

interface UseDraggableRailOptions {
  /** 被拖动的悬浮条，同时也是拖拽把手：按住它任意位置都能拖 */
  rail: Ref<HTMLElement | null>
  /**
   * 命中该选择器的后代不触发拖拽。面板是悬浮条的子元素，
   * 在里面按下（滚剧集列表、拖滑块）不该被当成拖拽。
   */
  ignore?: string
  /** 松手时回调，坐标为悬浮条左上角在视口中的位置 */
  onDrop: (pos: { x: number, y: number }) => void
}

/**
 * 悬浮条拖拽：整个条都是把手，图标按钮仍可正常点击。
 *
 * 监听挂 window 而不给悬浮条 setPointerCapture：指针捕获会把后续指针事件的目标
 * 重定向到捕获元素，click 的事件目标因此变成悬浮条本身，三个图标按钮就再也收不到
 * 点击了（图标是悬浮条的后代，不是兄弟节点）。挂 window 因此也要自己收尾。
 */
export function useDraggableRail(options: UseDraggableRailOptions) {
  const { rail, ignore, onDrop } = options

  const isDragging = ref(false)
  const dragPos = reactive({ x: 0, y: 0 })

  let drag: DragState | null = null
  let listenWin: Window | null = null
  /** 拖拽结束时产生的那次 click 要吞掉；每次 pointerdown 重置，见 onPointerUp */
  let clickGuard = false

  /**
   * 取悬浮条所在文档的视口高度：全屏时 #crx-root 会被搬进 iframe，window 未必是它；
   * 而且 window.innerHeight 含滚动条，与 position: fixed / clientY 的坐标系不符。
   */
  function viewportHeight() {
    const doc = rail.value?.ownerDocument

    return doc?.documentElement.clientHeight ?? window.innerHeight
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || !e.isPrimary || drag)
      return

    if (ignore && (e.target as Element | null)?.closest(ignore))
      return

    const el = rail.value

    if (!el)
      return

    clickGuard = false
    drag = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      grabX: 0,
      grabY: 0,
      moved: false,
    }

    listenWin = el.ownerDocument.defaultView ?? window
    listenWin.addEventListener('pointermove', onPointerMove)
    listenWin.addEventListener('pointerup', onPointerUp)
    listenWin.addEventListener('pointercancel', onPointerCancel)
    listenWin.addEventListener('blur', onWindowBlur) // 切走窗口时补收尾

    // 阻止拖拽时选中宿主页面的文字：.crx-content 上的 user-select: none 拦不住
    // 浏览器向上找最近的可选祖先。click 不是 compatibility mouse event，
    // 不会被 preventDefault 一并取消，所以图标按钮的 @click 仍然有效。
    e.preventDefault()
  }

  function onPointerMove(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.pointerId)
      return

    const el = rail.value

    if (!el)
      return

    if (!drag.moved) {
      if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < DRAG_THRESHOLD)
        return

      // 必须等到这时才量位置：悬浮条平时处于收起态，按下瞬间多半还在 :hover 的
      // left 过渡中途，提前量到的是旧坐标。
      // 抓取偏移取自 rect，所以下面的 clientX - grabX 正好还原 rect.left，起步不会跳变。
      const rect = el.getBoundingClientRect()
      drag.grabX = e.clientX - rect.left
      drag.grabY = e.clientY - rect.top
      drag.moved = true
      isDragging.value = true // 与下面的 dragPos 同一次刷新，不会闪一帧 0,0
    }

    // 横向不钳制：悬浮条收起时有一截在视口外，硬把它拽回屏幕内会让起步跳一整段
    // 收起距离。而横向位置本来就不持久化（只存左/右停靠方向），松手必定吸附到边缘，
    // 所以拖拽中途甩出视口也无所谓。
    dragPos.x = e.clientX - drag.grabX
    // 纵向要钳制：高度会被持久化，拖出视口再吸附回来会跳一下；钳制表现为「顶到边就停」
    dragPos.y = Math.min(
      Math.max(e.clientY - drag.grabY, 0),
      Math.max(0, viewportHeight() - el.offsetHeight),
    )
  }

  function onPointerUp(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.pointerId)
      return

    const { moved } = drag
    endDrag()

    if (!moved)
      return // 普通点击，交给原生的 click

    clickGuard = true
    onDrop({ x: dragPos.x, y: dragPos.y })
  }

  /** 只回滚不吸附：清掉 isDragging 后内联定位消失，悬浮条自己回到上一次的停靠位置 */
  function onPointerCancel(e: PointerEvent) {
    if (drag && e.pointerId === drag.pointerId)
      endDrag()
  }

  function onWindowBlur() {
    endDrag()
  }

  /**
   * 吞掉拖拽结束那一次 click，必须绑成捕获阶段（`@click.capture`）：
   * 在悬浮条上拦下来，才能挡住下面图标按钮和气泡自己的点击处理。
   */
  function onClickCapture(e: MouseEvent) {
    if (!clickGuard)
      return

    clickGuard = false
    e.stopPropagation()
    e.preventDefault()
  }

  function endDrag() {
    if (!drag)
      return

    drag = null
    isDragging.value = false

    if (listenWin) {
      listenWin.removeEventListener('pointermove', onPointerMove)
      listenWin.removeEventListener('pointerup', onPointerUp)
      listenWin.removeEventListener('pointercancel', onPointerCancel)
      listenWin.removeEventListener('blur', onWindowBlur)
      listenWin = null
    }
  }

  return {
    isDragging,
    dragPos,
    onPointerDown,
    onClickCapture,
    stop: endDrag,
  }
}
