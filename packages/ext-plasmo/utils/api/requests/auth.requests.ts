import { axiosInstance, cookieUrl } from "~/constants/axios.constants"
import { $storage } from "~/utils/storage/index.utils"

export async function loginRequest() {
  const res = await (await axiosInstance()).post("/api/auth")
  const redirectUrl = res?.data?.redirectUrl
  await chrome.tabs.create({ url: redirectUrl })

  const hasLoggedInBefore = !!(await $storage.misc.get())?.hasLoggedInBefore
  if (!hasLoggedInBefore) await $storage.misc.set("hasLoggedInBefore", true)
}

export async function logoutRequest(userInduced = false) {
  if (userInduced) await $storage.misc.set("hasLoggedInBefore", false)
  await $storage.misc.setLastLimitsFetch(undefined)
  await $storage.misc.setLastAdvancedOptionsFetch(undefined)
  $storage.misc.deleteLastAuthenticatedFetch("all")
  try {
    await chrome.cookies.remove({
      name: "x-access-token",
      url: cookieUrl
    })
  } catch (e) {
    console.error("Error removing cookie:", e)
  }
}
