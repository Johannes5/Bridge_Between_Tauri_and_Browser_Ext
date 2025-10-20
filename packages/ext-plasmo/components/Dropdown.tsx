import { ChangeEvent, ChangeEventHandler, MouseEventHandler, useEffect, useState } from "react";



import Suggestions from "~/components/custom/Suggestions";
import PlasmicLimit from "~/components/plasmic/short_stop/PlasmicLimit";
import Select from "~/components/Select";
import { createStopsDropdownOptions, createTimeOptions, PERIOD_OPTIONS, SHORTS_LIMITS, shouldUseHours, TIME_UNIT_OPTIONS } from "~/constants/options.constants";
import { TLimitType, TStopsTimeUnit, TUrlAndShortsPeriod } from "~/types/limits.types";
import { fromMillisecondsFn, toMillisecondsFn } from "~/utils/time.utils"

interface DropdownProps {
  updatePeriod: (value: string | null) => void
  updateTime: (value: string | null) => void
  updateTimeUnit?: (value: "minutes" | "hours") => void
  onDelete?: MouseEventHandler<Element>
  time: string | undefined
  timeUnit?: "minutes" | "hours"
  period?: TUrlAndShortsPeriod | TStopsTimeUnit // stops time units are called periods on plasmic
  availablePeriodOptions?: ReturnType<typeof PERIOD_OPTIONS>
  url?: {
    value: string
    onChange: ChangeEventHandler<Element>
    autoFocus?: boolean
  }
  type: TLimitType
  id?: string
}

export const Dropdown = ({
  updatePeriod,
  updateTime,
  updateTimeUnit,
  period,
  timeUnit,
  time,
  type,
  url = { value: "", onChange: () => null },
  onDelete,
  availablePeriodOptions,
  id
}: DropdownProps) => {
  const defaultTimeUnit =
    timeUnit ||
    ((period === "seconds"
      ? period
      : shouldUseHours(period)
        ? "hours"
        : "minutes") as "hours" | "minutes")
  const [selectedTimeUnit, setSelectedTimeUnit] = useState(defaultTimeUnit)

  const [enterCustomValue, setEnterCustomValue] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (!mounted) {
      setMounted(true)
      return
    }
    setSelectedTimeUnit(defaultTimeUnit)
    setMounted(true)
  }, [period, timeUnit])

  return (
    <>
      <PlasmicLimit
        type={type}
        key={id}
        textInput={{
          key: id,
          value: url.value,
          onChange: (e) => {
            url.onChange(e)
            setShowSuggestions(true)
          },
          autoFocus: url?.autoFocus || false,
          id: `linkDropdownInput${id}`,
          onBlur: () => {
            setShowSuggestions(false)
          }
        }}
        suggestionsBox={
          showSuggestions ? (
            <Suggestions
              query={url.value}
              onSelect={(enteredUrl: string) => {
                url.onChange({
                  target: { value: enteredUrl }
                } as unknown as ChangeEvent<Element>)
              }}
            />
          ) : null
        }
        minutesText={
          type === "url" ? (
            period === "day" ? (
              <Select
                value={selectedTimeUnit}
                onChange={(val: "minutes" | "hours") =>
                  val && updateTimeUnit(val)
                }
                options={TIME_UNIT_OPTIONS}
                style={{
                  width: "80px"
                }}
              />
            ) : (
              selectedTimeUnit
            )
          ) : undefined
        }
        deleteButton={{
          onClick: onDelete
        }}
        timeSlot={
          <div className="flex items-center bg-[#171717] rounded-md">
            <Select
              selectedLabelStyle={{
                width: "30px"
              }}
              showInput={enterCustomValue}
              value={time}
              onChange={(newTime) =>
                newTime === "custom"
                  ? setEnterCustomValue(true)
                  : (() => {
                      newTime && updateTime(newTime)
                      setEnterCustomValue(false)
                    })()
              }
              options={
                type === "shorts"
                  ? SHORTS_LIMITS
                  : type === "stops"
                    ? createStopsDropdownOptions(period as TStopsTimeUnit)
                    : createTimeOptions(
                        selectedTimeUnit === "hours" ? "month" : period
                      )
              }
              beforeOnChange={(val) => {
                let numVal = +val
                numVal = toMillisecondsFn(selectedTimeUnit)(numVal)
                return `${numVal}`
              }}
              beforeValueRender={(val) => {
                let numVal = +val
                numVal = fromMillisecondsFn(selectedTimeUnit)(numVal)
                return `${numVal}`
              }}
              style={enterCustomValue ? undefined : { width: "80px" }}
            />
          </div>
        }
        period={
          <Select
            key={id}
            value={period}
            defaultSelected={period}
            onChange={(newVal) => {
              if (newVal === "month" || newVal === "week") {
                updateTimeUnit("hours")
              }
              newVal && updatePeriod(newVal)
            }}
            options={
              availablePeriodOptions &&
              availablePeriodOptions.find((opt) => opt.value === period)
                ? availablePeriodOptions
                : PERIOD_OPTIONS(type)
            }
          />
        }
      />
    </>
  )
}