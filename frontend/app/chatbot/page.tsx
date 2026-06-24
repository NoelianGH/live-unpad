'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

interface Choice { id: string; text: string; }
interface Message { role: 'user' | 'bot'; text: string; }

export default function ChatbotPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: 'Halo! Silakan ajukan pertanyaan Anda seputar LMS LiVE Unpad.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [activeChoices, setActiveChoices] = useState<Choice[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const presets = [
    "Bagaimana cara registrasi akun LiVE Unpad?",
    "Bagaimana cara mengumpulkan tugas (submit assignment)?",
    "Apa itu Safe Exam Browser (SEB) dan fungsinya?",
    "Bagaimana cara mengerjakan kuis di aplikasi mobile?",
    "Bagaimana cara mengubah foto profil di LiVE Unpad?"
  ];

  const loadInitialFlow = async () => {
    setConnectionError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/flow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('userToken') : ''}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages([{ role: 'bot', text: data.message }]);
        setActiveChoices(data.choices || []);
        setActiveCategory(null);
      } else {
        throw new Error(data.error || 'Gagal memuat alur chatbot.');
      }
    } catch (err) {
      console.error('Gagal memuat alur chatbot awal:', err);
      setConnectionError('Gagal memuat alur chatbot. Pastikan server backend Anda berjalan di port 5000.');
    }
  };

  const handleChoiceClick = async (choice: Choice) => {
    if (loading) return;
    setMessages((prev) => [...prev, { role: 'user', text: choice.text }]);
    setLoading(true);
    setActiveChoices([]);
    setConnectionError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/flow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('userToken')}`,
        },
        body: JSON.stringify({
          category: activeCategory,
          node_id: choice.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan.');
      setMessages((prev) => [...prev, { role: 'bot', text: data.message }]);
      setActiveChoices(data.choices || []);
      setActiveCategory(data.category);
    } catch (err: any) {
      console.error(err);
      setConnectionError('Gagal memproses pilihan. Pastikan koneksi server backend terhubung.');
      setMessages((prev) => [...prev, { role: 'bot', text: err.message || 'Terjadi kesalahan. Coba lagi.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFlow = async () => {
    if (loading) return;
    setLoading(true);
    setActiveChoices([]);
    setConnectionError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/flow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('userToken')}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, { role: 'bot', text: data.message }]);
        setActiveChoices(data.choices || []);
        setActiveCategory(null);
      } else {
        throw new Error(data.error || 'Terjadi kesalahan.');
      }
    } catch (err) {
      console.error(err);
      setConnectionError('Gagal memuat ulang menu kategori. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    if (!token) router.push('/auth/login');
    loadInitialFlow();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg = text.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    setActiveChoices([]);
    setActiveCategory(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('userToken')}`,
        },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'bot', text: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'bot', text: 'Terjadi kesalahan. Coba lagi.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    sendMessage(input);
  };

  const handleLogout = () => {
    localStorage.clear();
    // Clear the cookie so middleware no longer grants access
    document.cookie = 'userToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax';
    router.push('/auth/login');
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col p-4">
        <div className="mb-6">
          <h2 className="font-semibold text-gray-800">LiVE Unpad</h2>
          <p className="text-xs text-gray-500">Learning Innovation & Virtual Education</p>
        </div>
        <nav className="flex-1 space-y-1">
          <span className="block px-3 py-2 text-sm bg-yellow-50 text-yellow-800 rounded-lg font-medium">Chatbot</span>
        </nav>
        <button
          onClick={handleLogout}
          className="mt-4 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg text-left transition font-medium"
        >
          Logout
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="font-semibold text-gray-800">Chatbot</h1>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-lg px-4 py-2.5 rounded-2xl text-sm ${
                msg.role === 'user'
                  ? 'bg-yellow-400 text-gray-900 rounded-br-sm font-medium shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
              }`}>
                {msg.role === 'user' ? (
                  msg.text
                ) : (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-outside ml-4 my-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-outside ml-4 my-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                      table: ({ children }) => <div className="overflow-x-auto my-2"><table className="min-w-full border border-gray-200 text-xs rounded-lg overflow-hidden">{children}</table></div>,
                      thead: ({ children }) => <thead className="bg-yellow-50">{children}</thead>,
                      th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200">{children}</th>,
                      td: ({ children }) => <td className="px-3 py-2 text-gray-600 border-b border-gray-100">{children}</td>,
                      tr: ({ children }) => <tr className="even:bg-gray-50">{children}</tr>,
                      h1: ({ children }) => <h1 className="font-bold text-base text-gray-900 mb-2">{children}</h1>,
                      h2: ({ children }) => <h2 className="font-semibold text-sm text-gray-900 mb-1 mt-2">{children}</h2>,
                      h3: ({ children }) => <h3 className="font-semibold text-sm text-gray-800 mb-1">{children}</h3>,
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 px-4 py-2 rounded-2xl rounded-bl-sm text-sm text-gray-400 font-medium animate-pulse">
                Mengetik...
              </div>
            </div>
          )}

          {/* Connection Error Banner */}
          {connectionError && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 shadow-sm max-w-xl self-start space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-red-500 font-bold">⚠️</span>
                <p className="text-xs font-semibold uppercase tracking-wider text-red-500">Masalah Koneksi</p>
              </div>
              <p className="text-xs leading-relaxed">{connectionError}</p>
              <button
                onClick={loadInitialFlow}
                className="bg-red-600 hover:bg-red-700 text-white text-xs px-3.5 py-2 rounded-xl transition duration-150 font-medium shadow-sm active:scale-[0.98]"
              >
                Coba Hubungkan Kembali
              </button>
            </div>
          )}

          {/* Active Flow Choices */}
          {!loading && (activeChoices.length > 0 || activeCategory !== null) && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3 max-w-xl self-start">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Pilih opsi di bawah ini untuk melanjutkan:
              </p>
              <div className="flex flex-wrap gap-2">
                {activeChoices.map((choice, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleChoiceClick(choice)}
                    className="bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 text-gray-800 text-xs px-3.5 py-2 rounded-xl transition duration-150 font-medium hover:scale-[1.02] active:scale-[0.98] shadow-sm flex items-center gap-1.5"
                  >
                    <span>{choice.text}</span>
                    <span className="text-yellow-600">➔</span>
                  </button>
                ))}
              </div>
              
              {/* Reset/Back button */}
              {(activeCategory !== null || activeChoices.length === 0) && (
                <div className="pt-2 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={handleResetFlow}
                    className="text-gray-500 hover:text-gray-800 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-50 transition duration-150 font-medium flex items-center gap-1"
                  >
                    <span>↺</span>
                    <span>Kembali ke Menu Utama</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quick Menu Button if no active flow or choices */}
          {!loading && activeChoices.length === 0 && activeCategory === null && (
            <div className="flex justify-start">
              <button
                onClick={handleResetFlow}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 text-xs px-4 py-2 rounded-xl transition duration-150 font-medium flex items-center gap-1.5 shadow-sm"
              >
                <span>☰</span>
                <span>Tampilkan Menu Kategori Panduan</span>
              </button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input & Presets container */}
        <div className="bg-white border-t border-gray-200 px-6 py-4 relative">
          {/* Floating Preset Questions Panel */}
          {showPresets && (
            <div className="absolute bottom-full left-6 right-6 mb-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-gray-100 max-w-xl">
              <div className="bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Preset Pertanyaan:
              </div>
              <div className="flex flex-col">
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    onMouseDown={() => {
                      sendMessage(p);
                      setShowPresets(false);
                    }}
                    className="w-full text-left px-4 py-3 text-xs text-gray-700 hover:bg-yellow-50 transition font-medium"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 w-full items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              onFocus={() => setShowPresets(true)}
              onBlur={() => setShowPresets(false)}
              placeholder="Ketik pesan Anda..."
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-950 bg-white"
            />
            <button
              onClick={handleSend}
              disabled={loading}
              className="bg-yellow-400 text-gray-900 p-2.5 rounded-xl hover:bg-yellow-500 disabled:opacity-50 transition flex items-center justify-center shadow-sm"
              title="Kirim"
            >
              <svg className="w-5 h-5 stroke-current" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}