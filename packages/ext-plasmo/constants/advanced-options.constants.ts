import { Dispatch, SetStateAction } from "react";



import { IAdvancedOptions } from "~/types/advanced-options.types";
import { minutesToMilliseconds, secondsToMilliseconds } from "~/utils/time.utils";





export const DEFAULT_LIMIT_REMINDER = [
  minutesToMilliseconds(2),
  secondsToMilliseconds(10)
]

export const defaultAdvancedOptions: IAdvancedOptions = {
  // Youtube customization
  hideYoutubeCommentSection: false,
  hideRelatedVideos: false,
  hideShortsOnHomepage: false,
  hideGovtPrescNews: false,
  hideHomeButton: false,
  hideOtherHomeButton: false,
  hideShortsButton: false,
  showProgressBar: true,
  hideAll: false,
  showDislikeRatio: true,
  // Excuses settings
  numberOfExcusesPerDay: 2,
  showEntireDayOption: false,
  excusesAreSpecific: false,
  changingLimitOrStopCostsOneExcuse: false,
  startingCustomPeriodCostOneExcuse: false,
  // Override settings
  shouldOverrideSettings: false,
  shouldOverrideLimits: false,
  shouldOverrideStops: false,
  // General settings
  limitReminder: DEFAULT_LIMIT_REMINDER
}

export const overrideSettingsAdvancedOptionsProps = (
  advancedOptions: IAdvancedOptions,
  setAdvancedOptions: Dispatch<SetStateAction<IAdvancedOptions>>
) => ({
  shouldOverrideLimitsSwitch: {
    value: advancedOptions?.shouldOverrideLimits,
    checked: advancedOptions?.shouldOverrideLimits,
    onChange: (v) => {
      const newOptions = { ...advancedOptions, shouldOverrideLimits: v }
      setAdvancedOptions(newOptions)
    }
  },
  shouldOverrideSettingsSwitch: {
    value: advancedOptions?.shouldOverrideSettings,
    checked: advancedOptions?.shouldOverrideSettings,
    onChange: (v) => {
      const newOptions = { ...advancedOptions, shouldOverrideSettings: v }
      setAdvancedOptions(newOptions)
    }
  },
  shouldOverrideStopsSwitch: {
    value: advancedOptions?.shouldOverrideStops,
    checked: advancedOptions?.shouldOverrideStops,
    onChange: (v) => {
      const newOptions = { ...advancedOptions, shouldOverrideStops: v }
      setAdvancedOptions(newOptions)
    }
  }
})

export const excusesAdvancedOptionsProps = (
  advancedOptions: IAdvancedOptions,
  setAdvancedOptions: Dispatch<SetStateAction<IAdvancedOptions>>
) => ({
  showEntireDayExcuseSwitch: {
    value: advancedOptions?.showEntireDayOption,
    checked: advancedOptions?.showEntireDayOption,
    onChange: (v) => {
      const newOptions = { ...advancedOptions, showEntireDayOption: v }
      setAdvancedOptions(newOptions)
    }
  },
  excusesAreSpecificSwitch: {
    value: advancedOptions?.excusesAreSpecific,
    checked: advancedOptions?.excusesAreSpecific,
    onChange: (v) => {
      const newOptions = { ...advancedOptions, excusesAreSpecific: v }
      setAdvancedOptions(newOptions)
    }
  },
  changingLimitOrStopCosts1ExcuseSwitch: {
    value: advancedOptions?.changingLimitOrStopCostsOneExcuse,
    checked: advancedOptions?.changingLimitOrStopCostsOneExcuse,
    onChange: (v) => {
      const newOptions = {
        ...advancedOptions,
        changingLimitOrStopCostsOneExcuse: v
      }
      setAdvancedOptions(newOptions)
    }
  }
})

export const youtubeAdvancedOptionsProps = (
  advancedOptions: IAdvancedOptions,
  setAdvancedOptions: Dispatch<SetStateAction<IAdvancedOptions>>
) => {
  console.log(
    "showDislikeRatio",
    advancedOptions.showDislikeRatio,
    advancedOptions
  )
  return {
    youtubeCommentSectionSwitch: {
      value: advancedOptions?.hideYoutubeCommentSection,
      checked: advancedOptions?.hideYoutubeCommentSection,
      onChange: (v) => {
        const newOptions = { ...advancedOptions, hideYoutubeCommentSection: v }
        setAdvancedOptions(newOptions)
      }
    },
    youtubeRelatedVideosSwitch: {
      value: advancedOptions?.hideRelatedVideos,
      checked: advancedOptions?.hideRelatedVideos,
      onChange: (v) => {
        const newOptions = { ...advancedOptions, hideRelatedVideos: v }
        setAdvancedOptions(newOptions)
      }
    },
    youtubeShortsSwitch: {
      value: advancedOptions?.hideShortsOnHomepage,
      checked: advancedOptions?.hideShortsOnHomepage,
      onChange: (v) => {
        const newOptions = { ...advancedOptions, hideShortsOnHomepage: v }
        setAdvancedOptions(newOptions)
      }
    },
    youtubeHideShortsButton: {
      value: advancedOptions?.hideShortsButton,
      checked: advancedOptions?.hideShortsButton,
      onChange: (v) => {
        const newOptions = { ...advancedOptions, hideShortsButton: v }
        setAdvancedOptions(newOptions)
      }
    },
    youtubeGovtPrescNewsSwitch: {
      value: advancedOptions?.hideGovtPrescNews,
      checked: advancedOptions?.hideGovtPrescNews,
      onChange: (v) => {
        const newOptions = { ...advancedOptions, hideGovtPrescNews: v }
        setAdvancedOptions(newOptions)
      }
    },
    youtubeHomeButtonSwitch: {
      value: advancedOptions?.hideHomeButton,
      checked: advancedOptions?.hideHomeButton,
      onChange: (v) => {
        const newOptions = { ...advancedOptions, hideHomeButton: v }
        setAdvancedOptions(newOptions)
      }
    },
    youtubeOtherHomeButtonSwitch: {
      value: advancedOptions?.hideOtherHomeButton,
      checked: advancedOptions?.hideOtherHomeButton,
      onChange: (v) => {
        const newOptions = { ...advancedOptions, hideOtherHomeButton: v }
        setAdvancedOptions(newOptions)
      }
    },
    youtubeDislikeRatioButton: {
      value: advancedOptions?.showDislikeRatio,
      checked: advancedOptions?.showDislikeRatio,
      onChange: (v) => {
        const newOptions = { ...advancedOptions, showDislikeRatio: v }
        setAdvancedOptions(newOptions)
      }
    },
    youtubeToggleProgressBarButton: {
      value: advancedOptions?.showProgressBar,
      checked: advancedOptions?.showProgressBar,
      onChange: (v) => {
        const newOptions = { ...advancedOptions, showProgressBar: v }
        setAdvancedOptions(newOptions)
      }
    },
    youtubeAllSwitch: {
      value: advancedOptions?.hideAll,
      checked: advancedOptions?.hideAll,
      onChange: (v) => {
        const newOptions = {
          ...advancedOptions,
          hideAll: v,
          hideYoutubeCommentSection: v,
          hideRelatedVideos: v,
          hideShortsOnHomepage: v,
          hideGovtPrescNews: v,
          hideHomeButton: v,
          hideOtherHomeButton: v,
          hideShortsButton: v
          // showProgressBar: v,
          // showDislikeRatio: v
        }
        setAdvancedOptions(newOptions)
      }
    }
  }
}
export const LIMIT_REMINDER_OPTIONS = [
  {
    value: JSON.stringify([
      minutesToMilliseconds(2),
      secondsToMilliseconds(10)
    ]),
    label: "2mins & 10s",
    key: "2mins & 10s"
  },
  {
    value: JSON.stringify([
      minutesToMilliseconds(3),
      secondsToMilliseconds(30)
    ]),
    label: "3mins & 30s",
    key: "3mins & 30s"
  },
  {
    value: JSON.stringify([
      minutesToMilliseconds(5),
      minutesToMilliseconds(1),
      secondsToMilliseconds(10)
    ]),
    label: "5mins & 1min & 10s",
    key: "5mins & 1min & 10s"
  },
  {
    value: JSON.stringify([
      minutesToMilliseconds(10),
      secondsToMilliseconds(30)
    ]),
    label: "10mins & 30s",
    key: "10mins & 30s"
  },
  {
    value: JSON.stringify([
      minutesToMilliseconds(10),
      minutesToMilliseconds(5),
      minutesToMilliseconds(1)
    ]),
    label: "10mins & 5mins & 1min",
    key: "10mins & 5mins & 1min"
  }
]