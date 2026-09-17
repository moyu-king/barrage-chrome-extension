/**
 * iframe 全屏下的鼠标事件桥。
 *
 * 全屏元素是同源 iframe 时 #crx-root（含设置面板与面板里的滑块）会被搬进 iframe 的 body，
 * 但 Vue 应用的 JS 域仍在顶层窗口。element-plus 的滑块拖拽在 use-slider-button 的
 * onButtonDown 里直接 `window.addEventListener('mousemove' | 'mouseup' | 'contextmenu')`，
 * 那个 window 是顶层窗口，而按下时走的 mousedown 是元素上的（发生在 iframe 里）。
 * 于是监听装在了顶层窗口、iframe 里的 mousemove/mouseup 永远送不过去：拖动没反应；
 * 更糟的是 onDragEnd 不执行，initData.dragging 卡在 true，会让 handleSliderPointerEvent
 * 提前 return，之后连点轨道都失效。
 *
 * 不改 element-plus，只在这里兜一层：旁听 iframe 文档上的鼠标/触摸事件，原样重投到顶层
 * window，让那些装错窗口的监听能收到。与 useDraggableRail 里 `el.ownerDocument.defaultView`
 * 是同一个问题的两种解法 —— 那边能自己挑窗口，这边挑不了（element-plus 写死在 window 上），
 * 只能反过来把事件送过去。
 */

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
    // 投给顶层 window 而不是顶层 document：派发到 window 的传播路径只有 window 一层
    // （AT_TARGET），宿主页挂在 document 上的监听不会被顺带打起来；反过来派发到 document
    // 会连它一起打。代价是宿主页挂在 window 上的 mousemove 也会收到，所以下面只在
    // 「按在插件 UI 里」的这段时间转发。
    //
    // 坐标必须原样带过去：element-plus 拿 event.clientX 减去 iframe 里那个滑块的
    // getBoundingClientRect()，两边同属 iframe 视口坐标系。换算成顶层坐标反而是错的，
    // 而且真全屏下 iframe 铺满屏幕、两种坐标恰好接近，写错了也不容易发现。
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

  /**
   * 命中判定只能用 composedPath：UI 在 crx-content 的开放 shadow root 里，
   * document 上的监听拿到的 event.target 已被重定向成宿主元素 crx-content，
   * 只有 composedPath 里还留着 shadow root 之外的 #crx-root。
   * 每次按下都重新赋值而不是置位：视频在 #crx-root 之外（弹幕容器 pointer-events: none，
   * 按下去命中的是 <video>），要能立刻解除武装。
   */
  function arm(e: MouseEvent | TouchEvent) {
    pressed = !!uiRoot && e.composedPath().includes(uiRoot)
  }

  function onMouseDown(e: MouseEvent) {
    arm(e)
  }

  function onMouseMove(e: MouseEvent) {
    if (!pressed)
      return

    // 把指针拖出浏览器窗口再松手时，iframe 收不到那一次 mouseup。此后如果还按过期的
    // startX 转发 mousemove，element-plus 会把滑块直接甩到指针位置。buttons 为 0 就是
    // 那次丢掉的松手，补投一次 mouseup 收尾，顺带解开卡住的 initData.dragging
    // （否则轨道会一直点不动）。
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

  /**
   * 触摸也走同一条路，但重投成鼠标事件：element-plus 的 onDragging / onDragEnd 本来就
   * 同时注册在 mousemove / mouseup 上，而 getClientXY 只在 type 以 touch 开头时才去掏
   * event.touches[0]（空列表会直接抛异常），投成 mousemove 省事又不用构造 Touch 对象。
   *
   * touchstart 必须自己收：滑块把手上 element-plus 注册的 touchstart 是 passive: false
   * 且会 preventDefault，兼容鼠标事件被一并取消，光靠 mousedown 武装不起来；而触摸结束
   * 也不会有 mouseup，滑块会永久卡死。
   */
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

    // 一律用捕获阶段：只是旁听，不能被 iframe 里页面自己的 stopPropagation 挡掉。
    // 触摸还要 passive，同样只是旁听，绝不能挡住 iframe 里页面的滚动。
    iframeDoc.addEventListener('mousedown', onMouseDown, true)
    iframeDoc.addEventListener('mousemove', onMouseMove, true)
    iframeDoc.addEventListener('mouseup', onMouseUp, true)
    iframeDoc.addEventListener('contextmenu', onContextMenu, true)
    iframeDoc.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
    iframeDoc.addEventListener('touchmove', onTouchMove, { capture: true, passive: true })
    iframeDoc.addEventListener('touchend', onTouchEnd, { capture: true, passive: true })
    iframeDoc.addEventListener('touchcancel', onTouchEnd, { capture: true, passive: true })
  }

  /** 退出全屏、全屏处理器里的各个早退分支、组件卸载都要走这里 */
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
