import * as React from "react"

const MOBILE_BREAKPOINT = 768
const LARGE_SCREEN_BREAKPOINT = 1280 // xl

export function useIsMobile() {
  // Undefined on the server and during hydration so SSR/client markup match;
  // the real value is read from matchMedia after mount.
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => setIsMobile(mql.matches)
    queueMicrotask(onChange)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

export function useIsLargeScreen() {
  const [isLarge, setIsLarge] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${LARGE_SCREEN_BREAKPOINT}px)`)
    const onChange = () => setIsLarge(mql.matches)
    queueMicrotask(onChange)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isLarge
}
