import { EXCUSES_STORAGE_KEY } from "~/constants/storage.constants"
import { IExcuse } from "~/types/excuses.types"
import { IUrlLimit } from "~/types/limits.types"
import { plasmoStorage } from "~/utils/storage/index.utils"
import { isISODateBeforeToday } from "~/utils/time.utils"
import { doesLimitUrlMatchCurrentUrl, isInShorts } from "~/utils/url.utils"

export async function getAllExcuses() {
  const excuses = await plasmoStorage.get<IExcuse[]>(EXCUSES_STORAGE_KEY, [])
  const validExcuses = excuses.filter((excuse) => {
    if (isISODateBeforeToday(excuse.createdAt)) return false

    const isExpired =
      (excuse.limit.type === "url" || excuse.limit.type === "shorts") &&
      isISODateBeforeToday(excuse.limit.countdown.nextReset) &&
      isISODateBeforeToday(excuse.createdAt)

    // Check if time for this excuse to be removed per their nextReset Date.
    const nextReset = new Date(excuse.countdown.nextReset)
    const now = new Date()
    const isResetDateExhausted = nextReset <= now

    return !isExpired && !isResetDateExhausted
  })

  saveExcuses(validExcuses)
  return validExcuses
}

export async function saveExcuses(excuses: IExcuse[]) {
  return plasmoStorage.set(EXCUSES_STORAGE_KEY, excuses)
}

export async function saveExcuse(excuse: IExcuse) {
  const excuses = await getAllExcuses()
  const allExcuses = [...excuses, excuse]
  await saveExcuses(allExcuses)

  return allExcuses
}

export async function getLimitExcuses(limitUUID: string) {
  const excuses = await getAllExcuses()
  return excuses.filter((excuse) => excuse.limit.uuid === limitUUID)
}

export async function getShortsExcuses() {
  const excuses = await getAllExcuses()
  return excuses.filter(async (excuse) => {
    return excuse.limit?.type === "shorts"
  })
}

export async function getUrlLimitsExcuses() {
  const excuses = await getAllExcuses()
  return excuses.filter((excuse) => {
    return excuse.limit?.type === "url"
  })
}

export async function saveLimitExcuses(
  limitUUID: string,
  newLimitExcuses: IExcuse[]
) {
  const allExcuses = await getAllExcuses()
  const filteredExcuses = allExcuses.filter(
    (excuse) => excuse.limit.uuid !== limitUUID
  )
  filteredExcuses.push(...newLimitExcuses)
  return saveExcuses(filteredExcuses)
}

export async function saveNewLimitsExcuses(newLimitExcuses: IExcuse[]) {
  const allExcuses = await getAllExcuses()

  const updatedExcuses = allExcuses.map((excuse) => {
    const excuseNewState = newLimitExcuses.find(
      (newExcuse) => newExcuse.uuid === excuse.uuid
    )

    if (!excuseNewState) return excuse

    newLimitExcuses.splice(newLimitExcuses.indexOf(excuseNewState), 1)
    return excuseNewState
  })

  if (newLimitExcuses.length > 0) updatedExcuses.push(...newLimitExcuses)

  await saveExcuses(updatedExcuses)
  return updatedExcuses
}

export async function getExcusesThatMatchCurrentUrl() {
  if (isInShorts()) return await getShortsExcuses()

  const excuses = await getUrlLimitsExcuses()

  return excuses.filter((excuse) => {
    return doesLimitUrlMatchCurrentUrl(
      (excuse.limit.limit as IUrlLimit).url,
      excuse.limit.type
    )
  })
}
