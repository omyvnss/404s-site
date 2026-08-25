import { useState, useEffect } from 'react'
import { parseCSV, type SiteEntry } from '../lib/csv'

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1FZhps3kBU8d4Kk9EHRmRfpH1J28B1YezrZkt7peTyCI/export?format=csv'

interface UseCsvDataResult {
  sites: SiteEntry[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useCsvData(): UseCsvDataResult {
  const [sites, setSites] = useState<SiteEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSites = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(SHEET_CSV_URL, {
        cache: 'force-cache',
        headers: { 'Accept': 'text/csv,text/plain,*/*' },
      })

      if (!res.ok) {
        throw new Error(`Failed to fetch data (${res.status})`)
      }

      const text = await res.text()

      if (text.trim().startsWith('<!') || text.trim().startsWith('<html')) {
        throw new Error('Got HTML instead of CSV. The sheet may not be published.')
      }

      const parsed = parseCSV(text)

      if (parsed.length === 0) {
        throw new Error('No entries found in the spreadsheet.')
      }

      setSites(parsed)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSites()
  }, [])

  return { sites, loading, error, refetch: fetchSites }
}
