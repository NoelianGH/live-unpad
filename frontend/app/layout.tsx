import type { Metadata } from 'next';
import './globals.css';   // ✅ only here

export const metadata: Metadata = {
  title: 'Chatbot Prodi',
  description: 'Magister Ilmu Manajemen - Unpad',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}