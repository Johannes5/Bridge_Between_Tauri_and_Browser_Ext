import {
  ILimit,
  IShortsLimit,
  IStopsLimit,
  IUrlLimit
} from "~/types/limits.types"

export type TPopupType =
  // Nil
  | "none"
  // From limits
  | "url_limit_exceeded"
  | "shorts_limit_exceeded"
  | "stop"
  // From mode changes
  | "customize_popup_mode"

export type TPopupState = {
  showPopup: boolean
  popupType: TPopupType
  limit?: ILimit<IUrlLimit | IShortsLimit | IStopsLimit>
}
