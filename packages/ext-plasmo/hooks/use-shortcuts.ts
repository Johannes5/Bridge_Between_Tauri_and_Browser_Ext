import { useHotkeys } from "@mantine/hooks"

import { SHORTCUTS } from "~/constants/shortcuts.constants"

export default function useShortcuts() {
  const shortcutsArray = Object.values(SHORTCUTS).map(
    (shortcut) =>
      [shortcut.hotkey, () => shortcut.handler()] as [string, () => void]
  )
  useHotkeys(shortcutsArray)
}
