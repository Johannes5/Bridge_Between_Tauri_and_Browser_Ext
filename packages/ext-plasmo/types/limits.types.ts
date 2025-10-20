export type TLimitType = "url" | "shorts" | "stops"
export type TUrlAndShortsPeriod = "hour" | "day" | "week" | "month"
export type TStopsTimeUnit = "minutes" | "seconds"

export interface ICountdown {
  startingCountValue: number // starting value of the countdown
  countBy: number // how much to deduct by
  remnant: number // how much is left
  nextReset: string // when the countdown will reset
  lastUpdated: string // when the countdown was last updated
}

export interface IUrlLimit {
  url: string // url to limit
  period: TUrlAndShortsPeriod // period of the limit should be valid
  time: number // time of the limit in milliseconds
  timeUnit: "minutes" | "hours"
}

export interface IShortsLimit {
  watchedShorts: string[] // record of the ids of the shorts that have been watched
  watchedShortsLimit: number // limit of the shorts that can be watched
  period: TUrlAndShortsPeriod // period of the limit should be valid
}

export interface IStopsLimit {
  url: string // url to stop
  time: number // how long to stop access to the url for in milliseconds
  selectedTimeUnit: TStopsTimeUnit
}

export interface ILimit<
  iLimitInterface = IUrlLimit | IShortsLimit | IStopsLimit
> {
  uuid: string // uuid of the limit
  type: TLimitType // type of the limit
  limit: iLimitInterface // limit object
  countdown: ICountdown // countdown object
  createdAt: string // when the limit was created
  updatedAt: string // when the limit was last updated
}
