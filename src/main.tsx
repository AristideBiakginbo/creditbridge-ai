import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initializeAppCheckSafely } from './lib/appCheck'
import { AuthProvider } from './app/providers/AuthProvider'

initializeAppCheckSafely()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
