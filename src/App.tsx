import { useState } from 'react'
import { Header } from './components/Header'
import { CardGrid } from './components/CardGrid'
import { ArchiveModal } from './components/ArchiveModal'
import { ErrorState } from './components/ErrorState'
import { Footer } from './components/Footer'
import { useCsvData } from './hooks/useCsvData'

export default function App() {
  const { sites, loading, error, refetch } = useCsvData()
  const [archiveOpen, setArchiveOpen] = useState(false)

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="pattern" />
      
      <Header
        siteCount={sites.length}
        onArchiveOpen={() => setArchiveOpen(true)}
      />

      <main className="container">
        {error && !loading && (
          <ErrorState message={error} onRetry={refetch} />
        )}

        {!error && <CardGrid sites={sites} loading={loading} />}
      </main>

      <Footer />

      <ArchiveModal
        sites={sites}
        isOpen={archiveOpen}
        onClose={() => setArchiveOpen(false)}
      />
    </div>
  )
}