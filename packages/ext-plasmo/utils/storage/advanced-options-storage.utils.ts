import { defaultAdvancedOptions } from "~/constants/advanced-options.constants"
import { ADVANCED_OPTIONS_STORAGE_KEY } from "~/constants/storage.constants"
import { IAdvancedOptions } from "~/types/advanced-options.types"
import { plasmoStorage } from "~/utils/storage/index.utils"

export async function getAdvancedOptions() {
  const advancedOptionsInStorage = await plasmoStorage.get(
    ADVANCED_OPTIONS_STORAGE_KEY,
    {}
  )
  return {
    ...defaultAdvancedOptions,
    ...advancedOptionsInStorage
  }
}

export function setAdvancedOptions(options: IAdvancedOptions) {
  // console.log("SET ADVANCED OPTIONS - ", { options })
  // console.log("SET ADVANCED OPTIONS - ", { defaultAdvancedOptions })
  const resolvedOptions = {
    ...defaultAdvancedOptions,
    ...options
  }
  // console.log("SET ADVANCED OPTIONS - ", { resolvedOptions })
  plasmoStorage.set(ADVANCED_OPTIONS_STORAGE_KEY, resolvedOptions)
  return resolvedOptions
}

export async function toggleYoutubeCommentSection(hide: boolean) {
  return await setAdvancedOptions({
    hideYoutubeCommentSection: hide
  })
}
export async function toggleYoutubeRelatedVideos(hide: boolean) {
  return await setAdvancedOptions({
    hideRelatedVideos: hide
  })
}
export async function toggleYoutubeShortsOnHomepage(hide: boolean) {
  return await setAdvancedOptions({
    hideShortsOnHomepage: hide
  })
}
export async function toggleYoutubeGovtPrescNews(hide: boolean) {
  return await setAdvancedOptions({
    hideGovtPrescNews: hide
  })
}
export async function toggleYoutubeHomeButton(hide: boolean) {
  return await setAdvancedOptions({
    hideHomeButton: hide
  })
}
export async function toggleYoutubeOtherHomeButton(hide: boolean) {
  return await setAdvancedOptions({
    hideOtherHomeButton: hide
  })
}
export async function toggleYoutubeAll(hide: boolean) {
  const updatedOptions = {
    hideYoutubeCommentSection: hide,
    hideRelatedVideos: hide,
    hideShortsOnHomepage: hide,
    hideGovtPrescNews: hide,
    hideHomeButton: hide,
    hideOtherHomeButton: hide,
    showProgressBar: hide,
    hideAll: hide
  }
  await setAdvancedOptions(updatedOptions)
  return updatedOptions
}
