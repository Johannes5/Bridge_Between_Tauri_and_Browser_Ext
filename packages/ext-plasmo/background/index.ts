import "@plasmohq/messaging/background"

import { startHub } from "@plasmohq/messaging/pub-sub"

console.log(`BGSW - Starting Hub`)
startHub()

console.log("background script loaded")

// chrome.runtime.onInstalled.addListener(async (details) => {
//   if (details.reason === "install") {
//     await plasmoStorage.clear()

//     // Alarms to keep the BG scripts alive
//     chrome.alarms.create("keep-loaded-alarm--1", {
//       periodInMinutes: 0.1
//     })
//   }
// })

// // Alarms to keep the BG scripts alive
// chrome.alarms.create("keep-loaded-alarm-0", {
//   periodInMinutes: 1
// })
// setTimeout(
//   () =>
//     chrome.alarms.create("keep-loaded-alarm-1", {
//       periodInMinutes: 1
//     }),
//   20000
// )
// setTimeout(
//   () =>
//     chrome.alarms.create("keep-loaded-alarm-2", {
//       periodInMinutes: 1
//     }),
//   40000
// )

// chrome.alarms.onAlarm.addListener(() => {
//   console.log("keeping extension alive - log for debug")
// })
