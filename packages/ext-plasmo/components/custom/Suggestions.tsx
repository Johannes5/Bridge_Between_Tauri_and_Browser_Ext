import { useEffect, useState } from "react"

import { ILimit, IUrlLimit } from "~/types/limits.types"
import { $storage } from "~/utils/storage/index.utils"

interface SuggestionsProps {
  query?: string
  onSelect?: (url: string) => void
}

export default function Suggestions({ query, onSelect }: SuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])

  useEffect(() => {
    async function fetchSuggestions() {
      if (!query) {
        setSuggestions([])
        return
      }

      const urlLimits = await $storage.limits.getUrlLimits()
      if (!urlLimits) return

      // Get unique URLs from urlLimits
      const uniqueUrls = [
        ...new Set(urlLimits.map((limit: ILimit<IUrlLimit>) => limit.limit.url))
      ]

      // Filter URLs that include the query (case insensitive)
      const matchingSuggestions = uniqueUrls
        .filter(
          (url) =>
            url.toLowerCase().includes(query.toLowerCase()) && query !== url
        )
        .slice(0, 5) // Limit to 5 suggestions

      setSuggestions(matchingSuggestions)
    }

    fetchSuggestions()
  }, [query])

  if (!suggestions.length) return null

  return (
    <div className="relative h-0 w-full">
      <div className="absolute left-0 right-0 z-10 p-2 rounded-b-lg bg-white w-4/5">
        {suggestions.map((url, index) => (
          <div
            key={index}
            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            onClick={() => onSelect?.(url)}>
            {url}
          </div>
        ))}
      </div>
    </div>
  )
}
