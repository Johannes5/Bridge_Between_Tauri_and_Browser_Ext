import { ICountdown, ILimit, IShortsLimit, IStopsLimit, IUrlLimit } from "~/types/limits.types";





export type TStage =
  | "_default"
  | "optionsTime"
  | "foSure1"
  | "foSure2"
  | "optionsYtShorts"
  | undefined

export type TExcuseAddedTime =
  | "5 mins"
  | "15 mins"
  | "1 hr"
  | "3 hrs"
  | "entire day"

export type TExcuseAddedShorts = "10" | "20" | "40" | "entire day"

export type TButtonClickAction =
  | "initiate"
  | "add"
  | "shorts-add"
  | "confirm1"
  | "confirm2"

export interface IExcuse {
  uuid: string
  limit: ILimit<IUrlLimit | IShortsLimit | IStopsLimit>
  addedTime: number | "entire day"
  countdown?: ICountdown | null
  watchedShorts?: string[] | null
  createdAt: string
  updatedAt: string
}