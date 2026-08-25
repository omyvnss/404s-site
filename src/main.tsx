import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'

// Handle SPA redirect from GitHub Pages 404.html
// The 404.html redirects to /index.html?path=/original-path
const searchParams = new URLSearchParams(window.location.search)
const initialPath = searchParams.get('path')
if (initialPath) {
  searchParams.delete('path')
  window.history.replaceState(null, '', initialPath + (searchParams.toString() ? '?' + searchParams.toString() : ''))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)