import { MISC_KEY } from "~/constants/storage.constants";
import { plasmoStorage } from "~/utils/storage/index.utils";





const defaultMiscData = {}
export interface IMisc {
  lastPopupLimitsFetch?: number
  lastPopupAdvancedOptionsFetch?: number
  lastGeneralSync?: number
  lastAuthenticatedFetch?: {
    limits?: number
    excuses?: number
    ["advanced-options"]?: number
  }
  customizePopupMode?: boolean
  hasLoggedInBefore?: boolean
}

export async function getMiscData() {
  return (await plasmoStorage.get(MISC_KEY, defaultMiscData)) as IMisc
}

export async function setMiscData(key: keyof IMisc, data: number | boolean) {
  const miscData = await getMiscData()
  const newMiscData = {
    ...miscData,
    [key]: data
  }
  await plasmoStorage.set(MISC_KEY, newMiscData)
  return newMiscData
}

export async function getLastPopupLimitsFetch(): Promise<number | undefined> {
  const storedMiscData: IMisc = await getMiscData()
  return storedMiscData?.lastPopupLimitsFetch || 0
}

export async function setLastLimitsFetch(timeStamp: number | undefined) {
  const storedMiscData: IMisc = await getMiscData()
  await plasmoStorage.set(MISC_KEY, {
    ...storedMiscData,
    lastPopupLimitsFetch: timeStamp
  })
}

export async function getLastPopupAdvancedOptionsFetch(): Promise<
  number | undefined
> {
  const storedMiscData: IMisc = await getMiscData()
  return storedMiscData?.lastPopupAdvancedOptionsFetch || 0
}

export async function setLastAdvancedOptionsFetch(
  timeStamp: number | undefined
) {
  const storedMiscData: IMisc = await getMiscData()
  await plasmoStorage.set(MISC_KEY, {
    ...storedMiscData,
    lastPopupAdvancedOptionsFetch: timeStamp
  })
}

export async function getLastSync(): Promise<number | undefined> {
  const storedMiscData: IMisc = await getMiscData()
  return storedMiscData?.lastGeneralSync || 0
}

export async function setLastSync(timeStamp: number) {
  const storedMiscData: IMisc = await getMiscData()
  await plasmoStorage.set(MISC_KEY, {
    ...storedMiscData,
    lastGeneralSync: timeStamp
  })
}

export async function getLastAuthenticatedFetch() {
  const storedMiscData: IMisc = await getMiscData()
  return storedMiscData?.lastAuthenticatedFetch
}

export async function setLastAuthenticatedFetch(
  checkingFor: "all" | "limits" | "excuses" | "advanced-options",
  timeStamp: number | undefined
) {
  const storedMiscData: IMisc = await getMiscData()
  if (checkingFor === "all") {
    const newLastAuthenticatedFetch = Object.entries(
      storedMiscData.lastAuthenticatedFetch
    ).reduce((acc, [key, _]) => {
      acc = {
        ...acc,
        [key]: timeStamp
      }
      return acc
    }, {})
    await plasmoStorage.set(MISC_KEY, {
      ...storedMiscData,
      lastAuthenticatedFetch: newLastAuthenticatedFetch
    })
  } else {
    if (!["limits", "excuses", "advanced-options"].includes(checkingFor)) return

    await plasmoStorage.set(MISC_KEY, {
      ...storedMiscData,
      lastAuthenticatedFetch: {
        ...(storedMiscData?.lastAuthenticatedFetch || {}),
        [checkingFor]: timeStamp
      }
    })
  }
}

export async function deleteLastAuthenticatedFetch(
  deletingFor: "all" | "limits" | "excuses" | "advanced-options"
) {
  const storedMiscData: IMisc = await getMiscData()
  if (storedMiscData?.lastAuthenticatedFetch) {
    const { lastAuthenticatedFetch, ...restMiscData } = storedMiscData
    if (!lastAuthenticatedFetch) return
    if (deletingFor === "all") {
      await plasmoStorage.set(MISC_KEY, {
        ...restMiscData,
        lastAuthenticatedFetch: {}
      })
    } else {
      const { [deletingFor]: _, ...restLastAuthenticatedFetch } =
        lastAuthenticatedFetch
      await plasmoStorage.set(MISC_KEY, {
        ...restMiscData,
        lastAuthenticatedFetch: restLastAuthenticatedFetch
      })
    }
  }
}