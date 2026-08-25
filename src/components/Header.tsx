export function Header() {
  return (
    <nav className="nav" role="navigation" aria-label="Main navigation">
      <div className="container-page nav-inner">
        <a href="/" className="nav-logo" aria-label="404s Home">
          404s
        </a>
        <div className="nav-right">
          <a href="/about" className="nav-link">
            ABOUT
          </a>
          <a href="/submit" className="nav-submit">
            SUBMIT
          </a>
        </div>
      </div>
    </nav>
  )
}