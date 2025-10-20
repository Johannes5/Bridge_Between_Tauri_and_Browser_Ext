import {
  ICountdown,
  ILimit,
  IShortsLimit,
  IStopsLimit,
  IUrlLimit,
  TLimitType
} from "~/types/limits.types"
import { getCountdownNextResetDate } from "~/utils/limits.utils"
import { $storage } from "~/utils/storage/index.utils"

export function handleResetDuringCountdown(
  // limit: ILimit<IUrlLimit | IStopsLimit | IShortsLimit>
  countdown: ICountdown,
  type: TLimitType | "excuse",
  limit: IUrlLimit | IStopsLimit | IShortsLimit
): { countdown: ICountdown; didReset: boolean } {
  let didReset = false
  // check if next reset is in the past
  const nextReset = new Date(countdown.nextReset)
  const now = new Date()

  if (nextReset <= now && type !== "excuse") {
    // if it is, change the countdown.remnant to the countdown.startingCountValue, then update the next reset date based on the countdown.nextReset
    countdown.remnant = countdown.startingCountValue
    countdown.nextReset = getCountdownNextResetDate(
      type,
      (limit as IShortsLimit).period
    )
    didReset = true
  }
  // console.log("After reset "+type, {countdown})
  return {
    countdown: countdown,
    didReset
  }
}

export async function getLimitWithLowestCountdownRemnant() {
  const limits = await $storage.limits.getLimitsThatMatchCurrentUrl()
  // .filter(
  //   (limit) => Boolean(limit?.countdown?.remnant)
  // )
  if (!limits.length) return null
  return limits.reduce((min, limit) => {
    return limit.countdown.remnant < min.countdown.remnant ? limit : min
  }, limits[0])
}

export async function setCountdownRemnantToZero(
  limit: ILimit<IUrlLimit | IStopsLimit | IShortsLimit>
) {
  limit.countdown.remnant = 0
  await $storage.limits.upsertLimit(limit)
}
