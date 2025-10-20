import { Storage } from "@plasmohq/storage"

import {
  getAdvancedOptions,
  setAdvancedOptions,
  toggleYoutubeAll,
  toggleYoutubeCommentSection,
  toggleYoutubeGovtPrescNews,
  toggleYoutubeHomeButton,
  toggleYoutubeOtherHomeButton,
  toggleYoutubeRelatedVideos,
  toggleYoutubeShortsOnHomepage
} from "~/utils/storage/advanced-options-storage.utils"
import {
  getAllExcuses,
  getExcusesThatMatchCurrentUrl,
  getLimitExcuses,
  getShortsExcuses,
  getUrlLimitsExcuses,
  saveExcuse,
  saveExcuses,
  saveLimitExcuses,
  saveNewLimitsExcuses
} from "~/utils/storage/excuses-storage.utils"
import {
  createLimit,
  getAllLimits,
  getLimit,
  getLimitsThatMatchCurrentUrl,
  getShortsLimits,
  getStopLimits,
  getUrlAndStopsLimits,
  getUrlLimits,
  replaceShortsLimits,
  replaceUrlAndStopsLimits,
  saveLimits,
  upsertLimit
} from "~/utils/storage/limits-storage.utils"
import { getLinks, setLinks } from "~/utils/storage/links-storage.utils"
import {
  deleteLastAuthenticatedFetch,
  getLastAuthenticatedFetch,
  getLastPopupAdvancedOptionsFetch,
  getLastPopupLimitsFetch,
  getLastSync,
  getMiscData,
  setLastAdvancedOptionsFetch,
  setLastAuthenticatedFetch,
  setLastLimitsFetch,
  setLastSync,
  setMiscData
} from "~/utils/storage/misc-storage.utils"
import { getQuotes, setQuotes } from "~/utils/storage/quotes-storage.utils"

const plasmoStorageInstance = new Storage({
  area: "local"
})
export const plasmoStorage = {
  get: function <X>(key: string, defaultData?: X): Promise<X> {
    async function handleGet() {
      const stored = await plasmoStorageInstance.get(key)
      if (stored === undefined) return defaultData
      return JSON.parse(stored) ? JSON.parse(stored) : stored
    }
    return handleGet()
  },
  set: (key: string, value: any) => {
    value = JSON.stringify(value)
    return plasmoStorageInstance.set(key, value)
  },
  remove: (key: string) => plasmoStorageInstance.remove(key),
  clear: () => plasmoStorageInstance.clear(),
  getAll: () => plasmoStorageInstance.getAll()
}

export const $storage = {
  limits: {
    getAllLimits,
    getLimit,
    saveLimits,
    getUrlLimits,
    getStopLimits,
    getUrlAndStopsLimits,
    getShortsLimits,
    createLimit,
    upsertLimit,
    replaceShortsLimits,
    replaceUrlAndStopsLimits,
    getLimitsThatMatchCurrentUrl
  },
  excuses: {
    getAll: getAllExcuses,
    save: saveExcuse,
    saveAll: saveExcuses,
    getLimitExcuses,
    saveLimitExcuses,
    getShortsExcuses,
    saveNewLimitsExcuses,
    getUrlLimitsExcuses,
    getExcusesThatMatchCurrentUrl
  },
  advancedOptions: {
    get: getAdvancedOptions,
    set: setAdvancedOptions,
    toggleYoutubeCommentSection,
    toggleYoutubeRelatedVideos,
    toggleYoutubeShortsOnHomepage,
    toggleYoutubeGovtPrescNews,
    toggleYoutubeHomeButton,
    toggleYoutubeOtherHomeButton,
    toggleYoutubeAll
  },
  links: {
    get: getLinks,
    set: setLinks
  },
  quotes: {
    get: getQuotes,
    set: setQuotes
  },
  misc: {
    get: getMiscData,
    set: setMiscData,
    getLastPopupLimitsFetch,
    setLastLimitsFetch,
    getLastPopupAdvancedOptionsFetch,
    setLastAdvancedOptionsFetch,
    getLastSync,
    setLastSync,
    getLastAuthenticatedFetch,
    setLastAuthenticatedFetch,
    deleteLastAuthenticatedFetch
  }
}
