import { useEffect, useState } from "react"

export default function useStops() {
  const [timeLeftReadable, setTimeLeftReadable] = useState("")

  function handleGetTimeLeft() {}

  useEffect(() => {
    handleGetTimeLeft()
  }, [])

  return {
    timeLeftReadable
  }
}
