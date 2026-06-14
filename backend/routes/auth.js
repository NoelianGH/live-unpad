import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/prisma.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password wajib diisi' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (exists) return res.status(400).json({ error: 'Email sudah terdaftar' });

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        name: name ? name.trim() : '',
        email: normalizedEmail,
        password: hashed,
        role: 'user'
      }
    });

    res.status(201).json({ message: 'Registrasi berhasil' });
  } catch (err) {
    console.error('❌ [Register] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password wajib diisi' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) return res.status(400).json({ error: 'Email tidak ditemukan' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Password salah' });

    // Use userId consistently in the payload to match authMiddleware.js
    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, role: user.role });
  } catch (err) {
    console.error('❌ [Login] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;