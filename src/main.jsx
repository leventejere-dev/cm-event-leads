import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'
import { applyBrand } from './config/brand'
import { startAutoSync } from './lib/offlineQueue'

// 1. Push the Color Metal brand values into the CSS custom properties BEFORE
//    the first paint, so there is never a flash of unstyled content.
applyBrand()

// 2. Start the offline queue synchroniser. It runs for the whole lifetime of
//    the tab and retries anything stored in IndexedDB.
startAutoSync()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
