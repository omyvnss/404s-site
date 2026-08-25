import { useState, useCallback, useEffect } from 'react'
import { Header } from './components/Header'
import { Hero } from './components/Hero'
import { CardGrid } from './components/CardGrid'
import { ArchiveModal } from './components/ArchiveModal'
import { ErrorState } from './components/ErrorState'
import { useCsvData } from './hooks/useCsvData'

export default function App() {
  const { sites, loading, error, refetch } = useCsvData()
  const [archiveOpen, setArchiveOpen] = useState(false)

  const handleGrid = useCallback(() => {
    // Grid is the default view
  }, [])

  const handleSurpriseMe = useCallback(() => {
    if (sites.length > 0) {
      const randomIndex = Math.floor(Math.random() * sites.length)
      const randomSite = sites[randomIndex]
      window.open(randomSite.url, '_blank', 'noopener,noreferrer')
    }
  }, [sites])

  const handleFilter = useCallback(() => {
    // Filter modal would go here
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      if (e.key.toLowerCase() === 'g') {
        handleGrid()
      } else if (e.key.toLowerCase() === 's') {
        handleSurpriseMe()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleGrid, handleSurpriseMe])

  return (
    <div className="min-h-screen">
      <Header />

      <Hero
        onGridClick={handleGrid}
        onSurpriseMe={handleSurpriseMe}
        onFilterClick={handleFilter}
      />

      <main className="container-page">
        {error && !loading && (
          <ErrorState message={error} onRetry={refetch} />
        )}

        {!error && <CardGrid loading={loading} />}
        <div className="gallery-footer-space" aria-hidden="true" />
      </main>

      <ArchiveModal
        sites={sites}
        isOpen={archiveOpen}
        onClose={() => setArchiveOpen(false)}
      />
    </div>
  )
}