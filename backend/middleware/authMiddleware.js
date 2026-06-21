import jwt from "jsonwebtoken";
import { prisma } from "../services/prisma.js";

// Middleware untuk memeriksa token (sudah login atau belum)
export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // 1. Ambil token dari header
      token = req.headers.authorization.split(' ')[1];

      // 2. Verifikasi token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Ambil data user dari token (tanpa password) dan simpan di 'req.user'
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user) {
        return res.status(401).json({ error: "User tidak ditemukan." });
      }

      // Simpan di req.user (password dihapus)
      const { password, ...userWithoutPassword } = user;
      req.user = userWithoutPassword;

      return next(); // Lanjut ke rute yang dituju
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).json({ error: "Tidak terotorisasi, token gagal." });
    }
  }

  if (!token) {
    return res.status(401).json({ error: "Tidak terotorisasi, tidak ada token." });
  }
};

// Middleware untuk memeriksa ROLE (admin atau bukan)
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next(); // Jika 'admin', izinkan lanjut
  } else {
    return res.status(403).json({ error: "Tidak terotorisasi. Hanya admin yang diizinkan." });
  }
};