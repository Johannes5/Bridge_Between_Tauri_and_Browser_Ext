import { cookieUrl } from "~/constants/axios.constants";
import { logoutRequest } from "~/utils/api/requests/auth.requests";
import { $storage } from "~/utils/storage/index.utils";





export async function getToken() {
  async function getTokenFromProProTab() {
    const token = await chrome.cookies.get({
      url: cookieUrl,
      name: "x-access-token"
    })
    return token?.value
  }
  const token = await getTokenFromProProTab()
  // console.log("token", token)
  if (!token) return
  await $storage.misc.set("hasLoggedInBefore", true)
  return token
}

export async function isUserLoggedIn() {
  const token = await getToken()
  return !!token
}

export async function checkLoginStatus() {
  const isLoggedIn = !!(await isUserLoggedIn())
  if (!isLoggedIn) {
    // console.log("<< User not logged in.")

    await logoutRequest()
    throw "User not logged in"
  }
}