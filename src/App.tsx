import { useState } from 'react'
import { Header } from './components/Header'
import { CardGrid } from './components/CardGrid'
import { ArchiveModal } from './components/ArchiveModal'
import { ErrorState } from './components/ErrorState'
import { useCsvData } from './hooks/useCsvData'

export default function App() {
  const { sites, loading, error, refetch } = useCsvData()
  const [archiveOpen, setArchiveOpen] = useState(false)

  return (
    <div className="min-h-screen bg-bg">
      <Header
        siteCount={sites.length}
        onArchiveOpen={() => setArchiveOpen(true)}
      />

      <main className="max-w-6xl mx-auto px-5 pt-10 pb-20">
        {/* Hero */}
        <section className="mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text mb-2">
            Pages not found
          </h1>
          <p className="text-base text-text-muted">
            404 pages worth finding
          </p>
        </section>

        {/* Error */}
        {error && !loading && (
          <ErrorState message={error} onRetry={refetch} />
        )}

        {/* Grid */}
        {!error && <CardGrid sites={sites} loading={loading} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-dim">
            Curated by{' '}
            <a
              href="https://github.com/omyadav"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:text-text transition-colors"
            >
              Om Yaduvanshi
            </a>
          </p>
          <p className="text-xs text-text-dim">
            Inspired by{' '}
            <a
              href="https://404s.design"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:text-text transition-colors"
            >
              404s.design
            </a>
          </p>
        </div>
      </footer>

      <ArchiveModal
        sites={sites}
        isOpen={archiveOpen}
        onClose={() => setArchiveOpen(false)}
      />
    </div>
  )
}
