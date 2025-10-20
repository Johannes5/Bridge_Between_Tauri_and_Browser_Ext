import { QUOTES_STORAGE_KEY } from "~/constants/storage.constants"
import { IQuote } from "~/types/quotes.types"
import { plasmoStorage } from "~/utils/storage/index.utils"

export async function getQuotes(): Promise<IQuote[] | null> {
  const quotes = await plasmoStorage.get(QUOTES_STORAGE_KEY, null)
  return quotes
}

export async function setQuotes(quotes: IQuote[]) {
  await plasmoStorage.set(QUOTES_STORAGE_KEY, quotes)
}
