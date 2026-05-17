import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

;['user', 'inviter'].forEach(suffix => {
  const old = localStorage.getItem(`nanochat_${suffix}`)
  if (old && !localStorage.getItem(`uchat_${suffix}`)) {
    localStorage.setItem(`uchat_${suffix}`, old)
    localStorage.removeItem(`nanochat_${suffix}`)
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
