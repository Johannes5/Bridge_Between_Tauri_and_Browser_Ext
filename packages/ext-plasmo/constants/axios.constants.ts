import axios, { AxiosError, AxiosResponse } from "axios"

import { logoutRequest } from "~/utils/api/requests/auth.requests"
import { getToken, isUserLoggedIn } from "~/utils/auth.utils"
import { $storage } from "~/utils/storage/index.utils"

export var prodUrl = "https://short.propro.so"
export var localUrl = "http://localhost:5522"
export var backendBaseUrl = localUrl

export const cookieUrl =
  backendBaseUrl === localUrl
    ? (localUrl as string)?.replace("http://", "https://")
    : prodUrl

export const axiosInstance = async () => {
  const token = await getToken()
  let headers: Record<string, string> | undefined
  if (token) headers = { Authorization: `Bearer ${token}` }
  const instance = axios.create({
    baseURL: backendBaseUrl,
    headers
  })

  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      // console.log("Success")
      return response
    },
    async (error: AxiosError) => {
      if (
        error.response?.status === 302 &&
        typeof error.response.data === "object" &&
        error.response.data &&
        "url" in error.response.data
      ) {
        return error.response
      }

      if ([401, 403].includes(error.response?.status)) {
        // log user out
        logoutRequest(false)
      }
      return Promise.reject(error)
    }
  )

  return instance
}

export async function shouldRunSettingsApiRequest() {
  const userLoggedIn = await isUserLoggedIn()
  const advancedOptions = await $storage.advancedOptions.get()
  return userLoggedIn && !advancedOptions?.shouldOverrideSettings
}

export async function shouldRunLimitsApiRequest() {
  const userLoggedIn = await isUserLoggedIn()
  const advancedOptions = await $storage.advancedOptions.get()
  return userLoggedIn && !advancedOptions?.shouldOverrideLimits
}

export async function shouldRunStopsApiRequest() {
  const userLoggedIn = await isUserLoggedIn()
  const advancedOptions = await $storage.advancedOptions.get()
  return userLoggedIn && !advancedOptions?.shouldOverrideStops
}
