import { countdownExhaustedQuotes } from "~/constants/quotes.constants"

export function getRandomCountdownExhaustedQuote() {
  return countdownExhaustedQuotes[
    Math.floor(Math.random() * countdownExhaustedQuotes.length)
  ]
}
