/** element-plus 拖拽在顶层 window 上监听的事件，也是这里要转发的事件 */
type BridgeEvent = 'mousemove' | 'mouseup' | 'contextmenu'

/** 转发只需要坐标；鼠标事件另有按键信息，触摸没有 */
interface BridgePointer {
  clientX: number
  clientY: number
  button?: number
  buttons?: number
}

export function useIframeMouseBridge() {
  let iframeDoc: Document | null = null
  let uiRoot: Element | null = null
  /** 最近一次按下是否落在插件 UI 里：只转发插件自己的拖拽 */
  let pressed = false

  function forward(type: BridgeEvent, pointer: BridgePointer) {
    window.dispatchEvent(new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: pointer.clientX,
      clientY: pointer.clientY,
      button: pointer.button ?? 0,
      // 拖动中的 mousemove 保留按键位，收尾事件一律清零
      buttons: type === 'mousemove' ? (pointer.buttons ?? 1) : 0,
    }))
  }

  function arm(e: MouseEvent | TouchEvent) {
    pressed = !!uiRoot && e.composedPath().includes(uiRoot)
  }

  function onMouseDown(e: MouseEvent) {
    arm(e)
  }

  function onMouseMove(e: MouseEvent) {
    if (!pressed)
      return

    if (e.buttons === 0) {
      pressed = false
      forward('mouseup', e)
      return
    }

    forward('mousemove', e)
  }

  function onMouseUp(e: MouseEvent) {
    if (!pressed)
      return

    pressed = false
    forward('mouseup', e)
  }

  function onContextMenu(e: MouseEvent) {
    if (!pressed)
      return

    pressed = false
    forward('contextmenu', e)
  }

  /** touchmove 看 touches，touchend/touchcancel 时 touches 已空，只能看 changedTouches */
  function touchPointer(e: TouchEvent): BridgePointer {
    const touch = e.touches[0] ?? e.changedTouches[0]

    return { clientX: touch?.clientX ?? 0, clientY: touch?.clientY ?? 0 }
  }

  function onTouchStart(e: TouchEvent) {
    arm(e)
  }

  function onTouchMove(e: TouchEvent) {
    if (!pressed)
      return

    forward('mousemove', touchPointer(e))
  }

  function onTouchEnd(e: TouchEvent) {
    if (!pressed)
      return

    pressed = false
    forward('mouseup', touchPointer(e))
  }

  /** 进入 iframe 全屏后调用；重复调用只换一份监听 */
  function start(doc: Document, root: Element) {
    stop()

    iframeDoc = doc
    uiRoot = root

    iframeDoc.addEventListener('mousedown', onMouseDown, true)
    iframeDoc.addEventListener('mousemove', onMouseMove, true)
    iframeDoc.addEventListener('mouseup', onMouseUp, true)
    iframeDoc.addEventListener('contextmenu', onContextMenu, true)
    iframeDoc.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
    iframeDoc.addEventListener('touchmove', onTouchMove, { capture: true, passive: true })
    iframeDoc.addEventListener('touchend', onTouchEnd, { capture: true, passive: true })
    iframeDoc.addEventListener('touchcancel', onTouchEnd, { capture: true, passive: true })
  }

  function stop() {
    pressed = false

    if (iframeDoc) {
      iframeDoc.removeEventListener('mousedown', onMouseDown, true)
      iframeDoc.removeEventListener('mousemove', onMouseMove, true)
      iframeDoc.removeEventListener('mouseup', onMouseUp, true)
      iframeDoc.removeEventListener('contextmenu', onContextMenu, true)
      iframeDoc.removeEventListener('touchstart', onTouchStart, true)
      iframeDoc.removeEventListener('touchmove', onTouchMove, true)
      iframeDoc.removeEventListener('touchend', onTouchEnd, true)
      iframeDoc.removeEventListener('touchcancel', onTouchEnd, true)
    }

    iframeDoc = null
    uiRoot = null
  }

  return {
    start,
    stop,
  }
}
