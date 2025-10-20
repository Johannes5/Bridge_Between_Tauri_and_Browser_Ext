import syncRequests from "~/utils/api/requests/sync.requests"
import { $storage } from "~/utils/storage/index.utils"
import { minutesToMilliseconds } from "~/utils/time.utils"

export async function handleGeneralSync() {
  try {
    const syncInterval = minutesToMilliseconds(10)
    const now = new Date().getTime()

    const lastSync = await $storage.misc.getLastSync()
    if (lastSync) {
      const lastSyncDate = new Date(lastSync)
      const lastSyncDateTimestamp = lastSyncDate.getTime()

      if (now - lastSyncDateTimestamp < syncInterval) return // means it was run < 10 mins ago
    }
    // Runs sync for Limits, Excuses and Advanced Options.
    await syncRequests.sync()
    await $storage.misc.setLastSync(now)
  } catch (e) {
    console.error(`Syncing error: ${e}`)
  }
}
