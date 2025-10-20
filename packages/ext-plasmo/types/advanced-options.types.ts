export interface IAdvancedOptions {
  // Youtube customization
  hideYoutubeCommentSection?: boolean
  hideRelatedVideos?: boolean
  hideShortsOnHomepage?: boolean
  hideGovtPrescNews?: boolean
  hideHomeButton?: boolean
  hideOtherHomeButton?: boolean
  hideShortsButton?: boolean
  showProgressBar?: boolean
  hideAll?: boolean
  showDislikeRatio?: boolean
  // Excuses settings
  numberOfExcusesPerDay?: number
  showEntireDayOption?: boolean
  excusesAreSpecific?: boolean
  changingLimitOrStopCostsOneExcuse?: boolean
  startingCustomPeriodCostOneExcuse?: boolean
  // Override settings
  shouldOverrideSettings?: boolean
  shouldOverrideLimits?: boolean
  shouldOverrideStops?: boolean
  // General settings
  limitReminder?: number[]
}
