import { ILimit, IShortsLimit, IStopsLimit } from "~/types/limits.types";
import { TPopupState } from "~/types/popup.types"
import { showProgressBar } from "~/utils/advanced-options.utils"
import advancedOptionsRequests from "~/utils/api/requests/advanced-options.requests"
import { countdownAndGetValidShortsLimitExcuses } from "~/utils/excuses.utils"
import { handleResetDuringCountdown } from "~/utils/limit-countdown.utils"
import { shouldShowPopup } from "~/utils/popup.utils"
import { $storage } from "~/utils/storage/index.utils"
import { getShortIdFromUrl, isUrlAShort } from "~/utils/url.utils"

export async function onUrlChange() {
  const shorts = await $storage.limits.getShortsLimits()

  let popupState: TPopupState = {
    showPopup: false,
    popupType: "shorts_limit_exceeded"
  }

  if (!isUrlAShort(window.location.href)) return popupState

  const advancedOptions = await $storage.advancedOptions.get()
  await showProgressBar(advancedOptions.showProgressBar)

  // countdown excuses if any
  const validExcuses = await countdownAndGetValidShortsLimitExcuses()
  // console.log("& validExcuses ->", validExcuses)

  if (validExcuses.length > 0) {
    popupState = {
      showPopup: false,
      popupType: "shorts_limit_exceeded"
    }
  } else {
    const newShortsLimits = await Promise.all(
      shorts.map(async (short) => {
        // check if limit is exhausted
        if (!popupState.showPopup)
          popupState = shouldShowPopup(
            short as ILimit<IShortsLimit | IStopsLimit>
          )

        // countdown limit
        if (short.countdown.remnant > 0) {
          const { countdown } = handleResetDuringCountdown(
            short.countdown,
            short.type,
            short.limit
          )
          short.countdown = countdown
          short = shortsLimitCountdown(short as ILimit<IShortsLimit>)
        }

        return short
      })
    )

    await $storage.limits.replaceShortsLimits(newShortsLimits)
  }

  // update advanced options
  advancedOptionsRequests.getUserAdvancedOptions()

  return popupState
}

function shortsLimitCountdown(limit: ILimit<IShortsLimit>) {
  const countdown = limit.countdown
  if (countdown.remnant <= 0) return limit

  if (!isUrlAShort(window.location.href)) return limit
  // capture the short id and add it to the limit.watchedShorts array
  const shortId = getShortIdFromUrl()

  if (!shortId) return limit

  if (limit.limit.watchedShorts.find((short) => short === shortId)) return limit

  limit.limit.watchedShorts.push(shortId)

  const nextRemnantValue = countdown.remnant - countdown.countBy
  nextRemnantValue < 0
    ? (countdown.remnant = 0)
    : (countdown.remnant = nextRemnantValue)

  limit.countdown = countdown

  return limit
}