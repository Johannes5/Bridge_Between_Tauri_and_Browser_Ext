import { triggerImmediateStopForCurrentUrl } from "~/utils/limits.utils"

export const SHORTCUTS = {
  TRIGGER_STOP_POPUP: {
    hotkey: "alt+shift+S",
    handler: triggerImmediateStopForCurrentUrl
  }
}
