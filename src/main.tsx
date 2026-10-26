import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const container = document.getElementById('root')!

const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// The production build is prerendered for crawlers; attach to that markup
// instead of throwing it away. Dev and un-prerendered builds use createRoot.
if (container.hasChildNodes()) {
  ReactDOM.hydrateRoot(container, app)
} else {
  ReactDOM.createRoot(container).render(app)
}
