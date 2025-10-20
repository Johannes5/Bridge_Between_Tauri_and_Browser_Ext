import {
  ILimit,
  IShortsLimit,
  IStopsLimit,
  IUrlLimit
} from "~/types/limits.types"

export const validateLimit = (
  limit: ILimit<IStopsLimit | IUrlLimit | IShortsLimit>
) => {
  if (limit.type === "url") return !!(limit as ILimit<IUrlLimit>).limit?.url
  if (limit.type === "shorts") return true
  if (limit.type === "stops") return !!(limit as ILimit<IUrlLimit>).limit?.url
}