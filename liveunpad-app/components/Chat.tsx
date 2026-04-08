import React from 'react'
import styles from './Chat.module.css'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface ChatProps {
  messages: Message[]
  onSendMessage: (message: string) => Promise<void>
  isLoading: boolean
}

export default function Chat({ messages, onSendMessage, isLoading }: ChatProps) {
  const [input, setInput] = React.useState('')
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const message = input
    setInput('')
    await onSendMessage(message)
  }

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Start a conversation by typing a message below</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`${styles.message} ${styles[msg.role]}`}
            >
              <div className={styles.messageContent}>
                {msg.content}
              </div>
              <span className={styles.timestamp}>
                {new Date(msg.createdAt).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
        {isLoading && (
          <div className={`${styles.message} ${styles.assistant}`}>
            <div className={styles.typingIndicator}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className={styles.inputForm}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type 'Hello LIVE Unpad' to get started"
          disabled={isLoading}
          className={styles.input}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className={styles.button}
        >
          Send
        </button>
      </form>
    </div>
  )
}
