import { IExcuse } from "~/types/excuses.types";
import { checkLoginStatus } from "~/utils/auth.utils"
import $messaging from "~/utils/messaging/index.utils";
import { $storage } from "~/utils/storage/index.utils";





async function getUserExcuses() {
  try {
    await checkLoginStatus()
    const response = await $messaging.apiRequest({
      method: "GET",
      url: "/api/excuses"
    })
    $storage.misc.setLastAuthenticatedFetch("excuses", new Date().getTime())
    return response?.data
  } catch (e) {
    return await $storage.excuses.getAll()
  }
}

async function replaceUserExcuses(excuses: IExcuse[]) {
  const data = {
    excuses: [...excuses]
  }
  const response = await $messaging.apiRequest({
    method: "PATCH",
    url: "/api/excuses",
    data
  })

  return response?.data
}

async function createUserExcuse(excuse: IExcuse) {
  const savedExcuses = await $storage.excuses.getAll()

  const data = {
    excuses: [...savedExcuses, excuse]
  }
  const response = await $messaging.apiRequest({
    method: "PATCH",
    url: "/api/excuses",
    data
  })

  return response?.data
}

const excusesRequests = {
  getUserExcuses,
  replaceUserExcuses,
  createUserExcuse
}

export default excusesRequests