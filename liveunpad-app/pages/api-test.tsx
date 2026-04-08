import Head from 'next/head'
import { useState, useEffect } from 'react'
import styles from '@/styles/api-test.module.css'

interface ApiResponse {
  endpoint: string
  method: string
  status: number
  data: any
  timestamp: string
  id: string // Added unique ID for better list rendering
}

export default function ApiTest() {
  const [responses, setResponses] = useState<ApiResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState('')
  const [testMessage, setTestMessage] = useState('Test message from API page')

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  // --- PERSISTENCE LOGIC ---
  
  // Load history on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('api_history')
    if (savedHistory) {
      setResponses(JSON.parse(savedHistory))
    }
  }, [])

  const addResponse = (res: Omit<ApiResponse, 'id'>) => {
    const newEntry = { ...res, id: crypto.randomUUID() }
    setResponses((prev) => {
      const updated = [newEntry, ...prev].slice(0, 100) // Keep last 100
      localStorage.setItem('api_history', JSON.stringify(updated))
      return updated
    })
  }

  const clearHistory = () => {
    if (confirm('Clear all API history?')) {
      localStorage.removeItem('api_history')
      setResponses([])
    }
  }

  // --- API METHODS (Keeping your logic, just using addResponse) ---

  const testGetChat = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${apiUrl}/api/chat`)
      const data = await response.json()
      addResponse({
        endpoint: '/api/chat',
        method: 'GET',
        status: response.status,
        data,
        timestamp: new Date().toLocaleString(),
      })
    } catch (error) {
      addResponse({
        endpoint: '/api/chat',
        method: 'GET',
        status: 500,
        data: { error: String(error) },
        timestamp: new Date().toLocaleString(),
      })
    } finally {
      setLoading(false)
    }
  }

  // ... (Repeat the same pattern for other methods: testPostCreate, testGetConversation, etc.)
  // Note: I changed .toLocaleTimeString() to .toLocaleString() so you can see the DATE of past requests.

  return (
    <>
      <Head>
        <title>API History & Documentation</title>
      </Head>

      <main className={styles.container}>
        <div className={styles.header}>
          <h1>📜 API Request History</h1>
          <p>Base URL: <code>{apiUrl}</code></p>
        </div>

        {/* Action Bar */}
        <div className={styles.actionBar}>
           <button onClick={clearHistory} className={styles.buttonClear}>
             🗑️ Clear History
           </button>
        </div>

        <div className={styles.mainLayout}>
          {/* Documentation / Controls Side */}
          <section className={styles.controlPanel}>
            <h2>Endpoint Documentation</h2>
            
            <div className={styles.docItem}>
              <span className={styles.badgeGet}>GET</span>
              <code>/api/chat</code>
              <p>Fetch all conversations.</p>
              <button onClick={testGetChat} disabled={loading}>Run Request</button>
            </div>

            <div className={styles.docItem}>
              <span className={styles.badgePost}>POST</span>
              <code>/api/chat/create</code>
              <p>Start a new session.</p>
              <button onClick={() => {/* your testPostCreate */}} disabled={loading}>Run Request</button>
            </div>
            
            {/* Add more doc items here */}
          </section>

          {/* Persistent History Side */}
          <section className={styles.responsesPanel}>
            <h2>📋 Activity Log ({responses.length})</h2>
            <div className={styles.responsesList}>
              {responses.map((res) => (
                <div key={res.id} className={`${styles.responseItem} ${res.status < 400 ? styles.success : styles.error}`}>
                  <div className={styles.responseHeader}>
                    <small>{res.timestamp}</small>
                    <div className={styles.requestMeta}>
                      <b className={styles.methodTag}>{res.method}</b>
                      <code>{res.endpoint}</code>
                      <span className={styles.statusTag}>{res.status}</span>
                    </div>
                  </div>
                  <details className={styles.details}>
                    <summary>View Payload</summary>
                    <pre>{JSON.stringify(res.data, null, 2)}</pre>
                  </details>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  )
}