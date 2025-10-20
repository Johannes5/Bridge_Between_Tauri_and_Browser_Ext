import { createRoot } from "react-dom/client"

import { DISLIKE_RATIO, PROGRESS_BAR } from "~/constants/components.constants"
import { IAdvancedOptions } from "~/types/advanced-options.types"
import { TLimitType } from "~/types/limits.types"
import advancedOptionsRequests from "~/utils/api/requests/advanced-options.requests"
import {
  getExcuseWithLowestCountdownRemnant,
  getLimitTimeLeft
} from "~/utils/excuses.utils"
import { getLimitWithLowestCountdownRemnant } from "~/utils/limit-countdown.utils"
import { getAdvancedOptions } from "~/utils/storage/advanced-options-storage.utils"
import { doesLimitUrlMatchCurrentUrl } from "~/utils/url.utils"

function isInYoutube() {
  const currentUrl = window.location.href
  return (
    currentUrl.startsWith("youtube.com") ||
    currentUrl.startsWith("www.youtube.com") ||
    currentUrl.startsWith("https://youtube.com") ||
    currentUrl.startsWith("https://www.youtube.com") ||
    currentUrl.startsWith("http://youtube.com") ||
    currentUrl.startsWith("http://www.youtube.com")
  )
}

export async function applyAdvancedOptions() {
  // return;
  if (!isInYoutube()) return
  const advancedOptions: IAdvancedOptions = await getAdvancedOptions()

  // console.log("APPLY ADVANCED OPTIONS - ", advancedOptions)

  hideYoutubeCommentSection(advancedOptions.hideYoutubeCommentSection)
  hideRelatedVideos(advancedOptions.hideRelatedVideos)
  hideShortsOnHomepage(advancedOptions.hideShortsOnHomepage)
  hideGovtPrescNews(advancedOptions.hideGovtPrescNews)
  hideHomeButton(
    advancedOptions.hideHomeButton,
    advancedOptions.hideOtherHomeButton
  )
  hideShortsButton(advancedOptions.hideShortsButton)
  await showProgressBar(advancedOptions.showProgressBar)
  await showDislikeRatio(advancedOptions.showDislikeRatio)
}

function hideYoutubeCommentSection(hide: boolean) {
  const commentSection = document.getElementById("comments")
  if (commentSection) commentSection.style["display"] = hide ? "none" : "block"
}

function hideRelatedVideos(hide: boolean) {
  const relatedSection = document.getElementById("related")
  if (relatedSection) relatedSection.style["display"] = hide ? "none" : "block"
}

function hideShortsOnHomepage(hide: boolean) {
  const shortsLinks = document.querySelectorAll('a[href^="/shorts/"]')
  // if (window.location.href.includes("youtube.com/feed/history")) return

  if (!doesLimitUrlMatchCurrentUrl("youtube.com/", "url" as TLimitType)) return

  shortsLinks.forEach((shortsLink) => {
    if (shortsLink) {
      const shortsContainer =
        shortsLink?.parentElement?.parentElement?.parentElement?.parentElement
          ?.parentElement?.parentElement?.parentElement

      if (!shortsContainer) return

      shortsContainer.style["display"] = hide ? "none" : ""
      shortsContainer.style["visibility"] = hide ? "hidden" : "visible"
    }
  })
}

function hideGovtPrescNews(hide: boolean) {
  const titles = document.querySelectorAll("title")
  titles.forEach((title) => {
    if (title.innerHTML?.toLowerCase() === "breaking news") {
      const contentParent =
        title?.parentElement?.parentElement?.parentElement?.parentElement
          ?.parentElement?.parentElement?.parentElement?.parentElement
      if (contentParent)
        contentParent.style["display"] = hide ? "none" : "block"
    }
  })
}

function hideHomeButton(hide: boolean, hideOther: boolean) {
  const defaultStyle = `transition: width 0.3s ease; overflow: hidden; width: 100%; display: flex; padding: 0;`
  const hideStyle = `display: none !important; visibility: hidden !important;`

  // Hide home button
  const youtubeLogos = document.querySelectorAll("ytd-topbar-logo-renderer")
  youtubeLogos.forEach((youtubeLogo) => {
    youtubeLogo?.setAttribute("style", hide ? hideStyle : defaultStyle)
  })

  // Hide other home button
  const links = document.querySelectorAll("a")
  links.forEach((link) => {
    if (
      link.getAttribute?.("title")?.toLowerCase() === "home" &&
      link.getAttribute?.("href") === "/"
    ) {
      const linkParent = link?.parentElement
      if (linkParent) {
        linkParent.setAttribute("style", hideOther ? hideStyle : defaultStyle)
      }
    }
  })
}

function hideShortsButton(hide: boolean) {
  const defaultStyle = `transition: width 0.3s ease; overflow: hidden; width: 100%; display: flex; padding: 0;`
  const hideStyle = `display: none !important; visibility: hidden !important;`
  // Hide other home button
  const links = document.querySelectorAll("a")
  links.forEach((link) => {
    if (link.getAttribute?.("title")?.toLowerCase() === "shorts") {
      const linkParent = link?.parentElement
      if (linkParent) {
        linkParent.setAttribute("style", hide ? hideStyle : defaultStyle)
      }
    }
  })
}

export async function showProgressBar(show: boolean) {
  // return
  // if (hideHomeButton) return
  const youtubeLogo = document.querySelector("ytd-topbar-logo-renderer#logo")
  const prevAddedReplacementDiv = document.querySelector("#replacementDiv")

  if (youtubeLogo || prevAddedReplacementDiv) {
    // Create replacement div if it doesn't exist
    let replacementDiv = prevAddedReplacementDiv as HTMLDivElement
    if (!replacementDiv) {
      replacementDiv = document.createElement("div")
      replacementDiv.id = "replacementDiv"
      replacementDiv.setAttribute(
        "style",
        `
          font-weight: bold;
          text-align: center;
          padding-bottom: 10px;
          transition: width 0.3s ease;
          overflow: hidden;
        `
      )
      replacementDiv.classList.add(
        "title",
        "style-scope",
        "ytd-mini-guide-entry-renderer"
      )
      youtubeLogo?.parentElement?.appendChild(replacementDiv)
    }

    // Set initial styles for both elements
    if (youtubeLogo) {
      youtubeLogo.setAttribute(
        "style",
        `
          transition: width 0.3s ease;
          overflow: hidden;
          width: ${show ? "0" : "100%"};
          display: flex;
          padding: 0;
        `
      )
    }

    replacementDiv.setAttribute(
      "style",
      `
        font-weight: bold;
        text-align: center;
        padding-bottom: 10px;
        transition: width 0.3s ease;
        overflow: hidden;
        width: ${show ? "100px" : "0"};
      `
    )

    if (show) {
      const [leastLimit, leastExcuse] = await Promise.all([
        getLimitWithLowestCountdownRemnant(),
        getExcuseWithLowestCountdownRemnant()
      ])

      if (!leastLimit) return

      const { timeLeft, timeLeftFormatted } = getLimitTimeLeft(
        leastLimit,
        leastExcuse
      )
      replacementDiv.textContent = timeLeftFormatted

      // Add the Progress component as a child of the replacement div
      let progressElement
      if (document.getElementById("progressElement")) {
        progressElement = document.getElementById(
          "progressElement"
        ) as HTMLDivElement
        progressElement.replaceChildren()
      } else {
        progressElement = document.createElement("div")
        progressElement.id = "progressElement"
      }
      const root = createRoot(progressElement)

      root.render(
        PROGRESS_BAR(leastLimit.countdown.startingCountValue, timeLeft)
      )
      replacementDiv.appendChild(progressElement)
    } else {
      // Clear the replacement div content when hidden
      replacementDiv.textContent = ""
      replacementDiv.innerHTML = ""
    }
  }
}

async function showDislikeRatio(show: boolean) {
  if (!isInYoutube()) return
  const queryParams = window.location.href.split("?")?.[1]
  const videoID = queryParams
    ?.split("&")
    .find((param) => param.startsWith?.("v="))
    ?.split("=")?.[1]
  if (!videoID) return

  const existingRatioDiv = document.querySelector("#likeDislikeRatioSlot")
  if (show && existingRatioDiv) {
    console.log("Dislike ratio already rendered, skipping API request")
    return
  }

  // Find the segmented like/dislike button container
  const segmentedWrapper = document.querySelector(
    ".ytSegmentedLikeDislikeButtonViewModelSegmentedButtonsWrapper"
  )
  if (!segmentedWrapper) {
    console.log("Could not find segmented wrapper")
    return
  }

  // Find the dislike button
  const dislikeButton = segmentedWrapper.querySelector(
    "dislike-button-view-model button"
  )

  if (show) {
    const { likes, dislikes } =
      await advancedOptionsRequests.getYouTubeDislikeRatio(videoID)
    // console.log({ likes, dislikes })
    if (
      likes === undefined ||
      dislikes === undefined ||
      likes === null ||
      dislikes === null
    )
      return
    if (!dislikeButton) {
      // console.log("Could not find dislike button")
      return
    }
    // Check if dislike count is already added
    if (
      !dislikeButton.querySelector(
        ".yt-spec-button-shape-next__button-text-content"
      )
    ) {
      // Create dislike count element similar to like button
      const dislikeCountDiv = document.createElement("div")
      dislikeCountDiv.className =
        "yt-spec-button-shape-next__button-text-content"
      dislikeCountDiv.textContent = dislikes.toString()
      dislikeCountDiv.id = "dislikeCountSlot"
      dislikeCountDiv.setAttribute("style", "margin-left: 4px;")

      dislikeButton.setAttribute("style", "width: auto;")
      // Insert after the icon div
      const iconDiv = dislikeButton.querySelector(
        ".yt-spec-button-shape-next__icon"
      )
      if (iconDiv && iconDiv.nextSibling) {
        dislikeButton.insertBefore(dislikeCountDiv, iconDiv.nextSibling)
      } else if (iconDiv) {
        dislikeButton.appendChild(dislikeCountDiv)
      }
    }

    // Add ratio bar below the buttons
    const menuRenderers = document.querySelectorAll("ytd-menu-renderer")
    menuRenderers.forEach((menuRenderer) => {
      if (
        menuRenderer.getAttribute?.("class")?.includes("ytd-watch-metadata")
      ) {
        const segmentedLikeDislike = menuRenderer.querySelector(
          "segmented-like-dislike-button-view-model"
        )
        if (segmentedLikeDislike) {
          if (!segmentedLikeDislike.querySelector("#likeDislikeRatioSlot")) {
            const ratioDiv = document.createElement("div")
            ratioDiv.id = "likeDislikeRatioSlot"
            ratioDiv.style.marginTop = "2px"
            // Use the LikeDislikeRatio React component
            const root = createRoot(ratioDiv)
            root.render(DISLIKE_RATIO(likes, dislikes))
            // Insert after the segmentedLikeDislike element
            segmentedLikeDislike.appendChild(ratioDiv)
          }
        }
      }
    })
  } else {
    // Remove dislike count
    const dislikeCountElement = dislikeButton.querySelector("#dislikeCountSlot")
    if (dislikeCountElement) {
      dislikeCountElement.remove()
    }

    // Remove ratio bar
    const menuRenderers = document.querySelectorAll("ytd-menu-renderer")
    menuRenderers.forEach((menuRenderer) => {
      if (
        menuRenderer.getAttribute?.("class")?.includes("ytd-watch-metadata")
      ) {
        const segmentedLikeDislike = menuRenderer.querySelector(
          "segmented-like-dislike-button-view-model"
        )
        if (segmentedLikeDislike) {
          const ratioDiv = segmentedLikeDislike.querySelector(
            "#likeDislikeRatioSlot"
          )
          if (ratioDiv) {
            ratioDiv.remove()
          }
        }
      }
    })
  }
}
