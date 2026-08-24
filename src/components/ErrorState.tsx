import { AlertTriangle } from 'lucide-react'

interface ErrorStateProps {
  message: string
  onRetry: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center mb-5">
        <AlertTriangle size={20} className="text-text-muted" />
      </div>
      <h2 className="text-lg font-bold text-text mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-text-muted max-w-sm mb-6">
        {message}
      </p>
      <button
        onClick={onRetry}
        className="px-5 py-2.5 rounded-full bg-surface border border-border text-sm font-semibold text-text hover:border-border-hover hover:bg-surface-hover transition-all"
      >
        Try again
      </button>
    </div>
  )
}
