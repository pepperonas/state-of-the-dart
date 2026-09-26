import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/common/ErrorBoundary'
import './index.css'
import './styles/m3.css'
import './styles/motion.css'
import './i18n/config'
import { initRipple } from './utils/ripple'
import { captureInstallPrompt } from './pwa/installPrompt'

// One delegated listener for every `.m3-ripple` surface in the app.
initRipple()

// The browser's install offer fires once, early — catch it before any route renders.
captureInstallPrompt()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)