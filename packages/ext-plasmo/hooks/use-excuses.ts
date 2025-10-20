import { useEffect, useState } from "react";



import { IExcuse, TExcuseAddedShorts, TExcuseAddedTime, TStage } from "~/types/excuses.types";
import { ILimit, IShortsLimit, IStopsLimit, IUrlLimit } from "~/types/limits.types";
import { TPopupState } from "~/types/popup.types"
import excusesRequests from "~/utils/api/requests/excuses.requests"
import { computeAddedTime, getExcusesLeft } from "~/utils/excuses.utils"
import { generateUUID } from "~/utils/index.utils"
import { getDefaultCountdown } from "~/utils/limits.utils"
import { $storage } from "~/utils/storage/index.utils"









const stages: TStage[] = [
  "_default",
  "optionsTime",
  "optionsYtShorts",
  "foSure1",
  "foSure2"
]

export default function useExcuses(
  limit: ILimit<IUrlLimit | IShortsLimit | IStopsLimit>,
  popupState: TPopupState,
  setPopupState: (popupState: TPopupState) => void
) {
  const [stage, setStage] = useState<TStage>(stages[0])
  const [excusesLeft, setExcusesLeft] = useState<number>(0)
  const [tempNewExcuse, setTempNewExcuse] = useState<IExcuse | null>(null)

  function handleInitiateExcuse() {
    if (!limit) return
    if (limit.type !== "url" && limit.type !== "shorts")
      return alert("Can't set an excuse on a stop.")
    if (excusesLeft <= 0) return alert("No more excuses today!")
    setStage(limit.type === "url" ? "optionsTime" : "optionsYtShorts")
  }

  function handleAddExcuse(addedLimit: TExcuseAddedTime | TExcuseAddedShorts) {
    if (!limit) return
    const addedTime = computeAddedTime(addedLimit)

    const expiryDate = new Date()
    expiryDate.setHours(0, 0, 0, 0)
    expiryDate.setDate(expiryDate.getDate() + 1)

    if (addedTime !== "entire day")
      console.log(
        "💥 handleAddExcuse",
        getDefaultCountdown("excuse", {
          startingCountValue: addedTime
        })
      )

    const newExcuse: IExcuse = {
      uuid: generateUUID(),
      limit: limit,
      addedTime: addedTime,
      countdown:
        addedTime === "entire day"
          ? null
          : getDefaultCountdown("excuse", {
              startingCountValue: addedTime
            }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    setTempNewExcuse(newExcuse)
    setStage("foSure1")
  }

  async function handleConfirmation(type: "first" | "second", response) {
    if (!response || response === "undefined") return setStage("_default")
    if (type === "first" && excusesLeft === 1) return setStage("foSure2")
    if (!tempNewExcuse) {
      setStage("_default")
      return alert("No excuse to save.")
    }

    await $storage.excuses.save(tempNewExcuse)
    if (popupState.showPopup)
      setPopupState({
        showPopup: false,
        popupType: popupState.popupType
      })
    // console.log({ saved })
    setTempNewExcuse(null)
    // return
    await excusesRequests.createUserExcuse(tempNewExcuse)
    setStage("_default")
    // window.location.reload()
  }

  async function handleSetExcusesLeft() {
    const excusesLeft = await getExcusesLeft()
    setExcusesLeft(excusesLeft)
  }

  useEffect(() => {
    handleSetExcusesLeft()
  }, [])

  return {
    excusesLeft,
    stage,
    handleInitiateExcuse,
    handleAddExcuse,
    handleConfirmation
  }
}