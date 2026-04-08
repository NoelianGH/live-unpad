import Head from 'next/head'
import { useEffect, useState } from 'react'
import Chat from '@/components/Chat'
import styles from '@/styles/home.module.css'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
}

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [currentMessages, setCurrentMessages] = useState<Message[]>([])

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  // Load messages when conversation changes
  useEffect(() => {
    if (activeConversation) {
      loadConversation(activeConversation)
    }
  }, [activeConversation])

  const loadConversations = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/chat`)
      const data = await response.json()
      if (data.success) {
        setConversations(data.data)
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    }
  }

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/chat/${conversationId}`)
      const data = await response.json()
      if (data.success) {
        setCurrentMessages(data.data.messages)
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
    }
  }

  const handleNewChat = async (message: string) => {
    setLoading(true)
    try {
      const response = await fetch(`${apiUrl}/api/chat/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const data = await response.json()
      if (data.success) {
        const newConversation = data.data
        setConversations([newConversation, ...conversations])
        setActiveConversation(newConversation.id)
        setCurrentMessages(newConversation.messages)

        // Get AI response
        await getAIResponse(newConversation.id, newConversation.messages)
      }
    } catch (error) {
      console.error('Error creating conversation:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (message: string) => {
    if (!activeConversation) {
      await handleNewChat(message)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        `${apiUrl}/api/chat/${activeConversation}/send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message }),
        }
      )

      const data = await response.json()
      if (data.success) {
        await loadConversation(activeConversation)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAIResponse = async (
    conversationId: string,
    prevMessages: Message[]
  ) => {
    try {
      const response = await fetch(`${apiUrl}/api/chat/${conversationId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '' }),
      })
    } catch (error) {
      console.error('Error getting AI response:', error)
    }
  }

  const handleDeleteConversation = async (conversationId: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this conversation? This cannot be undone.'
    )
    if (!confirmed) {
      return
    }

    try {
      await fetch(`${apiUrl}/api/chat/${conversationId}`, {
        method: 'DELETE',
      })
      setConversations(conversations.filter((c) => c.id !== conversationId))
      if (activeConversation === conversationId) {
        setActiveConversation(null)
        setCurrentMessages([])
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
    }
  }

  return (
    <>
      <Head>
        <title>AI Chatbot - Chat Interface</title>
        <meta name="description" content="AI Chatbot powered by Next.js" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.container}>
        <div className={styles.sidebar}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>LIVE</span>
            <div>
              <h1 className={styles.title}>LIVE Unpad</h1>
              <p className={styles.subtitle}>Your website and workflow assistant</p>
            </div>
          </div>
          <button
            className={styles.newChatButton}
            onClick={() => {
              setActiveConversation(null)
              setCurrentMessages([])
            }}
          >
            + New Chat
          </button>

          <div className={styles.conversationsList}>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`${styles.conversationItem} ${
                  activeConversation === conv.id ? styles.active : ''
                }`}
              >
                <button
                  className={styles.conversationButton}
                  onClick={() => setActiveConversation(conv.id)}
                >
                  {conv.title}
                </button>
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDeleteConversation(conv.id)}
                  title="Delete conversation"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.chatArea}>
          {activeConversation ? (
            <Chat
              messages={currentMessages}
              onSendMessage={handleSendMessage}
              isLoading={loading}
            />
          ) : (
            <div className={styles.welcomeSection}>
              <h2>LIVE Unpad Assistant</h2>
              <p>Start by asking about your website, latest updates, or workflow tasks.</p>
              <div className={styles.protocolCard}>
                <strong>Try this:</strong>
                <p>“Hello LIVE Unpad, review my website and tell me what’s next.”</p>
              </div>
              <Chat
                messages={[]}
                onSendMessage={handleNewChat}
                isLoading={loading}
              />              <div className={styles.developerLink}>
                <a href="/api-test" title="Test API endpoints">🔧 API Test Panel</a>
              </div>            </div>
          )}
        </div>
      </main>
    </>
  )
}
