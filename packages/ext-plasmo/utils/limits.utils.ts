import { ICountdown, ILimit, IShortsLimit, IStopsLimit, IUrlLimit, TLimitType, TUrlAndShortsPeriod } from "~/types/limits.types";
import { generateUUID } from "~/utils/index.utils";
import { $storage } from "~/utils/storage/index.utils";
import { minutesToMilliseconds, secondsToMilliseconds } from "~/utils/time.utils";
import { doesLimitUrlMatchCurrentUrl } from "~/utils/url.utils";





export function getDefaultLimit(
  type: TLimitType,
  availablePeriods: { label: string; value: string }[]
) {
  const defaultLimit = getDefaultLimitData(type, availablePeriods)
  const defaultCountdown = getDefaultCountdown(type, {
    startingCountValue:
      type === "url" || type === "stops"
        ? (defaultLimit as IUrlLimit | IStopsLimit)?.time
        : (defaultLimit as IShortsLimit)?.watchedShortsLimit
  })
  switch (type) {
    case "url":
      return {
        uuid: generateUUID(),
        type,
        countdown: defaultCountdown,
        limit: defaultLimit,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    case "shorts":
      return {
        uuid: generateUUID(),
        type,
        countdown: defaultCountdown,
        limit: defaultLimit,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    case "stops":
      return {
        uuid: generateUUID(),
        type,
        limit: defaultLimit,
        countdown: defaultCountdown,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
  }
}

export function getDefaultLimitData(
  type: TLimitType,
  availablePeriods: { label: string; value: string }[]
): IUrlLimit | IShortsLimit | IStopsLimit {
  switch (type) {
    case "url":
      return {
        url: "",
        period: availablePeriods[0]?.value || "day",
        time: minutesToMilliseconds(15)
      } as IUrlLimit
    case "shorts":
      return {
        watchedShorts: [],
        watchedShortsLimit: 100,
        period: availablePeriods[0]?.value || "day"
      } as IShortsLimit
    case "stops":
      return {
        url: "",
        time: secondsToMilliseconds(15),
        selectedTimeUnit: "seconds"
      } as IStopsLimit
  }
}

export function getCountdownNextResetDate(
  type: TLimitType | "excuse",
  period: TUrlAndShortsPeriod
) {
  const next20Mins = new Date()
  next20Mins.setMinutes(next20Mins.getMinutes() + 20) // next 20 mins for stops
  const nextHour = new Date()
  nextHour.setHours(nextHour.getHours() + 1) // next hour for url and shorts
  const nextDay = new Date()
  nextDay.setHours(0, 0, 0, 0)
  nextDay.setDate(nextDay.getDate() + 1) // next day for url and shorts
  nextDay.setHours(3, 0, 0, 0)
  const nextWeek = new Date()
  nextWeek.setHours(0, 0, 0, 0)
  nextWeek.setDate(nextWeek.getDate() + 7) // next week for url and shorts
  const nextMonth = new Date()
  nextMonth.setHours(0, 0, 0, 0)
  nextMonth.setMonth(nextMonth.getMonth() + 1) // next month for url and shorts
  const next2Mins = new Date()
  next2Mins.setMinutes(next2Mins.getMinutes() + 2) // next 2 minutes for stops

  if (type === "url" || type === "shorts") {
    if (period === "hour") return nextHour.toISOString()
    if (period === "day") return next2Mins.toISOString()
    if (period === "week") return nextWeek.toISOString()
    if (period === "month") return nextMonth.toISOString()
  }
  if (type === "stops") return next20Mins.toISOString()
  if (type === "excuse") return nextDay.toISOString()
}

export function getDefaultCountdown(
  type: TLimitType | "excuse",
  defaults: { remnant?: number; startingCountValue?: number } = {
    remnant: 0,
    startingCountValue: 0
  }
): ICountdown {
  return {
    countBy: type === "shorts" ? 1 : 1000,
    lastUpdated: new Date().toISOString(),
    nextReset: getCountdownNextResetDate(type, "day"),
    startingCountValue: defaults?.startingCountValue,
    remnant: defaults?.remnant || defaults?.startingCountValue
  }
}

export async function triggerImmediateStopForCurrentUrl() {
  const stops = await $storage.limits.getStopLimits()
  let stopForCurrentUrl = stops.find((stop) =>
    doesLimitUrlMatchCurrentUrl(stop.limit.url, stop.type)
  )
  if (stopForCurrentUrl) {
    // reset the remnant
    stopForCurrentUrl = {
      ...stopForCurrentUrl,
      countdown: {
        ...stopForCurrentUrl.countdown,
        remnant: stopForCurrentUrl.countdown.startingCountValue
      }
    }

    await $storage.limits.upsertLimit(stopForCurrentUrl)
  } else {
    // create a new stop

    const currentUrl = window.location.href
    const cleanCurrentUrl =
      currentUrl
        .replace(/^https?:\/\/(www\.)?/, "")
        .replace(/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(\/.*)?$/, "$1") + "/"

    stopForCurrentUrl = {
      uuid: generateUUID(),
      countdown: getDefaultCountdown("stops", {
        startingCountValue: secondsToMilliseconds(15)
      }),
      limit: {
        url: cleanCurrentUrl,
        time: secondsToMilliseconds(15),
        selectedTimeUnit: "seconds"
      },
      type: "stops",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    await $storage.limits.createLimit(stopForCurrentUrl)
  }
  return stopForCurrentUrl
}

export function checkMostRecentLastUpdatedLimits(
  limits: ILimit<IUrlLimit | IStopsLimit | IShortsLimit>[]
) {
  if (!Array.isArray(limits) || !limits?.length) return
  let mostRecentLastUpdated = limits[0].updatedAt
  limits.forEach((limit) => {
    const limitLastUpdated = limit.updatedAt
    if (
      new Date(limitLastUpdated).getTime() >
      new Date(mostRecentLastUpdated).getTime()
    ) {
      mostRecentLastUpdated = limitLastUpdated
    }
  })
  return mostRecentLastUpdated
}

export async function prioritizeLocalCountdowns(
  newLimits: ILimit<IShortsLimit | IStopsLimit | IUrlLimit>[]
) {
  const localLimits = await $storage.limits.getAllLimits()
  // console.log("localLimits", localLimits)
  const resolvedNewLimits = newLimits.map((limit) => {
    const foundLimitLocalVariation = localLimits.find((l) =>
      l.type === "stops"
        ? (l.limit as IStopsLimit).url === (limit.limit as IStopsLimit).url
        : l.uuid === limit.uuid
    )

    if (!foundLimitLocalVariation) return limit

    limit.countdown = foundLimitLocalVariation.countdown
    return limit
  })
  // console.log("resolvedNewLimits", resolvedNewLimits)
  return resolvedNewLimits
}