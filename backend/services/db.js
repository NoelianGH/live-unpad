import { prisma } from './prisma.js';

export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL (Neon) terhubung via Prisma!');
  } catch (err) {
    console.error('❌ Koneksi database gagal:', err.message);
    process.exit(1);
  }
};