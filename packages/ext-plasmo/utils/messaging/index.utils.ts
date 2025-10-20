import { sendToBackground, sendToContentScript } from "@plasmohq/messaging"

import { TPopupState } from "~/types/popup.types"
import { iMakeRequestArgs } from "~/utils/api/makeRequest"

const $messaging = {
  closeTab: async () =>
    await sendToBackground({
      name: "close-tab"
    }),
  apiRequest: async (body: iMakeRequestArgs) =>
    await sendToBackground({
      name: "api-request",
      body
    }),
  log: async (body: any) =>
    await sendToBackground({
      name: "log",
      body
    }),
  updatePopupState: async (body: TPopupState) =>
    await sendToContentScript({
      name: "update-popup-state",
      body
    })
}

export default $messaging
