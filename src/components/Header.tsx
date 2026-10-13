import { Link } from 'react-router-dom'

/** 404s mark — a four-point star split and knocked out of line. Source: public/logo.svg */
function LogoMark() {
  return (
    <svg className="nav-logo-mark" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <clipPath id="logo-l"><rect width="47.8" height="100" /></clipPath>
        <clipPath id="logo-r"><rect x="52.2" width="47.8" height="100" /></clipPath>
      </defs>
      <path d="M50 5.5C55.04 18.62 76.88 40.46 90 45.5C76.88 50.54 55.04 72.38 50 85.5C44.96 72.38 23.12 50.54 10 45.5C23.12 40.46 44.96 18.62 50 5.5Z" fill="currentColor" clipPath="url(#logo-l)" />
      <path d="M50 14.5C55.04 27.62 76.88 49.46 90 54.5C76.88 59.54 55.04 81.38 50 94.5C44.96 81.38 23.12 59.54 10 54.5C23.12 49.46 44.96 27.62 50 14.5Z" fill="currentColor" clipPath="url(#logo-r)" />
    </svg>
  )
}

interface HeaderProps {
  onFilterClick?: () => void
}

export function Header({ onFilterClick }: HeaderProps) {
  return (
    <nav className="nav" role="navigation" aria-label="Main navigation">
      <div className="container-page nav-inner">
        <Link to="/" className="nav-logo" aria-label="404s Home">
          <LogoMark />
          <span>404s</span>
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