import { Link } from 'react-router-dom'

interface HeaderProps {
  onFilterClick?: () => void
}

export function Header({ onFilterClick }: HeaderProps) {
  return (
    <nav className="nav" role="navigation" aria-label="Main navigation">
      <div className="container-page nav-inner">
        <Link to="/" className="nav-logo" aria-label="404s Home">
          404s
        </Link>
        <div className="nav-right">
          <Link to="/about" className="nav-link">
            ABOUT
          </Link>
          <button
            className="filter-btn"
            onClick={onFilterClick}
            aria-label="Archive"
            aria-expanded="false"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  )
}