function stopVideos() {
  const videos = document?.querySelectorAll?.("video")
  videos?.forEach?.((video) => {
    // console.log("& video paused")
    video.pause()
  })
}

function startVideos() {
  const videos = document?.querySelectorAll?.("video")
  videos?.forEach?.((video) => video.paused && video.play())
}

function isEventFromPopup(e: Event) {
  const popupComponent = document?.getElementById?.("extensionPopupComponent")
  const path = e?.composedPath?.() || []

  let includesPopupComponent = false

  path.forEach((item) => {
    if (item === popupComponent) {
      includesPopupComponent = true
      return
    }
  })

  return includesPopupComponent
}

function preventDefault(e: any) {
  if (isEventFromPopup(e)) return
  e.preventDefault()
  e.stopPropagation()
}

function enableScroll() {
  const body = document?.getElementsByTagName("body")?.[0]
  if (!body) {
    setTimeout(() => {
      enableScroll()
    }, 100)
    return
  }
  body.removeEventListener("wheel", preventDefault)
  body.removeEventListener("touchmove", preventDefault)
  body.removeEventListener("keydown", preventDefault)
}

function disableScroll() {
  const body = document?.getElementsByTagName("body")?.[0]
  if (!body) {
    setTimeout(() => {
      disableScroll()
    }, 100)
    return
  }
  body.addEventListener("wheel", preventDefault, { passive: false })
  body.addEventListener("touchmove", preventDefault, { passive: false })
  body.addEventListener("keydown", preventDefault, { passive: false })
}

export function freezeWebPage() {
  if (document?.visibilityState !== "visible") return
  disableScroll()
  stopVideos()
}

export function unfreezeWebPage() {
  if (document?.visibilityState !== "visible") return
  enableScroll()
  startVideos()
}
