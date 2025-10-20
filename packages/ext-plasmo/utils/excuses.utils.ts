import {
  IExcuse,
  TExcuseAddedShorts,
  TExcuseAddedTime
} from "~/types/excuses.types"
import { ILimit } from "~/types/limits.types"
import { generateUUID } from "~/utils/index.utils"
import { handleResetDuringCountdown } from "~/utils/limit-countdown.utils"
import { getDefaultCountdown } from "~/utils/limits.utils"
import { $storage } from "~/utils/storage/index.utils"
import {
  hoursToMilliseconds,
  minutesToMilliseconds,
  readableTimestamp
} from "~/utils/time.utils"
import { getShortIdFromUrl, isInShorts } from "~/utils/url.utils"

export function computeAddedTime(
  addedLimit: TExcuseAddedTime | TExcuseAddedShorts
): number | "entire day" {
  switch (addedLimit) {
    case "5 mins":
      // return minutesToMilliseconds(5)
      return minutesToMilliseconds(0.5)
    case "15 mins":
      return minutesToMilliseconds(15)
    case "1 hr":
      return hoursToMilliseconds(1)
    case "3 hrs":
      return hoursToMilliseconds(3)
    case "10":
      return 10
    case "20":
      return 20
    case "40":
      return 40
    case "entire day":
      return "entire day"
  }
}

export async function getExcusesLeft() {
  const advancedOptions = await $storage.advancedOptions.get()
  const defaultMaxExcuses = advancedOptions?.numberOfExcusesPerDay || 2
  let excuses = await $storage.excuses.getAll()
  // console.log("getExcusesLeft", {
  //   excuses
  // })
  if (advancedOptions?.excusesAreSpecific) {
    excuses = isInShorts()
      ? await $storage.excuses.getShortsExcuses()
      : await $storage.excuses.getUrlLimitsExcuses()
  }
  const excusesLengthDiff = defaultMaxExcuses - excuses.length
  const timeLeft = excusesLengthDiff < 0 ? 0 : excusesLengthDiff

  return timeLeft
}

export async function countdownAndGetValidShortsLimitExcuses() {
  const excuses = await $storage.excuses.getShortsExcuses()
  if (!excuses.length) return []

  let newLimitExcuses = await Promise.all(
    excuses.map(async (excuse) => {
      if (
        excuse.addedTime === "entire day" ||
        !excuse?.countdown ||
        excuse.countdown.remnant <= 0
      )
        return excuse

      const shortId = getShortIdFromUrl()

      if (
        excuse.watchedShorts &&
        shortId &&
        excuse.watchedShorts.includes(shortId)
      )
        return excuse

      const watchedShorts = excuse?.watchedShorts || []

      const { countdown, didReset } = handleResetDuringCountdown(
        excuse.countdown,
        "excuse",
        excuse.limit.limit
      )

      if (didReset) excuse.countdown = countdown

      const newCountdownRemnant =
        excuse.countdown.remnant - excuse.countdown.countBy
      excuse.countdown.remnant =
        newCountdownRemnant < 0 ? 0 : newCountdownRemnant

      watchedShorts.push(shortId)
      excuse.watchedShorts = watchedShorts

      return excuse
    })
  )

  const newLimitExcusesCopy = JSON.parse(JSON.stringify(newLimitExcuses))
  await $storage.excuses.saveNewLimitsExcuses(newLimitExcusesCopy)

  // return newLimitExcuses
  return newLimitExcuses.filter(
    (excuse) =>
      excuse.addedTime === "entire day" ||
      (typeof excuse.addedTime === "number" &&
        excuse?.countdown?.remnant &&
        excuse.countdown.remnant > 0)
  )
}

export async function countdownAndGetValidUrlLimitExcuses() {
  const excuses = await $storage.excuses.getUrlLimitsExcuses()

  if (!excuses?.length) return []

  let newLimitExcuses = excuses.map((excuse) => {
    if (
      excuse.addedTime === "entire day" ||
      !excuse?.countdown ||
      excuse.countdown.remnant <= 0
    )
      return excuse

    const { countdown } = handleResetDuringCountdown(
      excuse.countdown,
      "excuse",
      excuse.limit.limit
    )

    // if (didReset) return false
    excuse.countdown = countdown

    const newCountdownRemnant =
      excuse.countdown.remnant - excuse.countdown.countBy

    excuse.countdown.remnant = newCountdownRemnant < 0 ? 0 : newCountdownRemnant

    return excuse
  })

  const newLimitExcusesCopy = JSON.parse(JSON.stringify(newLimitExcuses))
  await $storage.excuses.saveNewLimitsExcuses(newLimitExcusesCopy)

  return newLimitExcuses.filter((excuse) => {
    return (
      excuse.addedTime === "entire day" ||
      (typeof excuse.addedTime === "number" &&
        excuse?.countdown?.remnant &&
        excuse.countdown.remnant > 0)
    )
  })
}

export async function getExcuseWithLowestCountdownRemnant() {
  const excuses = (
    await $storage.excuses.getExcusesThatMatchCurrentUrl()
  ).filter((excuse) => Boolean(excuse?.countdown?.remnant))
  if (!excuses.length) return null
  return excuses.reduce((min, excuse) => {
    return excuse.countdown.remnant < min.countdown.remnant ? excuse : min
  }, excuses[0])
}

export async function checkAdvancedOptionsChangingLimitOrStopCostsOneExcuse(
  limit: ILimit
) {
  const advancedOptions = await $storage.advancedOptions.get()
  if (!advancedOptions.changingLimitOrStopCostsOneExcuse) return

  const newExcuse: IExcuse = {
    uuid: generateUUID(),
    limit,
    addedTime: 0,
    countdown: getDefaultCountdown(limit.type),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  await $storage.excuses.save(newExcuse)
}

export function checkMostRecentLastUpdatedExcuses(excuses: IExcuse[]) {
  if (!Array.isArray(excuses) || !excuses?.length) return
  let mostRecentLastUpdated = excuses[0].updatedAt
  excuses.forEach((excuse) => {
    const excuseLastUpdated = excuse.updatedAt
    if (
      new Date(excuseLastUpdated).getTime() >
      new Date(mostRecentLastUpdated).getTime()
    ) {
      mostRecentLastUpdated = excuseLastUpdated
    }
  })
  return mostRecentLastUpdated
}

export function getLimitTimeLeft(leastLimit: ILimit, leastExcuse: IExcuse) {
  let timeLeftFormatted = ""
  const userInShorts = isInShorts()
  const timeLeft = leastLimit.countdown.remnant
  const timeLeftReadable = readableTimestamp(timeLeft < 0 ? 0 : timeLeft)
  timeLeftFormatted =
    timeLeft > 0
      ? `${userInShorts ? `${timeLeft} shorts` : timeLeftReadable} left`
      : userInShorts
        ? "No shorts left"
        : "Time up"

  if (timeLeft <= 0) {
    if (leastExcuse) {
      const timeLeft = leastExcuse.countdown.remnant
      const timeLeftReadable = readableTimestamp(timeLeft < 0 ? 0 : timeLeft)
      timeLeftFormatted =
        timeLeft > 0
          ? `${userInShorts ? `${timeLeft} shorts` : timeLeftReadable} left`
          : userInShorts
            ? "No shorts left"
            : "Time up"
    }
  }

  return { timeLeft, timeLeftFormatted }
}
