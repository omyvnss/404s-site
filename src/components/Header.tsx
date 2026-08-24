import { Link } from 'react-router-dom'

export function Header() {
  return (
    <nav className="nav" role="navigation" aria-label="Main navigation">
      <div className="nav-left">
        <Link to="/" className="nav-logo" aria-label="404s Home">
          404s
        </Link>
      </div>
      <div className="nav-right">
        <Link to="/about" className="nav-link">
          ABOUT
        </Link>
        <Link to="/submit" className="nav-submit">
          SUBMIT
        </Link>
      </div>
    </nav>
  )
}