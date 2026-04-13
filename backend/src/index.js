import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
 
import { connectDB } from '../services/db.js';
import authRoutes from '../routes/auth.js';
import chatRoutes from '../routes/chat.js';
import adminRoutes from '../routes/admin.js';
import { syncEmbeddingsToAtlas } from '../utils/ragHelper.js';
 
const app = express();
const PORT = process.env.PORT || 5000;
 
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());
 
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
 
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
 
connectDB().then(async () => {
  // Sync embedding yang belum ada saat startup
  await syncEmbeddingsToAtlas();
 
  app.listen(PORT, () => {
    console.log(`✅ Server berjalan di http://localhost:${PORT}`);
  });
});