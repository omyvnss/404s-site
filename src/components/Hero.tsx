import { Keyboard } from 'lucide-react'

interface HeroProps {
  onGridClick?: () => void
  onSurpriseMe?: () => void
  onFilterClick?: () => void
}

export function Hero({ onGridClick, onSurpriseMe, onFilterClick }: HeroProps) {
  return (
    <section className="hero" aria-labelledby="hero-heading">
      <h1 id="hero-heading" className="hero-heading">
        Pages <span className="strikethrough">not</span> found
      </h1>
      <p className="hero-subtitle">
        404 pages worth finding
      </p>
      
      <div className="controls">
        <div className="controls-left">
          <button
            className="control-btn control-btn-filled"
            onClick={onGridClick}
            aria-pressed="true"
            aria-label="Grid view (G)"
          >
            GRID <kbd>G</kbd>
          </button>
          <button
            className="control-btn control-btn-ghost"
            onClick={onSurpriseMe}
            aria-label="Surprise me (S)"
          >
            SURPRISE ME <kbd>S</kbd>
          </button>
        </div>
        <div className="controls-right">
          <button
            className="filter-btn"
            onClick={onFilterClick}
            aria-label="Filter"
            aria-expanded="false"
          >
            <Keyboard className="filter-icon" strokeWidth={2} />
          </button>
        </div>
      </div>
    </section>
  )
}