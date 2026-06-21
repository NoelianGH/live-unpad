'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

interface Choice { id: string; text: string; }
interface Message { role: 'user' | 'bot'; text: string; }

export default function Home() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: 'Halo! Silakan ajukan pertanyaan Anda seputar LMS LiVE Unpad.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [activeChoices, setActiveChoices] = useState<Choice[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const presets = [
    "Bagaimana cara registrasi akun LiVE Unpad?",
    "Bagaimana cara mengumpulkan tugas (submit assignment)?",
    "Apa itu Safe Exam Browser (SEB) dan fungsinya?",
    "Bagaimana cara mengerjakan kuis di aplikasi mobile?",
    "Bagaimana cara mengubah foto profil di LiVE Unpad?"
  ];

  const loadInitialFlow = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/flow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages([{ role: 'bot', text: data.message }]);
        setActiveChoices(data.choices || []);
        setActiveCategory(null);
      }
    } catch (err) {
      console.error('Gagal memuat alur chatbot awal:', err);
    }
  };

  const handleChoiceClick = async (choice: Choice) => {
    if (loading) return;
    setMessages((prev) => [...prev, { role: 'user', text: choice.text }]);
    setLoading(true);
    setActiveChoices([]);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/flow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setMessages((prev) => [...prev, { role: 'bot', text: err.message || 'Terjadi kesalahan. Coba lagi.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFlow = async () => {
    if (loading) return;
    setLoading(true);
    setActiveChoices([]);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat/flow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, { role: 'bot', text: data.message }]);
        setActiveChoices(data.choices || []);
        setActiveCategory(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const role = localStorage.getItem('userRole');
    if (token) {
      setIsLoggedIn(true);
      setUserRole(role);
    }
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
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const token = localStorage.getItem('userToken');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan.');
      setMessages((prev) => [...prev, { role: 'bot', text: data.reply }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'bot', text: err.message || 'Terjadi kesalahan. Coba lagi.' }]);
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
    setIsLoggedIn(false);
    setUserRole(null);
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
          
          {isLoggedIn && (
            <Link
              href={userRole === 'admin' ? '/admin' : '/chatbot'}
              className="block px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition font-medium"
            >
              Ke Dashboard
            </Link>
          )}
        </nav>

        {isLoggedIn ? (
          <button
            onClick={handleLogout}
            className="mt-4 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg text-left transition font-medium"
          >
            Logout
          </button>
        ) : (
          <div className="flex flex-col gap-2 mt-4">
            <Link
              href="/auth/login"
              className="px-3 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg text-center transition font-medium"
            >
              Masuk
            </Link>
            <Link
              href="/auth/register"
              className="px-3 py-2 text-sm text-gray-900 bg-yellow-400 hover:bg-yellow-500 rounded-lg text-center transition font-semibold"
            >
              Daftar
            </Link>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h1 className="font-semibold text-gray-800">Chatbot (Mode Publik)</h1>
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

        {/* Input */}
        <div className="bg-white border-t border-gray-200 px-6 py-4 flex gap-3 items-end relative">
          <div className="flex gap-2 w-full items-center">
            {/* Presets Button */}
            <div className="relative">
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 px-3 py-2 rounded-xl text-sm font-medium transition flex items-center gap-1 whitespace-nowrap"
              >
                Preset 
                <span className="text-xs transition-transform duration-200">{showPresets ? '▼' : '▲'}</span>
              </button>
              
              {showPresets && (
                <div className="absolute bottom-full left-0 mb-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden divide-y divide-gray-100">
                  <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500">Preset Pertanyaan</div>
                  {presets.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setShowPresets(false);
                        sendMessage(p);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs text-gray-700 hover:bg-yellow-50 transition"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ketik pesan Anda..."
              className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-950 bg-white"
            />
            <button
              onClick={handleSend}
              disabled={loading}
              className="bg-yellow-400 text-gray-900 px-5 py-2 rounded-xl text-sm font-semibold hover:bg-yellow-500 disabled:opacity-50 transition"
            >
              Kirim
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
