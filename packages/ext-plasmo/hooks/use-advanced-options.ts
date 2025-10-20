import debounce from "lodash/debounce";
import { useEffect, useState } from "react"

import { IAdvancedOptions } from "~/types/advanced-options.types"
import advancedOptionsRequests from "~/utils/api/requests/advanced-options.requests"
import { $storage } from "~/utils/storage/index.utils"

export default function useAdvancedOptions() {
  const [loading, setLoading] = useState(true)
  const [advancedOptions, setAdvancedOptions] = useState<IAdvancedOptions>({})

  function handleSetAdvancedOptions(advancedOptions: IAdvancedOptions) {
    setAdvancedOptions(advancedOptions)
    $storage.advancedOptions.set(advancedOptions)
    advancedOptionsRequests.updateUserAdvancedOptions(advancedOptions)
  }

  const debouncedUpdateUserAdvancedOptions = debounce(
    advancedOptionsRequests.updateUserAdvancedOptions,
    1000
  )

  async function getAdvancedOptions() {
    // console.log("ADVANCED OPTIONS - Before request")
    const advancedOptions =
      await advancedOptionsRequests.getUserAdvancedOptions()
    // console.log("ADVANCED OPTIONS - After request")
    // console.log("ADVANCED OPTIONS - Setting state", advancedOptions)
    setLoading(false)
    setAdvancedOptions(advancedOptions)
  }

  useEffect(() => {
    getAdvancedOptions()
  }, [])

  return {
    loading,
    advancedOptions,
    setAdvancedOptions: handleSetAdvancedOptions // debouncedHandleSetAdvancedOptions
  }
}