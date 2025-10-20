import { IAdvancedOptions } from "~/types/advanced-options.types"
import { IExcuse } from "~/types/excuses.types"
import {
  ILimit,
  IShortsLimit,
  IStopsLimit,
  IUrlLimit
} from "~/types/limits.types"

interface ISyncStatus<T> {
  upToDate: boolean
  data: T | null
}

export interface ISyncResponse {
  limits: ISyncStatus<ILimit<IStopsLimit | IShortsLimit | IUrlLimit>[]>
  excuses: ISyncStatus<IExcuse[]>
  advancedOptions: ISyncStatus<IAdvancedOptions>
}
