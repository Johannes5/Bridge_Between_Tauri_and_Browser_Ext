import {
  ILimit,
  IShortsLimit,
  IStopsLimit,
  IUrlLimit
} from "~/types/limits.types"
import { TPopupState, TPopupType } from "~/types/popup.types"
import { applyAdvancedOptions } from "~/utils/advanced-options.utils"
import { countdownAndGetValidUrlLimitExcuses } from "~/utils/excuses.utils"
import { handleResetDuringCountdown } from "~/utils/limit-countdown.utils"
import { shouldShowPopup } from "~/utils/popup.utils"
import { showReminder } from "~/utils/reminders.utils"
import { $storage } from "~/utils/storage/index.utils"
import { doesLimitUrlMatchCurrentUrl } from "~/utils/url.utils"

export async function oneSecondInterval(): Promise<TPopupState> {
  let popupState: {
    showPopup: boolean
    popupType: TPopupType
    limit?: ILimit<IUrlLimit | IStopsLimit | IShortsLimit>
  } = {
    showPopup: false,
    popupType: "none"
  }
  try {
    // Check if the popup is in customize mode
    const misc = await $storage.misc.get()
    if (misc.customizePopupMode) {
      popupState = {
        showPopup: true,
        popupType: "customize_popup_mode"
      }
      return popupState
    }

    const advancedOptions = await $storage.advancedOptions.get()

    // Check excuses
    const validExcuses = await countdownAndGetValidUrlLimitExcuses()
    if (validExcuses.length > 0) {
      popupState = {
        showPopup: false,
        popupType: "url_limit_exceeded",
        limit: validExcuses[0].limit
      }
      return popupState
    }

    // Get stops and url limits for checking.
    const { urlLimits, stopsLimits } =
      await $storage.limits.getUrlAndStopsLimits()

    // Check stops limits
    const newStopsLimits = await Promise.all(
      stopsLimits.map(async (limit) => {
        const { limit: newLimit, popupState: newPopupState } =
          urlAndStopsLimitCountdown(limit as ILimit<IStopsLimit>, popupState)
        limit = newLimit as ILimit<IStopsLimit>
        popupState = newPopupState

        return limit
      })
    )

    let newUrlLimits = urlLimits

    if (!popupState.showPopup) {
      // Check url limits
      newUrlLimits = await Promise.all(
        urlLimits.map(async (limit) => {
          const { limit: newLimit, popupState: newPopupState } =
            urlAndStopsLimitCountdown(limit as ILimit<IUrlLimit>, popupState)
          limit = newLimit as ILimit<IUrlLimit>
          popupState = newPopupState

          // Check reminders
          if (advancedOptions.limitReminder) {
            const limitReminder = advancedOptions.limitReminder as number[]
            if (limitReminder.includes(limit.countdown.remnant)) {
              // show reminder
              showReminder(limit.countdown.remnant)
            }
          }
          return limit
        })
      )
    }

    // Save all after checking.
    await $storage.limits.replaceUrlAndStopsLimits([
      ...newUrlLimits,
      ...newStopsLimits
    ] as ILimit<IUrlLimit | IStopsLimit>[])

    return popupState
  } catch (e) {
    return popupState
  } finally {
    applyAdvancedOptions()
  }
}

function urlAndStopsLimitCountdown(
  limit: ILimit<IUrlLimit | IStopsLimit>,
  popupState: TPopupState
) {
  // check if the currently loaded url matches the limit.limit.url
  const urlMatch = doesLimitUrlMatchCurrentUrl(
    (limit.limit as IUrlLimit | IStopsLimit).url,
    limit.type
  )

  if (!urlMatch) return { limit, popupState }

  // let { countdown } = handleResetDuringCountdown(limit as ILimit<IUrlLimit>)
  let { countdown } = handleResetDuringCountdown(limit.countdown, limit.type, limit.limit)

  if (limit.type === "stops" && countdown.remnant === 100) {
    popupState = {
      showPopup: true,
      popupType: "stop",
      limit: limit as ILimit<IUrlLimit | IStopsLimit>
    }
    return { limit, popupState }
  }

  if (countdown.remnant <= 0){
    popupState = {
      showPopup: limit.type === "url",
      popupType: limit.type === "url" ? "url_limit_exceeded" : "stop",
      limit: limit as ILimit<IUrlLimit | IStopsLimit>
    }
    return { limit, popupState }
  }

  const nextRemnantValue = countdown.remnant - countdown.countBy

  if (limit.type === "stops") {
    // Set the remnant to 100 if it's done counting to keep the popup open so that users can select whether or not they want to close the popup or close the website.
    countdown.remnant =
      nextRemnantValue <= 0
        ? countdown.remnant !== 0
          ? 100
          : 0
        : nextRemnantValue
  } else {
    countdown.remnant = nextRemnantValue < 0 ? 0 : nextRemnantValue
  }

  limit.countdown = countdown // assign to get updated countdown after remnant deduction

  if (!popupState.showPopup)
    // check if limit is exhausted
    popupState = shouldShowPopup(limit as ILimit<IUrlLimit | IStopsLimit>)

  return { limit, popupState }
}
