export function Footer() {
  return (
    <footer className="footer">
      <div className="container inner">
        <div className="brand">
          <div className="flex items-center gap-3">
            <svg className="logo-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="12" cy="12" r="2" />
            </svg>
            <span>404s</span>
          </div>
        </div>
        <p className="copyright">
          Curated by{' '}
          <a href="https://github.com/omyadav" target="_blank" rel="noopener noreferrer">
            Om Yaduvanshi
          </a>
        </p>
        <div className="links">
          <a href="https://404s.design" target="_blank" rel="noopener noreferrer">
            Inspired by 404s.design
          </a>
        </div>
      </div>
    </footer>
  )
}