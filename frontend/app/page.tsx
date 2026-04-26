"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    // Latar belakang diubah menjadi putih bersih agar sama dengan gambar
    <div className="flex flex-col min-h-screen bg-white font-sans text-zinc-900">
      
      {/* Header: Menggunakan warna kuning mustard/emas seperti gambar LIVE Unpad */}
      <header className="py-8 px-6 text-center bg-[#E6AA3A] shadow-md">
        {/* Teks diubah menjadi putih agar kontras dan terbaca jelas */}
        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
          Selamat Datang di Chatbot LIVE Unpad
        </h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-50/50">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Tombol Login: Disamakan dengan warna mustard header */}
          <Link
            href="/auth/login"
            className="flex h-12 w-48 items-center justify-center rounded-lg bg-[#E6AA3A] text-white font-semibold text-base transition-colors hover:bg-[#D0962F] shadow-sm"
          >
            Login
          </Link>
          
          {/* Tombol Daftar: Tombol outline dengan warna mustard */}
          <Link
            href="/auth/register"
            className="flex h-12 w-48 items-center justify-center rounded-lg border border-[#E6AA3A] text-[#E6AA3A] font-semibold text-base transition-colors hover:bg-[#FFF8E8] shadow-sm"
          >
            Daftar Akun Baru
          </Link>
        </div>
      </main>

      {/* Footer: Warna abu-abu terang standar agar bersih */}
      <footer className="py-6 text-center bg-white border-t border-zinc-100">
        <p className="text-zinc-500 font-normal text-sm">
          &copy; 2026 Program Studi - Chatbot Prodi
        </p>
      </footer>

      {/* Chatbot Widget Container */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Chat Toggle Button: Disamakan dengan warna mustard header */}
        {!isChatOpen && (
          <button
            onClick={() => setIsChatOpen(true)}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E6AA3A] shadow-xl hover:bg-[#D0962F] transition-all hover:scale-105"
          >
            <Image
              src="/next.svg" // Ganti src="/images/logo-chatbot.png" di folder public jika sudah ada
              alt="Chat"
              width={26}
              height={26}
              className="invert-0" // Pastikan warnanya kontras
            />
          </button>
        )}

        {/* Chat Window */}
        {isChatOpen && (
          <div className="flex flex-col w-72 h-[420px] bg-white rounded-2xl shadow-2xl border border-zinc-100 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-5">
            {/* Chat Header: Menggunakan warna mustard */}
            <div className="flex items-center justify-between p-4 bg-[#E6AA3A] text-white font-bold">
              <h3>Chatbot Prodi</h3>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="text-2xl font-light hover:text-zinc-200"
              >
                &times;
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto bg-white space-y-4">
              <div className="max-w-[80%] p-3 rounded-2xl rounded-tl-none bg-[#E6AA3A]/10 text-zinc-900 text-sm shadow-inner border border-[#E6AA3A]/20">
                Halo! Ada yang bisa saya bantu terkait portal LIVE?
              </div>
            </div>

            {/* Chat Input */}
            <div className="p-3 bg-white border-t border-zinc-100 flex gap-2">
              <input
                type="text"
                placeholder="Ketik pesan..."
                className="flex-1 p-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#E6AA3A] focus:border-[#E6AA3A]"
              />
              {/* Tombol Kirim: Menggunakan warna mustard */}
              <button className="bg-[#E6AA3A] text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-[#D0962F] transition-colors">
                Kirim
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}