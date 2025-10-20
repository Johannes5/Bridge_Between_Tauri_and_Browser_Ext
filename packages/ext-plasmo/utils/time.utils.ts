const ONE_MINUTE_IN_MILLISECONDS = 60000
const ONE_HOUR_IN_MILLISECONDS = ONE_MINUTE_IN_MILLISECONDS * 60

export const minutesToMilliseconds = (minutes: number) => {
  return minutes * ONE_MINUTE_IN_MILLISECONDS
}

export const secondsToMilliseconds = (seconds: number) => {
  return seconds * 1000
}

export const hoursToMilliseconds = (hours: number) => {
  return hours * ONE_HOUR_IN_MILLISECONDS
}

export const millisecondsToMinutes = (milliseconds: number) => {
  return milliseconds / ONE_MINUTE_IN_MILLISECONDS
}

export const millisecondsToHours = (milliseconds: number) => {
  return milliseconds / ONE_HOUR_IN_MILLISECONDS
}

export const millisecondsToSeconds = (milliseconds: number) => {
  return milliseconds / 1000
}

export const fromMillisecondsFn = (targetTimeUnit) =>
  targetTimeUnit === "minutes"
    ? millisecondsToMinutes
    : targetTimeUnit === "seconds"
      ? millisecondsToSeconds
      : millisecondsToHours

export const toMillisecondsFn = (targetTimeUnit) =>
  targetTimeUnit === "minutes"
    ? minutesToMilliseconds
    : targetTimeUnit === "seconds"
      ? secondsToMilliseconds
      : hoursToMilliseconds

export const getToday = () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today.toISOString()
}

export const readableTimestamp = (timestamp: number) => {
  const totalSeconds = timestamp / 1000
  if (totalSeconds < 60) return `${Math.floor(totalSeconds)} secs.`
  if (totalSeconds < 3600) {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = Math.floor(totalSeconds % 60)
    return `${minutes} mins, ${seconds} secs.`
  }
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor((totalSeconds % 3600) % 60)
  return `${hours} hours, ${minutes} mins, ${seconds} secs.`
}

export function isISODateBeforeToday(date: string) {
  const today = getToday()
  const dateInQuestion = new Date(date)
  dateInQuestion.setHours(0, 0, 0, 0)
  return dateInQuestion < new Date(today)
}

export function dateWithTimezoneOffset(date: Date) {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000
  date.setTime(date.getTime() - timezoneOffsetMs)
  return date
}
