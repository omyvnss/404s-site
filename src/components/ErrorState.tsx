import { AlertCircle } from 'lucide-react'

interface ErrorStateProps {
  message: string
  onRetry: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle className="error-icon" strokeWidth={1.5} />
      <h2 className="error-title">Something went wrong</h2>
      <p className="error-message">{message}</p>
      <button onClick={onRetry} className="error-retry">
        Try again
      </button>
    </div>
  )
}