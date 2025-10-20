import { IQuote } from "~/types/quotes.types"

import makeRequest from "../makeRequest"

export const createQuoteRequest = async (quote: Partial<IQuote>) => {
  try {
    await makeRequest({
      method: "POST",
      url: "/api/quotes",
      data: quote
    })
  } catch (error) {
    console.log("~ createQuoteRequest error", error)
  }
}

export const getQuotesRequest = async () => {
  try {
    const res = await makeRequest({
      method: "GET",
      url: "/api/quotes"
    })
    return res?.data
  } catch (error) {
    console.log("~ getQuotesRequest error", error)
  }
}

export const updateQuoteRequest = async (
  quoteId: string,
  quote: Partial<IQuote>
) => {
  try {
    await makeRequest({
      method: "PUT",
      url: `/api/quotes/${quoteId}`,
      data: quote
    })
  } catch (error) {
    console.log("~ updateQuoteRequest error", error)
  }
}

export const deleteQuoteRequest = async (quoteId: string) => {
  try {
    await makeRequest({
      method: "DELETE",
      url: `/api/quotes/${quoteId}`
    })
  } catch (error) {
    console.log("~ deleteQuoteRequest error", error)
  }
}
