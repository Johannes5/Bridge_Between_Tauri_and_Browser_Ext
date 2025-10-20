import { useEffect, useRef, useState } from "react"

import { defaultQuotes } from "~/constants/defaults.constants"
import { IQuote } from "~/types/quotes.types"
import { generateUUID } from "~/utils/index.utils"
import { $storage } from "~/utils/storage/index.utils"

export default function useQuotes() {
  const [settingQuotes, settingQuotesSetter] = useState(true)
  const [quotes, setQuotes] = useState<IQuote[]>([])
  const [newQuote, setNewQuote] = useState("")
  const [newQuotes, setNewQuotes] = useState<string[]>([""])
  const [singleRandomQuote, setSingleRandomQuote] = useState<IQuote | null>(
    null
  )
  const [customisingQuotes, setCustomisingQuotes] = useState(false)
  const existingQuotesContainerRef = useRef<HTMLDivElement>(null)

  function calculateRows(e: any): number {
    // calculate the number of rows
    const textareaLineHeight = 19.2 // Adjust this value based on your textarea's line-height
    e.target.rows = 1 // Reset the number of rows to 1 to calculate the new height
    const currentRows =
      Math.floor(e.target.scrollHeight / textareaLineHeight) + 1
    e.target.rows = currentRows

    return currentRows
  }

  /**
   * Sets quotes on chrome local storage and state.
   * @param quotes | IQuote[] | array of quotes.
   * @param chromeStorage | boolean | whether or not the quotes should be saved to chrome storage or not.
   */
  async function quotesSuperSetter(quotes: IQuote[], chromeStorage = true) {
    if (!Array.isArray(quotes)) return

    setQuotes([...quotes])

    if (!chromeStorage) return
    await $storage.quotes.set(quotes)
  }

  /**
   * function to get quotes from chrome local storage and set to state. If there's no quote set, it sets the default quotes.
   */
  async function setQuotesToState() {
    const quotesInStorage = await $storage.quotes.get()
    if (!quotesInStorage) {
      const quotesToSet = (defaultQuotes || []).reverse()
      quotesSuperSetter(quotesToSet)
      return settingQuotesSetter(false)
    }
    quotesSuperSetter(quotesInStorage, false)
    settingQuotesSetter(false)
  }

  /**
   * Updates a single quote
   * @param uuid | string | represents the uuid of the quote to be updated.
   * @param quote | string | represents the new quote string
   */
  async function updateQuote(uuid: string, quote: string) {
    let newQuotes: IQuote[] = [...quotes]
    if (quote === "") return await deleteQuote(uuid)

    newQuotes = newQuotes.map((item) => {
      if (uuid === item.uuid)
        return {
          ...item,
          quote
        } as IQuote

      return item
    })
    quotesSuperSetter(newQuotes)
  }

  /**
   * Deletes a single quote.
   * @param uuid | string | represents the uuid of the quote to be deleted.
   */
  async function deleteQuote(uuid: string) {
    let newQuotes = [...quotes]
    newQuotes = newQuotes.filter((item) => item.uuid !== uuid)
    quotesSuperSetter(newQuotes)
  }

  async function getSingleRandomQuote() {
    let randomQuote: null | IQuote = null
    // Check if the array is empty
    if (quotes.length === 0) return // Return null if the array is empty

    // Generate a random index within the range of the array length
    const randomIndex = Math.floor(Math.random() * quotes.length)

    // Return the random quote object at the random index
    randomQuote = quotes[randomIndex]

    setSingleRandomQuote(randomQuote)
  }

  function handleSetNewQuotes(quote: string, idx: number) {
    setNewQuotes((prev) => prev.map((item, i) => (idx === i ? quote : item)))
  }

  function handleSaveNewQuotes() {
    addQuoteToNewQuotes()
    if (existingQuotesContainerRef?.current?.scrollTo)
      setTimeout(() => {
        existingQuotesContainerRef?.current?.scrollTo({
          behavior: "smooth",
          top: existingQuotesContainerRef?.current?.scrollHeight
        })
      }, 300)
  }

  function saveNewQuotes() {
    // console.log('SAVE NEW QUOTE');

    const newestQuotes = [
      ...quotes,
      ...newQuotes
        .filter((quote) => quote !== "")
        .map((quote) => ({
          uuid: generateUUID(),
          quote: quote.trim()
        }))
    ]
    quotesSuperSetter(newestQuotes)
    setNewQuotes([""])
  }

  function addQuoteToNewQuotes() {
    // console.log('ADD QUOTE TO NEW QUOTES', JSON.stringify(newQuotes));

    if (newQuotes[0].trim() === "")
      return alert("You can't add new quote if the last one is still empty.")
    // setNewQuotes((prev) => ['', ...prev]);
    saveNewQuotes()
  }

  useEffect(() => {
    setQuotesToState()
  }, [])

  useEffect(() => {
    getSingleRandomQuote()
  }, [quotes])

  return {
    quotes,
    updateQuote,
    deleteQuote,
    settingQuotes,
    calculateRows,
    newQuote,
    setNewQuote,
    // addNewQuote,
    singleRandomQuote,

    newQuotes,
    handleSetNewQuotes,
    handleSaveNewQuotes,
    // saveNewQuotes,
    addQuoteToNewQuotes,
    customisingQuotes,
    setCustomisingQuotes,
    existingQuotesContainerRef
    // removeQuoteFromNewQuotes,
  }
}
