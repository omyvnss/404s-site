interface HeroProps {
  onGridClick?: () => void
  onSurpriseMe?: () => void
}

export function Hero({ onGridClick, onSurpriseMe }: HeroProps) {
  return (
    <>
      <section className="hero container-page" aria-labelledby="hero-heading">
        <h1 id="hero-heading" className="hero-heading">
          Pages <span className="strikethrough">not</span> found
        </h1>
        <p className="hero-subtitle">
          404 pages worth finding
        </p>
      </section>

      <div className="hero-gap" aria-hidden="true" />

      <section className="container-page" aria-label="Gallery controls">
        <div className="toolbar">
          <div className="toolbar-left">
            <button
              className="tool-btn tool-btn-active"
              onClick={onGridClick}
              aria-pressed="true"
              aria-label="Grid view (G)"
            >
              GRID [G]
            </button>
            <button
              className="tool-btn"
              onClick={onSurpriseMe}
              aria-label="Surprise me (S)"
            >
              SURPRISE ME [S]
            </button>
          </div>
        </div>
      </section>
    </>
  )
}