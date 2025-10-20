import { createRoot } from "react-dom/client"

import { REMINDER } from "~/constants/components.constants"
import { readableTimestamp } from "~/utils/time.utils"

export function showReminder(timeLeft: number) {
  const timeLeftReadable = readableTimestamp(timeLeft)
  // Create container
  const container = document.createElement("div")
  document.body.appendChild(container)

  // Create root and render
  const root = createRoot(container)

  const reminderComponent = REMINDER(timeLeftReadable)

  root.render(reminderComponent)

  setTimeout(() => {
    root.render(reminderComponent)
    setTimeout(() => {
      root.unmount()
      container.remove()
    }, 500)
  }, 4500)
}
