'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Submission { _id: string; tag: string; content: string; status: string; createdAt: string; }
interface KnowledgeItem { _id: string; id: string; tag: string; content_text: string; last_compiled: string | null; }

const API = process.env.NEXT_PUBLIC_API_URL;
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('userToken') : ''}`,
});

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'knowledge' | 'users'>('dashboard');

  // --- Dashboard State ---
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalChats: 0, totalSubmissions: 0 });

  // --- Users State ---
  interface User { id: string; name: string; email: string; role: string; createdAt: string; }
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [usersSuccess, setUsersSuccess] = useState('');
  
  // --- User Form State ---
  const [showUserForm, setShowUserForm] = useState(false);
  const [userPreset, setUserPreset] = useState<'teacher' | 'student' | 'custom'>('student');
  const [userFormName, setUserFormName] = useState('');
  const [userFormEmailPrefix, setUserFormEmailPrefix] = useState('');
  const [userFormEmailDomain, setUserFormEmailDomain] = useState('@mail.unpad.ac.id');
  const [userFormCustomEmail, setUserFormCustomEmail] = useState('');
  const [userFormPassword, setUserFormPassword] = useState('');
  const [userFormRole, setUserFormRole] = useState<'teacher' | 'student' | 'admin'>('student');
  const [userFormLoading, setUserFormLoading] = useState(false);
  const [userFormError, setUserFormError] = useState('');

  // --- Knowledge Base State ---
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbError, setKbError] = useState('');
  const [kbSuccess, setKbSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<KnowledgeItem | null>(null);
  const [formTag, setFormTag] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const role = localStorage.getItem('userRole');
    if (!token || role !== 'admin') router.push('/auth/login');
    else loadDashboard(token);
  }, []);

  useEffect(() => {
    if (activeTab === 'knowledge') loadKnowledge();
    else if (activeTab === 'users') loadUsers();
  }, [activeTab]);

  const loadDashboard = async (token: string) => {
    const headers = { Authorization: `Bearer ${token}` };
    const [statsRes, subRes] = await Promise.all([
      fetch(`${API}/api/admin/stats`, { headers }),
      fetch(`${API}/api/admin/submissions`, { headers }),
    ]);
    setStats(await statsRes.json());
    setSubmissions(await subRes.json());
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`${API}/api/admin/submissions/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    setSubmissions((prev) => prev.map((s) => (s._id === id ? { ...s, status } : s)));
  };

  const loadKnowledge = async () => {
    setKbLoading(true);
    setKbError('');
    try {
      const res = await fetch(`${API}/api/admin/data`, { headers: authHeaders() });
      const data = await res.json();
      setItems(data);
    } catch {
      setKbError('Gagal memuat data.');
    } finally {
      setKbLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const res = await fetch(`${API}/api/admin/users`, { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memuat data user.');
      setUsers(data);
    } catch (err: any) {
      setUsersError(err.message || 'Gagal memuat data user.');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleCreateUser = async () => {
    let email = '';
    if (userPreset === 'custom') {
      email = userFormCustomEmail.trim();
    } else {
      if (!userFormEmailPrefix.trim()) return;
      email = `${userFormEmailPrefix.trim()}${userFormEmailDomain}`;
    }

    if (!userFormName.trim() || !email || !userFormPassword.trim()) {
      setUserFormError('Semua field wajib diisi.');
      return;
    }

    setUserFormLoading(true);
    setUserFormError('');
    try {
      const res = await fetch(`${API}/api/admin/users`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: userFormName,
          email,
          password: userFormPassword,
          role: userPreset === 'custom' ? userFormRole : (userPreset === 'teacher' ? 'teacher' : 'student')
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat user.');

      setUsersSuccess('✅ User berhasil ditambahkan!');
      setShowUserForm(false);
      
      // Clear form
      setUserFormName('');
      setUserFormEmailPrefix('');
      setUserFormCustomEmail('');
      setUserFormPassword('');
      
      loadUsers();
      // update stats total users
      setStats(prev => ({ ...prev, totalUsers: prev.totalUsers + 1 }));
      setTimeout(() => setUsersSuccess(''), 3000);
    } catch (err: any) {
      setUserFormError(err.message);
    } finally {
      setUserFormLoading(false);
    }
  };

  const openCreate = () => {
    setEditItem(null);
    setFormTag('');
    setFormContent('');
    setShowForm(true);
  };

  const openEdit = (item: KnowledgeItem) => {
    setEditItem(item);
    setFormTag(item.tag);
    setFormContent(item.content_text);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditItem(null);
    setFormTag('');
    setFormContent('');
  };

  const handleSave = async () => {
    if (!formTag.trim() || !formContent.trim()) return;
    setFormLoading(true);
    setKbError('');
    try {
      let res;
      if (editItem) {
        res = await fetch(`${API}/api/admin/data/${editItem._id}`, {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ tag: formTag, content_text: formContent }),
        });
      } else {
        res = await fetch(`${API}/api/admin/data`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ tag: formTag, content_text: formContent }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan.');
      setKbSuccess(editItem ? '✅ Data berhasil diperbarui!' : '✅ Data berhasil ditambahkan!');
      closeForm();
      loadKnowledge();
      setTimeout(() => setKbSuccess(''), 3000);
    } catch (err: any) {
      setKbError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API}/api/admin/data/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus.');
      setKbSuccess('✅ Data berhasil dihapus!');
      setItems((prev) => prev.filter((i) => i._id !== id));
      setTimeout(() => setKbSuccess(''), 3000);
    } catch (err: any) {
      setKbError(err.message);
      setTimeout(() => setKbError(''), 5000);
    } finally {
      setDeleteConfirm(null);
    }
  };

  const isProtected = (tag: string) => tag.startsWith('live_unpad::');

  const filteredItems = items.filter(
    (i) =>
      i.tag.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.content_text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statCards = [
    { label: 'Total User', value: stats.totalUsers, color: 'text-blue-600' },
    { label: 'Total Chat', value: stats.totalChats, color: 'text-yellow-600' },
    { label: 'Total Kiriman', value: stats.totalSubmissions, color: 'text-green-600' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col p-4">
        <div className="mb-6">
          <h2 className="font-bold text-gray-900">LiVE Unpad Admin</h2>
          <p className="text-xs text-gray-500">Learning Innovation & Virtual Education</p>
        </div>
        <nav className="flex-1 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full text-left px-3 py-2 text-sm rounded-lg font-medium transition ${
              activeTab === 'dashboard' ? 'bg-yellow-50 text-yellow-800' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`w-full text-left px-3 py-2 text-sm rounded-lg font-medium transition ${
              activeTab === 'knowledge' ? 'bg-yellow-50 text-yellow-800' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Knowledge Base
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full text-left px-3 py-2 text-sm rounded-lg font-medium transition ${
              activeTab === 'users' ? 'bg-yellow-50 text-yellow-800' : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            User Management
          </button>
        </nav>
        <button
          onClick={() => {
            localStorage.clear();
            document.cookie = 'userToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax';
            router.push('/auth/login');
          }}
          className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg text-left transition font-medium"
        >
          Logout
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto p-6">

        {/* ===== DASHBOARD TAB ===== */}
        {activeTab === 'dashboard' && (
          <>
            <h1 className="text-xl font-semibold text-gray-900 mb-6">Dashboard Admin</h1>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {statCards.map((s) => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Submissions */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">Dataset Kiriman User</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium">Tag</th>
                    <th className="px-6 py-3 text-left font-medium">Konten</th>
                    <th className="px-6 py-3 text-left font-medium">Status</th>
                    <th className="px-6 py-3 text-left font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {submissions.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400 text-sm">Belum ada kiriman.</td></tr>
                  )}
                  {submissions.map((s) => (
                    <tr key={s._id}>
                      <td className="px-6 py-3 text-gray-700 font-medium">{s.tag}</td>
                      <td className="px-6 py-3 text-gray-500 max-w-xs truncate">{s.content}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          s.status === 'approved' ? 'bg-green-100 text-green-700' :
                          s.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>{s.status}</span>
                      </td>
                      <td className="px-6 py-3 flex gap-2">
                        <button onClick={() => updateStatus(s._id, 'approved')} className="text-xs text-green-600 hover:underline font-medium">Terima</button>
                        <button onClick={() => updateStatus(s._id, 'rejected')} className="text-xs text-red-600 hover:underline font-medium">Tolak</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ===== KNOWLEDGE BASE TAB ===== */}
        {activeTab === 'knowledge' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Knowledge Base</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {items.length} total entri · <span className="text-yellow-600 font-medium">{items.filter(i => isProtected(i.tag)).length} data dilindungi</span>
                </p>
              </div>
              <button
                onClick={openCreate}
                className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-sm font-semibold px-4 py-2 rounded-lg transition"
              >
                + Tambah Data
              </button>
            </div>

            {/* Alert messages */}
            {kbError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{kbError}</div>}
            {kbSuccess && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">{kbSuccess}</div>}

            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Cari tag atau isi konten..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
              />
            </div>

            {/* Legend */}
            <div className="flex gap-4 mb-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300 inline-block"></span> Data Dasar (DataLiveUnpad — dilindungi)</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white border border-gray-200 inline-block"></span> Data Tambahan (bisa diedit/hapus)</span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {kbLoading ? (
                <div className="py-16 text-center text-gray-400 text-sm">Memuat data...</div>
              ) : filteredItems.length === 0 ? (
                <div className="py-16 text-center text-gray-400 text-sm">Tidak ada data ditemukan.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium w-64">Tag</th>
                      <th className="px-4 py-3 text-left font-medium">Konten</th>
                      <th className="px-4 py-3 text-left font-medium w-24">Status</th>
                      <th className="px-4 py-3 text-left font-medium w-28">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredItems.map((item) => (
                      <tr key={item._id} className={isProtected(item.tag) ? 'bg-yellow-50/40' : ''}>
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-start gap-1.5">
                            {isProtected(item.tag) && (
                              <span title="Data dilindungi" className="text-yellow-500 mt-0.5 flex-shrink-0">🔒</span>
                            )}
                            <span className="text-xs text-gray-600 font-mono break-all leading-relaxed">
                              {item.tag.replace('live_unpad::', '')}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs align-top">
                          <p className="line-clamp-3 leading-relaxed">{item.content_text}</p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.last_compiled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {item.last_compiled ? 'Compiled' : 'Draft'}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEdit(item)}
                              className="text-xs text-blue-600 hover:underline font-medium"
                            >
                              Edit
                            </button>
                            {!isProtected(item.tag) && (
                              <button
                                onClick={() => setDeleteConfirm(item._id)}
                                className="text-xs text-red-600 hover:underline font-medium"
                              >
                                Hapus
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {/* ===== USER MANAGEMENT TAB ===== */}
        {activeTab === 'users' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">User Management</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {users.length} total pengguna terdaftar
                </p>
              </div>
              <button
                onClick={() => {
                  setUserFormError('');
                  setShowUserForm(true);
                }}
                className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-sm font-semibold px-4 py-2 rounded-lg transition"
              >
                + Tambah User
              </button>
            </div>

            {usersError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{usersError}</div>}
            {usersSuccess && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">{usersSuccess}</div>}

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {usersLoading ? (
                <div className="py-16 text-center text-gray-400 text-sm">Memuat data user...</div>
              ) : users.length === 0 ? (
                <div className="py-16 text-center text-gray-400 text-sm">Tidak ada user ditemukan.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium">Nama</th>
                      <th className="px-6 py-3 text-left font-medium">Email</th>
                      <th className="px-6 py-3 text-left font-medium">Role</th>
                      <th className="px-6 py-3 text-left font-medium">Tanggal Terdaftar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td className="px-6 py-3 text-gray-700 font-medium">{u.name || '-'}</td>
                        <td className="px-6 py-3 text-gray-500">{u.email}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                            u.role === 'teacher' ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
                          }`}>{u.role}</span>
                        </td>
                        <td className="px-6 py-3 text-gray-500">
                          {new Date(u.createdAt).toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </main>

      {/* ===== ADD / EDIT MODAL ===== */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-semibold text-gray-900">{editItem ? 'Edit Data' : 'Tambah Data Baru'}</h2>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {editItem && isProtected(editItem.tag) && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs px-3 py-2 rounded-lg">
                  🔒 Ini adalah data dasar dari DataLiveUnpad. Anda masih dapat mengedit kontennya, namun tidak dapat menghapusnya.
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tag <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formTag}
                  onChange={(e) => setFormTag(e.target.value)}
                  disabled={editItem !== null && isProtected(editItem.tag)}
                  placeholder="contoh: cara-registrasi-live-unpad"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Konten <span className="text-red-500">*</span></label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Tulis isi konten pengetahuan di sini..."
                  rows={8}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-y"
                />
              </div>
              {kbError && <p className="text-red-600 text-sm">{kbError}</p>}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={closeForm} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition">Batal</button>
              <button
                onClick={handleSave}
                disabled={formLoading || !formTag.trim() || !formContent.trim()}
                className="px-4 py-2 text-sm bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg transition disabled:opacity-50"
              >
                {formLoading ? 'Menyimpan...' : editItem ? 'Simpan Perubahan' : 'Tambah Data'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="font-semibold text-gray-900 mb-2">Hapus Data?</h2>
            <p className="text-sm text-gray-500 mb-6">Data yang dihapus tidak dapat dikembalikan.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Batal</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-5 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition font-semibold">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}
      {/* ===== ADD USER MODAL ===== */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-semibold text-gray-900">Tambah User Baru</h2>
              <button onClick={() => setShowUserForm(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            
            {/* Preset Selector */}
            <div className="px-6 pt-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Preset Tipe User</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUserPreset('student');
                    setUserFormEmailDomain('@mail.unpad.ac.id');
                    setUserFormRole('student');
                    setUserFormError('');
                  }}
                  className={`py-2 px-3 text-sm font-semibold rounded-lg border text-center transition ${
                    userPreset === 'student'
                      ? 'bg-green-50 border-green-500 text-green-800'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  🎓 Student Preset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserPreset('teacher');
                    setUserFormEmailDomain('@unpad.ac.id');
                    setUserFormRole('teacher');
                    setUserFormError('');
                  }}
                  className={`py-2 px-3 text-sm font-semibold rounded-lg border text-center transition ${
                    userPreset === 'teacher'
                      ? 'bg-blue-50 border-blue-500 text-blue-800'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  👨‍🏫 Teacher Preset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserPreset('custom');
                    setUserFormRole('student');
                    setUserFormError('');
                  }}
                  className={`py-2 px-3 text-sm font-semibold rounded-lg border text-center transition ${
                    userPreset === 'custom'
                      ? 'bg-purple-50 border-purple-500 text-purple-800'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  ⚙️ Custom Preset
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={userFormName}
                  onChange={(e) => setUserFormName(e.target.value)}
                  placeholder="Nama Lengkap"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              {userPreset !== 'custom' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Akademik (NPM/NIP) <span className="text-red-500">*</span></label>
                  <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-yellow-400">
                    <input
                      type="text"
                      value={userFormEmailPrefix}
                      onChange={(e) => setUserFormEmailPrefix(e.target.value)}
                      placeholder={userPreset === 'student' ? 'contoh: 140810200001' : 'contoh: 19800101...'}
                      className="flex-1 px-3 py-2 text-sm focus:outline-none"
                    />
                    <span className="bg-gray-100 text-gray-600 px-3 py-2 text-sm border-l border-gray-300 flex items-center font-medium">
                      {userFormEmailDomain}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Preset ini otomatis menggunakan domain {userFormEmailDomain} dan role <span className="font-semibold text-gray-600">{userFormRole}</span>.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      value={userFormCustomEmail}
                      onChange={(e) => setUserFormCustomEmail(e.target.value)}
                      placeholder="email@domain.com"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role <span className="text-red-500">*</span></label>
                    <select
                      value={userFormRole}
                      onChange={(e) => setUserFormRole(e.target.value as any)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-white"
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  value={userFormPassword}
                  onChange={(e) => setUserFormPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              {userFormError && <p className="text-red-600 text-sm font-medium">{userFormError}</p>}
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowUserForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleCreateUser}
                disabled={
                  userFormLoading ||
                  !userFormName.trim() ||
                  !userFormPassword.trim() ||
                  (userPreset === 'custom' ? !userFormCustomEmail.trim() : !userFormEmailPrefix.trim())
                }
                className="px-4 py-2 text-sm bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold rounded-lg transition disabled:opacity-50"
              >
                {userFormLoading ? 'Menyimpan...' : 'Tambah User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}