import { useEffect, useState } from "react";



import { loginRequest, logoutRequest } from "~/utils/api/requests/auth.requests";
import { getToken } from "~/utils/auth.utils";
import { $storage } from "~/utils/storage/index.utils";





export default function useAuthStatus() {
  const [checkingLoginStatus, setCheckingLoginStatus] = useState(true)
  const [userLoggedIn, setUserLoggedIn] = useState(false)
  const [hasLoggedInBefore, setHasLoggedInBefore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleLogin() {
    try {
      setLoading(true)
      await loginRequest()
      // setUserLoggedIn && setUserLoggedIn(true)
    } catch (e) {
      setError(`${e}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await logoutRequest(true)
    setUserLoggedIn(false)
    setHasLoggedInBefore(false)
  }

  const handleClickConnectionButton = () =>
    userLoggedIn ? handleLogout() : handleLogin()

  useEffect(() => {
    async function checkHasLoggedInBefore() {
      const hasUserLoggedInBefore = (await $storage.misc.get())
        ?.hasLoggedInBefore
      setHasLoggedInBefore(hasUserLoggedInBefore)
    }
    checkHasLoggedInBefore()
  }, [])

  useEffect(() => {
    async function checkUserLoggedIn() {
      const token = await getToken()
      // console.log("token", token)
      setUserLoggedIn(!!token)
      setCheckingLoginStatus(false)
    }
    checkUserLoggedIn()
  }, [])

  return {
    userLoggedIn,
    hasLoggedInBefore,
    handleClickConnectionButton,
    loading,
    error,
    checkingLoginStatus
  }
}