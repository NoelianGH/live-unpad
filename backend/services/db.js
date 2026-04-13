import mongoose from 'mongoose';
 
export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Atlas terhubung!');
  } catch (err) {
    console.error('❌ Koneksi MongoDB gagal:', err.message);
    process.exit(1);
  }
};