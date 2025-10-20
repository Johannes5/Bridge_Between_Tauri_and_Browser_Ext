import {
  defaultShortsLimits,
  defaultStops,
  defaultUrlLimits
} from "~/constants/defaults.constants"
import { LIMITS_STORAGE_KEY } from "~/constants/storage.constants"
import {
  ICountdown,
  ILimit,
  IShortsLimit,
  IStopsLimit,
  IUrlLimit
} from "~/types/limits.types"
import { getCountdownNextResetDate } from "~/utils/limits.utils"
import { $storage, plasmoStorage } from "~/utils/storage/index.utils"
import { doesLimitUrlMatchCurrentUrl, isInShorts } from "~/utils/url.utils"

export async function getAllLimits(): Promise<
  ILimit<IUrlLimit | IShortsLimit | IStopsLimit>[]
> {
  const limits = await plasmoStorage.get<ILimit<unknown>[]>(LIMITS_STORAGE_KEY)
  if (!limits) {
    // store and return defaults
    const defaultLimits = [
      ...defaultUrlLimits,
      ...defaultShortsLimits,
      ...defaultStops
    ]
    await saveLimits(defaultLimits)
    return defaultLimits
  }
  return limits as ILimit<IUrlLimit | IShortsLimit | IStopsLimit>[]
}
export async function getLimit(limitUUID: string) {
  const limits = await getAllLimits()
  return limits.find((limit) => limit.uuid === limitUUID)
}
export async function saveLimits(limits: ILimit<unknown>[]) {
  await plasmoStorage.set(LIMITS_STORAGE_KEY, limits)
  return limits
}
export async function getUrlLimits() {
  const allLimits = await getAllLimits()
  const urlLimits = allLimits.filter((limit) => limit.type === "url")
  return urlLimits as ILimit<IUrlLimit>[]
}
export async function getShortsLimits() {
  const allLimits = await getAllLimits()
  const urlLimits = allLimits.filter((limit) => limit.type === "shorts")
  return urlLimits as ILimit<IShortsLimit>[]
}
export async function getStopLimits() {
  const allLimits = await getAllLimits()
  const urlLimits = allLimits.filter((limit) => limit.type === "stops")
  return urlLimits as ILimit<IStopsLimit>[]
}
export async function getUrlAndStopsLimits() {
  const allLimits = await getAllLimits()
  let urlLimits: ILimit<IUrlLimit>[] = []
  let stopsLimits: ILimit<IStopsLimit>[] = []
  allLimits.forEach((limit) => {
    if (limit.type === "url") {
      urlLimits.push(limit as ILimit<IUrlLimit>)
    } else if (limit.type === "stops") {
      stopsLimits.push(limit as ILimit<IStopsLimit>)
    }
  })
  return { urlLimits, stopsLimits }
}
export async function createLimit(
  limit: ILimit<IUrlLimit | IStopsLimit | IShortsLimit>
) {
  const allLimits = await getAllLimits()
  const newLimits = [...allLimits, limit]
  await saveLimits(newLimits)
  return newLimits
}
/**
 * Updates the limit, but creates it if it doesn't exist.
 */
export async function upsertLimit(
  limit: ILimit<IUrlLimit | IStopsLimit | IShortsLimit>
): Promise<ILimit<IUrlLimit | IStopsLimit | IShortsLimit>[]> {
  const allLimits = await getAllLimits()
  const limitToUpdate = allLimits.find(
    (savedLimit) => savedLimit.uuid === limit.uuid
  )
  let newLimits = []
  if (limitToUpdate) {
    newLimits = allLimits.map(function (
      prevLimit: ILimit<IUrlLimit | IShortsLimit | IStopsLimit>
    ) {
      if (prevLimit.uuid === limit.uuid) {
        const periodChanged =
          (prevLimit.type === "url" || prevLimit.type === "shorts") &&
          (prevLimit.limit as IUrlLimit | IShortsLimit).period !==
            (limit.limit as IUrlLimit).period
        const limitCounterChanged =
          prevLimit.type === "url" || prevLimit.type === "stops"
            ? (prevLimit?.limit as IUrlLimit | IStopsLimit)?.time !==
              (limit.limit as IUrlLimit | IStopsLimit).time
            : (prevLimit?.limit as IShortsLimit)?.watchedShortsLimit !==
              (limit.limit as IShortsLimit).watchedShortsLimit
        const watchedShortsLimitChanged =
          prevLimit.type === "shorts" &&
          (prevLimit?.limit as IShortsLimit).watchedShortsLimit !==
            (limit.limit as IShortsLimit).watchedShortsLimit

        let newCountdown: ICountdown = limit.countdown
        if (periodChanged) {
          newCountdown = {
            ...newCountdown,
            nextReset: getCountdownNextResetDate(
              limit.type,
              (limit.limit as IUrlLimit).period
            ),
            lastUpdated: new Date().toISOString()
          }
        }

        if (limitCounterChanged) {
          newCountdown = {
            ...newCountdown,
            startingCountValue: (limit.limit as IUrlLimit | IStopsLimit).time,
            remnant: (limit.limit as IUrlLimit | IStopsLimit).time
          }
        }

        if (watchedShortsLimitChanged) {
          newCountdown = {
            ...newCountdown,
            startingCountValue: (limit.limit as IShortsLimit)
              .watchedShortsLimit,
            remnant: (limit.limit as IShortsLimit).watchedShortsLimit
          }
        }

        return {
          ...limit,
          countdown: newCountdown
        }
      }
      return prevLimit
    })
  } else {
    newLimits = [...allLimits, limit]
  }
  await saveLimits(newLimits)
  return newLimits
}

export async function replaceShortsLimits(
  shortsLimits: ILimit<IShortsLimit>[]
) {
  const allLimits = await getAllLimits()
  const nonShortsLimits = allLimits.filter((limit) => limit.type !== "shorts")
  const newLimits = [...nonShortsLimits, ...shortsLimits]
  await saveLimits(newLimits)
  return newLimits
}

export async function replaceUrlAndStopsLimits(
  urlAndStopsLimits: ILimit<IUrlLimit | IStopsLimit>[]
) {
  const allLimits = await getAllLimits()
  const nonUrlAndStopsLimits = allLimits.filter(
    (limit) => limit.type !== "url" && limit.type !== "stops"
  )
  const newLimits = [...nonUrlAndStopsLimits, ...urlAndStopsLimits]
  await saveLimits(newLimits)
  return newLimits
}

export async function getLimitsThatMatchCurrentUrl(): Promise<
  ILimit<IUrlLimit | IStopsLimit | IShortsLimit>[]
> {
  if (isInShorts()) return await $storage.limits.getShortsLimits()

  const relevantLimits = await $storage.limits.getUrlLimits()

  const limitsThatMatchCurrentUrl = relevantLimits.filter((limit) => {
    return doesLimitUrlMatchCurrentUrl(
      (limit.limit as IUrlLimit | IStopsLimit).url,
      limit.type
    )
  })
  return limitsThatMatchCurrentUrl as ILimit<IUrlLimit | IStopsLimit>[]
}
