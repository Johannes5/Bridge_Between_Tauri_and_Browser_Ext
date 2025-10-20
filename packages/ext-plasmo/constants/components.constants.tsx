import _ from "lodash"
import { Dispatch, SetStateAction } from "react"

import LikeDislikeRatio from "~/components/LikeDislikeRatio"
import Progress from "~/components/Progress"
import Select from "~/components/Select"
import { LIMIT_REMINDER_OPTIONS } from "~/constants/advanced-options.constants"
import { NUMBER_OF_EXCUSES_OPTIONS } from "~/constants/options.constants"
import { IAdvancedOptions } from "~/types/advanced-options.types"
import { $storage } from "~/utils/storage/index.utils"

export const PROGRESS_BAR = (timeLimit: number, timeLeft: number) => (
  <Progress totalTime={timeLimit} timeLeft={timeLeft} />
)

export const DISLIKE_RATIO = (
  likes: number,
  dislikes: number,
  className = ""
) => (
  <LikeDislikeRatio likes={likes} dislikes={dislikes} className={className} />
)

export const NoOfExcusesDropdownSlot = ({
  advancedOptions,
  setAdvancedOptions
}: {
  advancedOptions: IAdvancedOptions
  setAdvancedOptions: Dispatch<SetStateAction<IAdvancedOptions>>
}) => {
  const handleChange = (val: string) => {
    const newVal = Number(val)
    if (!val || isNaN(newVal)) return
    const newAdvancedOptions = {
      ...advancedOptions,
      numberOfExcusesPerDay: newVal
    }
    $storage.advancedOptions.set(newAdvancedOptions)
    setAdvancedOptions(newAdvancedOptions)
  }

  return (
    <Select
      value={
        advancedOptions?.numberOfExcusesPerDay
          ? `${advancedOptions?.numberOfExcusesPerDay}`
          : undefined
      }
      onChange={handleChange}
      options={NUMBER_OF_EXCUSES_OPTIONS}
      style={{
        width: "55px"
      }}
    />
  )
}

export const LIMIT_REMINDER_DROPDOWN_SLOT = (
  advancedOptions: IAdvancedOptions,
  setAdvancedOptions: Dispatch<SetStateAction<IAdvancedOptions>>
) => (
  <Select
    value={
      LIMIT_REMINDER_OPTIONS.find((r) =>
        _.isEqual(JSON.parse(r.value), advancedOptions?.limitReminder)
      )?.value
    }
    onChange={(val) =>
      val &&
      setAdvancedOptions({
        ...advancedOptions,
        limitReminder: val === "custom" ? [] : JSON.parse(val)
      })
    }
    options={LIMIT_REMINDER_OPTIONS}
    style={{
      width: "80px"
    }}
  />
)

export const REMINDER = (timeLeft: string) => (
  <div
    style={{
      position: "fixed",
      top: "2.5rem",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 9999999,
      background: "rgba(0,0,0,0.7)",
      color: "#fff",
      fontSize: "1.125rem",
      fontWeight: 600,
      padding: "0.5rem",
      borderRadius: "0.375rem",
      animation: "fadeIn 0.5s"
    }}>
    <span style={{ fontWeight: 900, color: "#ef4444" }}>!</span>{" "}
    {`${timeLeft} remaining.`}
  </div>
)
