import debounce from "lodash/debounce";
import { useEffect, useState } from "react";



import { STOP_PERIODS, URL_AND_SHORTS_PERIODS } from "~/constants/options.constants";
import { ILimit, IShortsLimit, IStopsLimit, IUrlLimit, TLimitType } from "~/types/limits.types";
import limitsRequest from "~/utils/api/requests/limits.requests";
import { checkAdvancedOptionsChangingLimitOrStopCostsOneExcuse } from "~/utils/excuses.utils";
import { validateLimit } from "~/utils/form-validations.utils";
import { getDefaultCountdown, getDefaultLimit } from "~/utils/limits.utils"
import { $storage } from "~/utils/storage/index.utils";





type TStoreLimitsOptions = {
  shouldSetState?: boolean
  shouldSetAPI?: boolean
  shouldSetStorage?: boolean
}

export default function useLimits() {
  const [limits, setLimits] = useState<
    ILimit<IUrlLimit | IShortsLimit | IStopsLimit>[]
  >([])
  const urlLimits = limits.filter((limit) => limit.type === "url")
  const shortsLimits = limits.filter((limit) => limit.type === "shorts")
  const stops = limits.filter((limit) => limit.type === "stops")
  const [loading, setLoading] = useState(true)

  // Debounced version of replaceUserLimits
  const debouncedReplaceUserLimitsRequest = debounce(
    limitsRequest.replaceUserLimits,
    1000
  )

  function handleCreateLimit(type: TLimitType) {
    let availablePeriods =
      type === "stops" ? STOP_PERIODS : URL_AND_SHORTS_PERIODS
    if (type === "shorts") {
      availablePeriods = URL_AND_SHORTS_PERIODS.filter(
        (period) =>
          !shortsLimits.some(
            (limit) => (limit?.limit as IShortsLimit)?.period === period.value
          )
      )
      if (!availablePeriods?.length)
        return alert(
          `Sorry, you've reached the maximum number of ${type} limits`
        )
    }
    const defaultLimit = getDefaultLimit(type, availablePeriods)
    // console.log("CREATE LIMIT", { defaultLimit })
    setLimits((prev) => [...prev, defaultLimit as ILimit])
  }

  async function handleUpdateLimit(
    uuid: string,
    newLimit: IStopsLimit | IUrlLimit | IShortsLimit
  ) {
    // console.log("HANDLE UPDATE LIMIT", uuid, newLimit)
    const limit = limits.find((savedLimit) => savedLimit.uuid === uuid)
    if (!limit) return

    const isPeriodChanged =
      (limit.type === "url" || limit.type === "shorts") &&
      (limit.limit as IUrlLimit).period !== (newLimit as IUrlLimit).period

    const isTimeChanged =
      (limit.type === "url" || limit.type === "stops") &&
      (limit.limit as IUrlLimit).time !== (newLimit as IUrlLimit).time

    const isShortWatchLimitChanged =
      limit.type === "shorts" &&
      (limit.limit as IShortsLimit).watchedShortsLimit !==
        (newLimit as IShortsLimit).watchedShortsLimit

    const isStopsTimeUnitChanged =
      limit.type === "stops" &&
      (limit.limit as IStopsLimit).selectedTimeUnit !==
        (newLimit as IStopsLimit).selectedTimeUnit

        const isUrlTimeUnitChanged =
          limit.type === "url" &&
          (limit.limit as IUrlLimit).timeUnit !==
            (newLimit as IUrlLimit).timeUnit
        
    // Check and reset countdown when period, time or short watch limit changes
    if (
      isPeriodChanged ||
      isTimeChanged ||
      isShortWatchLimitChanged ||
      isStopsTimeUnitChanged ||
      isUrlTimeUnitChanged
    ) {
      let startingCountValue = 0
      if (limit.type === "shorts") {
        ;(limit.limit as IShortsLimit).watchedShorts = []
        startingCountValue = (newLimit as IShortsLimit).watchedShortsLimit
      } else {
        startingCountValue = (newLimit as IUrlLimit).time
      }
      limit.countdown = getDefaultCountdown(limit.type, {
        startingCountValue
      })
    }

    // set new limit
    limit.limit = newLimit

    // Update excuses with limit changes

    // Check if changing limits should cost an excuse
    checkAdvancedOptionsChangingLimitOrStopCostsOneExcuse(limit)

    if (validateLimit(limit)) {
      const newLimits = limits.map((savedLimit) =>
        savedLimit.uuid === uuid ? limit : savedLimit
      )
      storeLimits3D(newLimits, { shouldSetState: false })
    }
    // console.log("SET LIMITS", limit)
    return setLimits((prev) =>
      prev.map((savedLimit) => (savedLimit.uuid === uuid ? limit : savedLimit))
    )
  }

  function handleDeleteLimit(uuid: string) {
    const newLimits = limits.filter((limit) => limit.uuid !== uuid)
    storeLimits3D(newLimits)
  }

  async function handleFetchLimits() {
    try {
      const fetchedLimits = await limitsRequest.getLimits({ setStorage: true })

      storeLimits3D(fetchedLimits, {
        shouldSetState: true,
        shouldSetStorage: false,
        shouldSetAPI: false
      })
      // setLimits(fetchedLimits)
    } catch (e) {
    } finally {
      // console.log("LIMITS - Setting state")
      setLoading(false)
    }
  }

  async function storeLimits3D(
    limits: ILimit<IUrlLimit | IShortsLimit | IStopsLimit>[],
    options: TStoreLimitsOptions = {}
  ) {
    const {
      shouldSetState = true,
      shouldSetAPI = true,
      shouldSetStorage = true
    } = options ?? {}

    if (shouldSetStorage) await $storage.limits.saveLimits(limits)
    if (shouldSetState) setLimits(limits)
    if (shouldSetAPI) await debouncedReplaceUserLimitsRequest(limits)
  }

  useEffect(() => {
    handleFetchLimits()
  }, [])

  return {
    limits,
    setLimits,
    urlLimits,
    shortsLimits,
    stops,
    loading,
    handleCreateLimit,
    handleUpdateLimit,
    handleDeleteLimit
  }
}