import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

try {
  localStorage.removeItem('howlow-demo-v3')
  localStorage.removeItem('howlow-demo-v2')
  localStorage.removeItem('howlow-demo-v1')
  localStorage.removeItem('bidora-demo-v1')
} catch {}

const root = document.getElementById('root')

if (!root) {
  throw new Error('Root element #root was not found.')
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
