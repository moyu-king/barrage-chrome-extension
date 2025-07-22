export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  delay = 250,
): (...args: Parameters<T>) => void {
  let lastTime = 0
  let timer: number | null = null

  return (...args: Parameters<T>) => {
    const now = Date.now()

    if (timer) {
      clearTimeout(timer)
      timer = null
    }

    if (now - lastTime < delay) {
      timer = setTimeout(() => {
        lastTime = now
        fn(...args)
      }, delay - (now - lastTime))
    }
    else {
      lastTime = now
      fn(...args)
    }
  }
}

export function debounce(fun: (...args: any[]) => any, wait = 250) {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return () => {
    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(() => {
      fun()
    }, wait)
  }
}
