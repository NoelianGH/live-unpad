import { prisma } from './prisma.js';

export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL (Neon) terhubung via Prisma!');
  } catch (err) {
    console.error('❌ Koneksi database gagal pada startup (server akan tetap berjalan):', err.message);
  }
};