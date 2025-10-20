import detectUrlChange from "detect-url-change";
import { useEffect, useRef, useState } from "react";



import { useMessage } from "@plasmohq/messaging/hook";



import { ILimit, IStopsLimit, IUrlLimit } from "~/types/limits.types";
import { TPopupState } from "~/types/popup.types";
import { cleanCountdowns, initializeCountdowns, manageUrlChange } from "~/utils/countdowns/index.utils";
import { freezeWebPage, unfreezeWebPage } from "~/utils/document.utils";
import { isEventFromPopup } from "~/utils/popup.utils";
import { $storage } from "~/utils/storage/index.utils";
import { doesLimitUrlMatchCurrentUrl } from "~/utils/url.utils";





const initialPopupState: TPopupState = {
  showPopup: false,
  popupType: "none"
}
// use(oneSecondInterval())

export default function useContentScripts() {
  const [popupState, setPopupState] = useState<TPopupState>(initialPopupState)
  const popupStateCopyRef = useRef<TPopupState>(initialPopupState)

  useMessage(async (req) => {
    // Updating popup state from extension popup
    if (req.name === "update-popup-state") {
      const newPopupState = req.body as TPopupState
      setPopupState(newPopupState)
      popupStateCopyRef.current = newPopupState
    }
  })

  function handleSetPopupState(newPopupState: TPopupState) {
    const isNewStateMatchCurrentUrl = doesLimitUrlMatchCurrentUrl(
      newPopupState?.limit?.type === "shorts"
        ? "youtube.com/shorts"
        : (newPopupState?.limit as ILimit<IUrlLimit | IStopsLimit>)?.limit?.url,
      newPopupState?.limit?.type
    )

    const isPrevStateStopAndNewStateNotStop =
      popupStateCopyRef.current?.popupType === "stop" &&
      newPopupState?.popupType !== "stop"

    const isPreviousStateAShortAndNewStateAUrl =
      popupStateCopyRef.current.popupType === "shorts_limit_exceeded" &&
      newPopupState.popupType === "url_limit_exceeded"

    const newComingWithFalseStateAndIsDifferentType =
      popupStateCopyRef.current.showPopup &&
      !newPopupState.showPopup &&
      popupStateCopyRef.current.popupType !== newPopupState.popupType

    if (
      !isPreviousStateAShortAndNewStateAUrl &&
      isNewStateMatchCurrentUrl &&
      (isPrevStateStopAndNewStateNotStop ||
        !newComingWithFalseStateAndIsDifferentType)
    ) {
      popupStateCopyRef.current = newPopupState
      setPopupState(newPopupState)
    }
  }

  // Function to handle URL changes
  function handleUrlChange() {
    // console.log("& handleUrlChange")
    manageUrlChange(popupState, handleSetPopupState)
    cleanCountdowns()
    initializeCountdowns(popupStateCopyRef.current, handleSetPopupState)
  }

  // Function to handle tab/window visibility changes
  function handleVisibilityChange() {
    if (document.visibilityState !== "visible") return
    cleanCountdowns()
    initializeCountdowns(popupStateCopyRef.current, handleSetPopupState)
  }

  function handleInit() {
    // Initialize intervals on mount
    initializeCountdowns(popupState, handleSetPopupState)

    // Add event listeners
    detectUrlChange.on("change", handleUrlChange)
    if (["interactive", "complete"].includes(document.readyState)) {
      handleUrlChange()
    } else {
      document.addEventListener("DOMContentLoaded", handleUrlChange)
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
  }

  function handleCleanup() {
    cleanCountdowns()
    detectUrlChange.off("change", handleUrlChange)
    document.removeEventListener("DOMContentLoaded", handleUrlChange)
    document.removeEventListener("visibilitychange", handleVisibilityChange)
  }

  async function handleClickUnderlay(e: Event) {
    e.stopPropagation()
    e.preventDefault()
    if (isEventFromPopup(e)) return
    if (
      popupState.showPopup &&
      popupState.popupType === "customize_popup_mode"
    ) {
      const newPopupState = {
        showPopup: false,
        popupType: "none"
      } as TPopupState
      setPopupState(newPopupState)
      popupStateCopyRef.current = newPopupState
      await $storage.misc.set("customizePopupMode", false)
    }
  }

  useEffect(() => {
    // Initialize the content scripts and cleanup on unmount
    handleInit()
    return () => handleCleanup()
  }, [])

  useEffect(() => {
    function freezeUnfreeze() {
      if (popupState.showPopup) {
        freezeWebPage()
      } else {
        unfreezeWebPage()
      }
    }

    freezeUnfreeze()
  }, [popupState.showPopup])

  return {
    popupState,
    setPopupState,
    handleClickUnderlay
  }
}