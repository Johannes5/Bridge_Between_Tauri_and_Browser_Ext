import { Dispatch, SetStateAction } from "react";



import { TPopupState } from "~/types/popup.types";
import { oneSecondInterval } from "~/utils/countdowns/one-second-intervals-countdown.utils";
import { handleGeneralSync } from "~/utils/countdowns/syncing-countdowns.utils";
import { onUrlChange } from "~/utils/countdowns/url-change-countdown.utils";
import { secondsToMilliseconds } from "~/utils/time.utils";





let oneSecondIntervalId: NodeJS.Timeout
let tenMinutesIntervalId: NodeJS.Timeout
let oneHourIntervalId: NodeJS.Timeout

export function initializeCountdowns(
  popupState: TPopupState,
  setPopupState: Dispatch<SetStateAction<TPopupState>>
) {
  // One second interval
  oneSecondIntervalId = setInterval(async () => {
    handleGeneralSync()
    // console.log("& Before block")
    if (document.visibilityState !== "visible" || !document.hasFocus()) return
    // console.log("& After block")
    // Check the state of all the limits countdowns and determine the new popup state
    // if (isInShorts()) setPopupState(await onUrlChange())

    setPopupState(await oneSecondInterval())

    // Handle general sync
  }, secondsToMilliseconds(1))
}

export function cleanCountdowns() {
  clearInterval(oneSecondIntervalId)
  clearInterval(tenMinutesIntervalId)
  clearInterval(oneHourIntervalId)
}

export async function manageUrlChange(
  popupState: TPopupState,
  setPopupState: Dispatch<SetStateAction<TPopupState>>
) {
  // return
  const newPopupState = await onUrlChange()
  setPopupState(newPopupState)
}