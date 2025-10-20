import { HTMLElementRefOf } from "@plasmicapp/react-web";
import _ from "lodash";
import * as React from "react";



import Select from "~/components/Select";
import { excusesAdvancedOptionsProps, LIMIT_REMINDER_OPTIONS, overrideSettingsAdvancedOptionsProps, youtubeAdvancedOptionsProps } from "~/constants/advanced-options.constants";
import { NoOfExcusesDropdownSlot } from "~/constants/components.constants";
import { IAdvancedOptions } from "~/types/advanced-options.types";
import { $storage } from "~/utils/storage/index.utils"

// @ts-ignore
import redDownArrow from "../assets/img/red-down-arrow.png"
import {
  DefaultAdvancedOptionsProps,
  PlasmicAdvancedOptions
} from "./plasmic/short_stop/PlasmicAdvancedOptions"


export interface AdvancedOptionsProps extends DefaultAdvancedOptionsProps {
  advancedOptions: IAdvancedOptions
  setAdvancedOptions: React.Dispatch<React.SetStateAction<IAdvancedOptions>>
  onCustomizePopupButtonClicked?: () => void
  backButton: object
}

function AdvancedOptions_(
  {
    onCustomizePopupButtonClicked,
    advancedOptions,
    setAdvancedOptions,
    ...props
  }: AdvancedOptionsProps,
  ref: HTMLElementRefOf<"div">
) {
  const limitReminderValue = LIMIT_REMINDER_OPTIONS.find((r) =>
    _.isEqual(JSON.parse(r.value), advancedOptions?.limitReminder)
  )?.value

  return (
    <PlasmicAdvancedOptions
      isShowingAllAdvancedOptions={true}
      customizePopupButton={{
        onClick: onCustomizePopupButtonClicked
      }}
      // youtube options props
      turnOnAllAbove={{
        style: {
          color: "#ffd666"
        }
      }}
      {...youtubeAdvancedOptionsProps(advancedOptions, setAdvancedOptions)}
      // excuses settings options props
      {...excusesAdvancedOptionsProps(advancedOptions, setAdvancedOptions)}
      // override settings options props
      {...overrideSettingsAdvancedOptionsProps(
        advancedOptions,
        setAdvancedOptions
      )}
      // general settings
      numberOfExcusesDropdownSlot={
        <NoOfExcusesDropdownSlot
          advancedOptions={advancedOptions}
          setAdvancedOptions={setAdvancedOptions}
        />
      }
      dropdownArrowSlot={
        advancedOptions?.hideAll ? null : (
          <div className="relative">
            <div className="absolute -top-[90px] -right-[70px] animate-heightBlink w-24 overflow-hidden">
              <img src={redDownArrow} alt="Down arrow" className="w-24" />
            </div>
          </div>
        )
      }
      limitReminderDropdownSlot={
        <div
          style={{
            display: "flex",
            justifyContent: "end",
            alignItems: "center",
            width: "100%"
          }}>
          <Select
            value={limitReminderValue}
            onChange={(val) => {
              if (!val) return
              const newAdvancedOptions = {
                ...advancedOptions,
                limitReminder: val === "custom" ? [] : JSON.parse(val)
              }
              $storage.advancedOptions.set(newAdvancedOptions)
              setAdvancedOptions(newAdvancedOptions)
            }}
            options={LIMIT_REMINDER_OPTIONS}
          />
        </div>
      }
      root={{ ref }}
      {...props}
    />
  )
}

const AdvancedOptions = React.forwardRef(AdvancedOptions_)
export default AdvancedOptions