import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import ErrorBoundary from './components/common/ErrorBoundary'
import './index.css'
import './styles/m3.css'
import './styles/motion.css'
import './i18n/config'
import { initRipple } from './utils/ripple'

// One delegated listener for every `.m3-ripple` surface in the app.
initRipple()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)