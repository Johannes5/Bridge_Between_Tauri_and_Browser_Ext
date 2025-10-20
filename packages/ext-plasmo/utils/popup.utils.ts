import { ILimit, IShortsLimit, IStopsLimit, IUrlLimit, TLimitType } from "~/types/limits.types";
import { TPopupState, TPopupType } from "~/types/popup.types"
import { doesLimitUrlMatchCurrentUrl } from "~/utils/url.utils"





export function isEventFromPopup(e: Event) {
  const popupComponent = document.getElementById("extensionPopupComponent")
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

export function shouldShowPopup(
  limit: ILimit<IUrlLimit | IShortsLimit | IStopsLimit>
): TPopupState {
  const popupType: TPopupType = getPopupType(limit.type)

  try {
    const urlMatched = doesLimitUrlMatchCurrentUrl(
      (limit.limit as IUrlLimit | IStopsLimit).url,
      limit.type
    )

    const isUrlOrShortsLimitExceeded =
      (limit.type === "url" || limit.type === "shorts") &&
      limit.countdown.remnant <= 0

    const isStopsLimitRemaining =
      limit.type === "stops" && limit.countdown.remnant > 0

    if (urlMatched && (isUrlOrShortsLimitExceeded || isStopsLimitRemaining)) {
      return {
        showPopup: true,
        popupType,
        limit
      }
    } else {
      return {
        showPopup: false,
        popupType: popupType,
        limit
      }
    }
  } catch (e) {
    return {
      showPopup: false,
      popupType: popupType,
      limit
    }
  }
}

export function getPopupType(limitType: TLimitType) {
  return limitType === "url"
    ? "url_limit_exceeded"
    : limitType === "stops"
      ? "stop"
      : "shorts_limit_exceeded"
}