import { ISyncResponse } from "~/types/sync.types";
import { checkLoginStatus } from "~/utils/auth.utils";
import $messaging from "~/utils/messaging/index.utils";
import { $storage } from "~/utils/storage/index.utils";





async function sync() {
  try {
    await checkLoginStatus()

    const nowTimestamp = new Date().getTime()
    const localLimits = await $storage.limits.getAllLimits()
    const localExcuses = await $storage.excuses.getAll()
    const localAdvancedOptions = await $storage.advancedOptions.get()

    const response: ISyncResponse = await $messaging.apiRequest({
      url: "/api/sync",
      method: "POST",
      data: {
        limits: localLimits,
        excuses: localExcuses,
        advancedOptions: localAdvancedOptions
      }
    })

    // console.log("<< SYNC: Limits ->", response?.limits)

    if (
      typeof response?.limits?.upToDate === "boolean" &&
      !response?.limits?.upToDate
    ) {
      const newLimits = response?.limits?.data
      await $storage.limits.saveLimits(newLimits)

      await $storage.misc.setLastLimitsFetch(nowTimestamp)
    }

    if (
      typeof response?.excuses?.upToDate === "boolean" &&
      !response?.excuses?.upToDate
    ) {
      const newExcuses = response?.excuses?.data
      await $storage.excuses.saveAll(newExcuses)
    }

    if (
      typeof response?.advancedOptions?.upToDate === "boolean" &&
      !response?.advancedOptions?.upToDate
    ) {
      const newAdvancedOptions = response?.advancedOptions?.data
      await $storage.advancedOptions.set(newAdvancedOptions)

      await $storage.misc.setLastAdvancedOptionsFetch(nowTimestamp)
    }
  } catch (e) {
    // console.log({ SYNC_ERROR: `${e}` })
  }
}

const syncRequests = {
  sync
}

export default syncRequests