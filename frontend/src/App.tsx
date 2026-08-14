import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [health, setHealth] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealth(data.status))
      .catch(() => setHealth('error'))
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Gymerr</h1>
      <p>API Status: {health || 'loading...'}</p>
    </div>
  )
}

export default App
