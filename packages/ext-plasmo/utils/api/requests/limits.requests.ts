import { ILimit, IShortsLimit, IStopsLimit, IUrlLimit } from "~/types/limits.types";
import { checkLoginStatus } from "~/utils/auth.utils";
import { prioritizeLocalCountdowns } from "~/utils/limits.utils"
import $messaging from "~/utils/messaging/index.utils"
import { $storage } from "~/utils/storage/index.utils"
import { minutesToMilliseconds } from "~/utils/time.utils"

async function getLimits({ setStorage = true }: { setStorage?: boolean } = {}) {
  type LimitsType = ILimit<IUrlLimit | IShortsLimit | IStopsLimit>[]
  try {
    // throw new Error("test")
    // console.log("<< Before throw.")
    await checkLoginStatus()
    // console.log("<< After throw.")
    const lastFetchTimestamp = await $storage.misc.getLastPopupLimitsFetch()
    // console.log("<< After lastFetchTimestamp -", lastFetchTimestamp)
    let nowTimestamp = new Date().getTime()
    const limitsLastAuthenticatedFetch = (
      await $storage.misc.getLastAuthenticatedFetch()
    )?.limits

    if (
      (limitsLastAuthenticatedFetch &&
        nowTimestamp - limitsLastAuthenticatedFetch <
          minutesToMilliseconds(1)) ||
      (lastFetchTimestamp &&
        nowTimestamp - lastFetchTimestamp < minutesToMilliseconds(1))
    ) {
      // console.log("<< 1 min Rate Limit.")
      throw "Data was last fetched less than 1 minute ago"
    }
    // console.log("<< limit fetch started")
    const response = await $messaging.apiRequest({
      method: "GET",
      url: "/api/limits"
    })

    // console.log("<< limit fetch response.", response?.user_limits)
    if (typeof response?.success === "boolean" && !response?.success) {
      // console.log("Failed to fetch limits", response)
      throw new Error("Failed to fetch limits")
    }

    nowTimestamp = new Date().getTime()
    // console.log("Limit fetch 3", response?.user_limits)
    await $storage.misc.setLastLimitsFetch(nowTimestamp)
    $storage.misc.setLastAuthenticatedFetch("limits", nowTimestamp)
    // console.log("Fetched limits response", response)

    const fetchedLimits = await prioritizeLocalCountdowns(
      (response?.user_limits || []) as LimitsType
    )
    // await $storage.limits.saveLimits(fetchedLimits)
    if (setStorage) {
      // console.log("Setting storage")
      await $storage.limits.saveLimits(fetchedLimits)
    }
    return fetchedLimits
  } catch (e) {
    // console.log("<< Error caught.", e)
    return (await $storage.limits.getAllLimits()) as LimitsType
  }
}

async function replaceUserLimits(
  limits: ILimit<IUrlLimit | IShortsLimit | IStopsLimit>[]
) {
  if (!limits) return
  const data = {
    user_limits: limits
  }
  return await $messaging.apiRequest({
    method: "PATCH",
    url: "/api/limits",
    data
  })
}

async function updateSingleLimit(id: string, data = {}) {
  return await $messaging.apiRequest({
    method: "PUT",
    url: `/api/limits/${id}`,
    data
  })
}

const limitsRequest = {
  getLimits,
  replaceUserLimits,
  updateSingleLimit
}

export default limitsRequest