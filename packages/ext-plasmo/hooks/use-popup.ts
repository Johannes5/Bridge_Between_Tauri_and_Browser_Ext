import { useState } from "react"

import useAuthStatus from "~/hooks/use-auth-status"

export function usePopup() {
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const {
    hasLoggedInBefore,
    handleClickConnectionButton,
    loading: loadingLogin,
    userLoggedIn,
    error: loginError,
    checkingLoginStatus
  } = useAuthStatus()

  return {
    userLoggedIn,
    showAdvancedOptions,
    setShowAdvancedOptions,
    hasLoggedInBefore,
    handleClickConnectionButton,
    loadingLogin,
    loginError,
    checkingLoginStatus
  }
}
