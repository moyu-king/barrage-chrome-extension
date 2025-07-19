import type { MaybeRefOrGetter } from 'vue'

import { toValue } from 'vue'

function throttle<T extends (...args: any[]) => void>(
  fn: T,
  delay = 300,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null

  return function (...args: Parameters<T>) {
    if (timer) {
      return
    }

    timer = setTimeout(() => {
      fn(...args)
      timer = null
    }, delay)
  }
}

export function useCatchMoveMouse(delay = 3000) {
  let timeout: ReturnType<typeof setTimeout> | undefined

  const listenEl = ref<HTMLElement | Element | null>()
  const isMoving = ref(false)
  const throttleHandler = throttle(catchMouse, 300)

  function start(wrapper: MaybeRefOrGetter<HTMLElement | Element | undefined>) {
    if (listenEl.value) {
      close()
    }

    listenEl.value = toValue(wrapper)
    listenEl.value?.addEventListener('mousemove', throttleHandler)
  }

  function close() {
    listenEl.value?.removeEventListener('mousemove', throttleHandler)
    listenEl.value = null
    timeout && clearTimeout(timeout)
  }

  function catchMouse() {
    isMoving.value = true
    timeout && clearTimeout(timeout)

    timeout = setTimeout(() => {
      isMoving.value = false
    }, delay)
  }

  return {
    isMoving,
    start,
    close,
  }
}
