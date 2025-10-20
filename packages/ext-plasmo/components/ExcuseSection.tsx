import { HTMLElementRefOf } from "@plasmicapp/react-web";
import { forwardRef, useEffect, useState } from "react";
import PlasmicExcuseSection, { DefaultExcuseSectionProps } from "~/components/plasmic/short_stop/PlasmicExcuseSection";
import useExcuses from "~/hooks/use-excuses";
import { TExcuseAddedShorts, TExcuseAddedTime } from "~/types/excuses.types";
import {
  ILimit,
  IShortsLimit,
  IStopsLimit,
  IUrlLimit
} from "~/types/limits.types";
import { TPopupState } from "~/types/popup.types";
import { $storage } from "~/utils/storage/index.utils";

export interface ExcuseSectionProps extends DefaultExcuseSectionProps {
  limit: ILimit<IUrlLimit | IShortsLimit | IStopsLimit>
  popupState: TPopupState
  setPopupState: (popupState: TPopupState) => void
}

function ExcuseSection_(
  { limit, popupState, setPopupState, ...props }: ExcuseSectionProps,
  ref: HTMLElementRefOf<"div">
) {
  const {
    handleInitiateExcuse,
    handleAddExcuse,
    handleConfirmation,
    stage,
    excusesLeft
  } = useExcuses(limit, popupState, setPopupState)

  const [showEntireDayOption, setShowEntireDayOption] = useState(false)

  useEffect(() => {
    ;(async function () {
      const advancedOptions = await $storage.advancedOptions.get()
      setShowEntireDayOption(!!advancedOptions?.showEntireDayOption)
    })()
  }, [])

  return (
    <PlasmicExcuseSection
      hideReasonSection={true}
      showEntireDayOption={showEntireDayOption}
      initiateExcuse={() => handleInitiateExcuse()}
      foSure1={async (c) => await handleConfirmation("first", c)}
      foSure2={async (c) => await handleConfirmation("second", c)}
      addTime={(c) => handleAddExcuse(c as TExcuseAddedTime)}
      addShorts={(c) => handleAddExcuse(c as TExcuseAddedShorts)}
      stage={stage}
      root={{ ref }}
      {...props}>
      <div className="text-white">{`${excusesLeft}`}</div>
    </PlasmicExcuseSection>
  )
}

const ExcuseSection = forwardRef(ExcuseSection_)
export default ExcuseSection