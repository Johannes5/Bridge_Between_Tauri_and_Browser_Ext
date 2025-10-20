import { IAdvancedOptions } from "~/types/advanced-options.types";
import { checkLoginStatus } from "~/utils/auth.utils";
import $messaging from "~/utils/messaging/index.utils";
import { $storage } from "~/utils/storage/index.utils";
import { minutesToMilliseconds } from "~/utils/time.utils";





async function getUserAdvancedOptions(): Promise<IAdvancedOptions> {
  try {
    // throw new Error("test")
    await checkLoginStatus()
    const lastFetchTimestamp =
      await $storage.misc.getLastPopupAdvancedOptionsFetch()
    const nowTimestamp = new Date().getTime()
    const advancedOptLastAuthenticatedFetch = (
      await $storage.misc.getLastAuthenticatedFetch()
    )?.["advanced-options"]
    if (
      (advancedOptLastAuthenticatedFetch &&
        nowTimestamp - advancedOptLastAuthenticatedFetch <
          minutesToMilliseconds(1)) ||
      (lastFetchTimestamp &&
        nowTimestamp - lastFetchTimestamp < minutesToMilliseconds(1))
    )
      throw "Data was last fetched less than 1 minute ago"

    const response = await $messaging.apiRequest({
      method: "GET",
      url: "/api/advanced-options"
    })

    // console.log("ADVANCED OPTIONS - Response", response)

    await $storage.misc.setLastAdvancedOptionsFetch(nowTimestamp)
    $storage.misc.setLastAuthenticatedFetch("advanced-options", nowTimestamp)

    await $storage.advancedOptions.set(response as IAdvancedOptions)

    return response as IAdvancedOptions
  } catch (e) {
    // console.log("ADVANCED OPTIONS - Error", e)

    return (await $storage.advancedOptions.get()) as IAdvancedOptions
  }
}

async function updateUserAdvancedOptions(options: IAdvancedOptions) {
  const data = {
    ...options
  }
  const response = await $messaging.apiRequest({
    method: "PATCH",
    url: "/api/advanced-options",
    data
  })
  return response
}

async function getYouTubeDislikeRatio(videoId: string) {
  const response = await $messaging.apiRequest({
    method: "GET",
    url: "/api/advanced-options/youtube-dislike-ratio?videoId=" + videoId
  })
  return response
}

const advancedOptionsRequests = {
  getUserAdvancedOptions,
  updateUserAdvancedOptions,
  getYouTubeDislikeRatio
}

export default advancedOptionsRequests