import matchUrl from "match-url-wildcard";



import { TLimitType } from "~/types/limits.types"





// const log = (url, ...args) =>
//   url.includes("youtube.com") && console.log(url, ...args)

function doesUrlMatchCurrentUrl(url: string) {
  const currentUrl = window.location.href
  // Clean both URLs
  // log(url, "URL", url)
  const cleanCurrentUrl = currentUrl.replace(/^https?:\/\/(www\.)?/, "")
  const cleanInputUrl = url.replace(/^https?:\/\/(www\.)?/, "")

  // log(url, "CLEAN", cleanCurrentUrl, cleanInputUrl)
  // If url ends with /, it should match exactly
  if (cleanInputUrl.endsWith("/")) return cleanCurrentUrl === cleanInputUrl

  // If url doesn't end with /, it should match the base path
  const urlParts = cleanInputUrl.split("/")
  const currentUrlParts = cleanCurrentUrl.split("/")

  // log(url, "SPLIT", currentUrlParts, urlParts)
  // Check if the base domain matches
  if (!matchUrl(currentUrlParts[0], urlParts[0])) return false

  // If url has no path (just domain), it matches everything
  if (urlParts.length === 1) return true

  // log(url, "MATCH", cleanCurrentUrl === cleanInputUrl)
  // For paths, check if they match exactly
  return cleanCurrentUrl.includes(cleanInputUrl)
  // return matchUrl(cleanCurrentUrl, cleanInputUrl)
}

export function doesLimitUrlMatchCurrentUrl(
  url: string,
  limitType: TLimitType
) {
  if (limitType === "url" || limitType === "stops") {
    return doesUrlMatchCurrentUrl(url)
  } else if (limitType === "shorts") {
    return doesUrlMatchCurrentUrl("youtube.com/shorts")
  }
}

export function isUrlAShort(url: string) {
  const containsShortsBaseUrl = url.includes("youtube.com/shorts/")
  const shortsId = url.split("/shorts/")[1]
  return containsShortsBaseUrl && !!shortsId && shortsId.length > 0
}

export function isInShorts() {
  return typeof window !== "undefined"
    ? window.location.href.includes("youtube.com/shorts/")
    : false
}

export function getShortIdFromUrl() {
  try {
    const url = window.location.href
    const shortsId = url.split("/shorts/")[1]
    return shortsId || null
  } catch (e) {
    return null
  }
}