import { TSelectOptionType } from "~/types/forms.types";
import { TLimitType } from "~/types/limits.types";
import { hoursToMilliseconds, minutesToMilliseconds, secondsToMilliseconds } from "~/utils/time.utils";





// Define minute-based options
export const MINUTE_OPTIONS: TSelectOptionType[] = [
  { value: minutesToMilliseconds(1), label: "1", key: "1" },
  { value: minutesToMilliseconds(2), label: "2", key: "2" },
  // { value: minutesToMilliseconds(3), label: "3", key: "3" },
  { value: minutesToMilliseconds(5), label: "5", key: "5" },
  { value: minutesToMilliseconds(10), label: "10", key: "10" },
  { value: minutesToMilliseconds(15), label: "15", key: "15" },
  { value: minutesToMilliseconds(30), label: "30", key: "30" },
  { value: minutesToMilliseconds(60), label: "60", key: "60" },
  // { value: minutesToMilliseconds(90), label: "90", key: "90" },
  { value: minutesToMilliseconds(120), label: "120", key: "120" },
  { value: "custom", label: "Custom", key: "custom" }
]

// Define hour-based options
export const HOUR_OPTIONS: TSelectOptionType[] = [
  { value: hoursToMilliseconds(0.5), label: "0.5", key: "0.5" },
  { value: hoursToMilliseconds(1), label: "1", key: "1" },
  { value: hoursToMilliseconds(2), label: "2", key: "2" },
  { value: hoursToMilliseconds(3), label: "3", key: "3" },
  { value: hoursToMilliseconds(6), label: "6", key: "6" },
  { value: hoursToMilliseconds(10), label: "10", key: "10" },
  { value: hoursToMilliseconds(20), label: "20", key: "20" },
  { value: "custom", label: "Custom", key: "custom" }
]

// Define stops dropdown options
export const STOP_MINUTE_OPTIONS: TSelectOptionType[] = [
  {
    key: "1",
    value: minutesToMilliseconds(1),
    label: "1"
  },
  {
    key: "2",
    value: minutesToMilliseconds(2),
    label: "2"
  },
  {
    key: "4",
    value: minutesToMilliseconds(4),
    label: "4"
  },
  {
    key: "6",
    value: minutesToMilliseconds(6),
    label: "6"
  },
  {
    key: "8",
    value: minutesToMilliseconds(8),
    label: "8"
  },
  {
    key: "999",
    value: "custom",
    label: "Custom"
  }
]

export const STOP_SECONDS_OPTIONS: TSelectOptionType[] = [
  {
    key: "10",
    value: secondsToMilliseconds(10),
    label: "10"
  },
  {
    key: "20",
    value: secondsToMilliseconds(20),
    label: "20"
  },
  {
    key: "30",
    value: secondsToMilliseconds(30),
    label: "30"
  },
  {
    key: "40",
    value: secondsToMilliseconds(40),
    label: "40"
  },
  {
    key: "50",
    value: secondsToMilliseconds(50),
    label: "50"
  },
  {
    key: "999",
    value: "custom",
    label: "Custom"
  }
]

// Define shorts limits
export const SHORTS_LIMITS: TSelectOptionType[] = [
  { value: 5, label: "5", key: "5" },
  { value: 20, label: "20", key: "20" },
  { value: 40, label: "40", key: "40" },
  { value: 80, label: "80", key: "80" },
  { value: 100, label: "100", key: "100" },
  { value: 250, label: "250", key: "250" },
  { value: 500, label: "500", key: "500" }
]

export const TIME_UNIT_OPTIONS = [
  { value: "minutes", label: "Minutes", key: "minutes" },
  { value: "hours", label: "Hours", key: "hours" }
]

export const STOP_PERIODS = [
  { value: "seconds", label: "Seconds", key: "seconds" },
  { value: "minutes", label: "Minutes", key: "minutes" }
]

export const URL_AND_SHORTS_PERIODS = [
  { value: "month", label: "Month", key: "month" },
  { value: "week", label: "Week", key: "week" },
  { value: "day", label: "Day", key: "day" },
  { value: "hourly", label: "Hour", key: "hourly" }
]

export const PERIOD_OPTIONS = (limitType: TLimitType) =>
  limitType === "stops" ? STOP_PERIODS : URL_AND_SHORTS_PERIODS

// Helper function to determine if a period should use hours
export const shouldUseHours = (period): boolean => {
  return period === "week" || period === "month"
}

// Main function to get time options based on period
export const createTimeOptions = (period): TSelectOptionType[] => {
  return shouldUseHours(period) ? HOUR_OPTIONS : MINUTE_OPTIONS
}

// Main function to get stops dropdown options based on period
export const createStopsDropdownOptions = (
  period?: "minutes" | "seconds"
): TSelectOptionType[] => {
  return period === "seconds" ? STOP_SECONDS_OPTIONS : STOP_MINUTE_OPTIONS
}

export const NUMBER_OF_EXCUSES_OPTIONS = [
  { label: "2", value: "2", key: "2" },
  { label: "4", value: "4", key: "4" },
  { label: "6", value: "6", key: "6" }
]