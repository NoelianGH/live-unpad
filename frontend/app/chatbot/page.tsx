"use client";

import React, { useState, useEffect, useRef } from "react";

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
}

const formatMessage = (text: string) => {
  return text.split('\n').map((line, index) => (
    <span key={index}>
      {line}
      {index < text.split('\n').length - 1 && <br />}
    </span>
  ));
};

export default function ChatbotPage() {
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [currentChat, setCurrentChat] = useState<ChatSession | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
      const parsed = JSON.parse(saved);
      const history = parsed.map((chat: any) => ({
        ...chat,
        createdAt: new Date(chat.createdAt),
        messages: chat.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
      setChatHistory(history);
    }
  }, []);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
  }, [chatHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages, isLoading]);

  const createNewChat = async () => {
    await fetch("http://localhost:5000/chatbot/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: currentChat?.id }),
    });

    const newChat: ChatSession = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      createdAt: new Date()
    };
    setChatHistory(prev => [newChat, ...prev]);
    setCurrentChat(newChat);
  };

  const deleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();

    await fetch("http://localhost:5000/chatbot/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: chatId }),
    });

    const updatedHistory = chatHistory.filter(chat => chat.id !== chatId);
    setChatHistory(updatedHistory);

    if (currentChat?.id === chatId) {
      if (updatedHistory.length > 0) {
        setCurrentChat(updatedHistory[0]);
      } else {
        const newChat: ChatSession = {
          id: Date.now().toString(),
          title: "New Chat",
          messages: [],
          createdAt: new Date()
        };
        setChatHistory([newChat]);
        setCurrentChat(newChat);
      }
    }
  };

  const selectChat = (chat: ChatSession) => {
    setCurrentChat(chat);
  };

  const sendMessage = async () => {
    if (!message.trim() || !currentChat) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: message,
      isUser: true,
      timestamp: new Date()
    };

    const updatedChat = {
      ...currentChat,
      messages: [...currentChat.messages, userMessage],
      title: currentChat.messages.length === 0 ? message.slice(0, 30) + "..." : currentChat.title
    };

    setCurrentChat(updatedChat);
    setChatHistory(prev => prev.map(chat =>
      chat.id === updatedChat.id ? updatedChat : chat
    ));
    setMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:5000/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          sessionId: currentChat.id
        }),
      });
      const data = await res.json();

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: data.response,
        isUser: false,
        timestamp: new Date()
      };

      const finalChat = {
        ...updatedChat,
        messages: [...updatedChat.messages, botMessage]
      };

      setCurrentChat(finalChat);
      setChatHistory(prev => prev.map(chat =>
        chat.id === finalChat.id ? finalChat : chat
      ));
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: "Error: " + (error instanceof Error ? error.message : String(error)),
        isUser: false,
        timestamp: new Date()
      };

      const finalChat = {
        ...updatedChat,
        messages: [...updatedChat.messages, errorMessage]
      };

      setCurrentChat(finalChat);
      setChatHistory(prev => prev.map(chat =>
        chat.id === finalChat.id ? finalChat : chat
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Create initial chat if none exists
  useEffect(() => {
    if (chatHistory.length === 0) {
      createNewChat();
    } else if (!currentChat) {
      setCurrentChat(chatHistory[0]);
    }
  }, [chatHistory, currentChat]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={createNewChat}
            className="w-full p-3 bg-[#E6AA3A] text-white rounded-lg hover:bg-[#D0962F] transition-colors font-medium"
          >
            + New Chat
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <h3 className="text-sm font-medium text-gray-600 mb-2 px-2">Recent Chats</h3>
            {chatHistory.map((chat) => (
              <div
                key={chat.id}
                className={`group relative flex items-center w-full rounded-lg mb-1 transition-colors ${
                  currentChat?.id === chat.id
                    ? 'bg-[#E6AA3A] text-white'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {/* Chat select area */}
                <button
                  onClick={() => selectChat(chat)}
                  className="flex-1 text-left p-3 pr-9 min-w-0"
                >
                  <div className="text-sm font-medium truncate">{chat.title}</div>
                  <div className="text-xs opacity-70 mt-1">{chat.messages.length} messages</div>
                </button>

                {/* Trash delete button - visible on hover */}
                <button
                  onClick={(e) => deleteChat(e, chat.id)}
                  title="Hapus chat"
                  className={`absolute right-2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-150 ${
                    currentChat?.id === chat.id
                      ? 'hover:bg-white/20 text-white'
                      : 'hover:bg-red-100 text-gray-400 hover:text-red-500'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="py-4 px-6 bg-white border-b border-gray-200 shadow-sm">
          <h1 className="text-xl font-bold text-gray-800">Chatbot LIVE Unpad</h1>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {currentChat?.messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="bg-white border border-gray-200 px-6 py-8 rounded-2xl shadow-sm max-w-md">
                <div className="w-16 h-16 bg-[#E6AA3A] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Selamat datang di Chatbot LIVE Unpad!</h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Saya di sini untuk membantu Anda dengan informasi tentang Universitas Padjadjaran.
                  Silakan ajukan pertanyaan Anda!
                </p>
              </div>
            </div>
          )}

          {currentChat?.messages.map((msg, index) => (
            <div
              key={msg.id}
              className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                  msg.isUser
                    ? 'bg-[#E6AA3A] text-white rounded-br-md'
                    : 'bg-white border border-gray-200 text-black rounded-bl-md'
                }`}
              >
                <div className={`text-sm leading-relaxed ${msg.isUser ? '' : 'prose prose-sm max-w-none'}`}>
                  {msg.isUser ? msg.text : formatMessage(msg.text)}
                </div>
                <p className={`text-xs mt-2 ${msg.isUser ? 'text-white/70' : 'text-gray-500'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="bg-white border border-gray-200 px-4 py-4 rounded-2xl rounded-bl-md shadow-sm">
                <div className="flex space-x-2 px-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ketik pesan Anda di sini..."
                  className="w-full p-4 pr-12 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#E6AA3A] focus:border-transparent text-black resize-none"
                  disabled={isLoading}
                />
                {message && (
                  <button
                    onClick={() => setMessage("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                onClick={sendMessage}
                disabled={isLoading || !message.trim()}
                className="p-4 bg-[#E6AA3A] text-white rounded-2xl hover:bg-[#D0962F] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg disabled:hover:shadow-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Tekan Enter untuk mengirim pesan
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}