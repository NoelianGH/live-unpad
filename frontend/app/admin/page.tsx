'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Submission { _id: string; tag: string; content: string; status: string; createdAt: string; }

export default function AdminPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, totalChats: 0, totalSubmissions: 0 });

  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const role = localStorage.getItem('userRole');
    if (!token || role !== 'admin') router.push('/auth/login/page');
    else loadData(token);
  }, []);

  const loadData = async (token: string) => {
    const headers = { Authorization: `Bearer ${token}` };
    const [statsRes, subRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/stats`, { headers }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/submissions`, { headers }),
    ]);
    setStats(await statsRes.json());
    setSubmissions(await subRes.json());
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/submissions/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('userToken')}`,
      },
      body: JSON.stringify({ status }),
    });
    setSubmissions((prev) => prev.map((s) => (s._id === id ? { ...s, status } : s)));
  };

  const statCards = [
    { label: 'Total User', value: stats.totalUsers },
    { label: 'Total Chat', value: stats.totalChats },
    { label: 'Total Kiriman', value: stats.totalSubmissions },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col p-4">
        <div className="mb-6">
          <h2 className="font-semibold text-gray-800">Admin Panel</h2>
          <p className="text-xs text-gray-500">Magister Ilmu Manajemen</p>
        </div>
        <nav className="flex-1 space-y-1">
          <span className="block px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg font-medium">Dashboard</span>
        </nav>
        <button
          onClick={() => { localStorage.clear(); router.push('/auth/login'); }}
          className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg text-left transition"
        >
          Logout
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        <h1 className="text-xl font-semibold text-gray-800 mb-6">Dashboard Admin</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {statCards.map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="text-3xl font-semibold text-gray-800 mt-1">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Submissions table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-medium text-gray-800">Dataset Kiriman User</h2>
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
                    <button onClick={() => updateStatus(s._id, 'approved')} className="text-xs text-green-600 hover:underline">Terima</button>
                    <button onClick={() => updateStatus(s._id, 'rejected')} className="text-xs text-red-600 hover:underline">Tolak</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}