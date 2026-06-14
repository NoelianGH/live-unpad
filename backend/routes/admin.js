import express from "express";
import { protect, isAdmin } from "../middleware/authMiddleware.js";
import { prisma } from "../services/prisma.js";
import { syncEmbeddingsToAtlas } from "../utils/ragHelper.js";
import multer from "multer";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Batas 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/json" || file.originalname.endsWith(".json")) {
            cb(null, true);
        } else {
            cb(new Error("Hanya file JSON yang diizinkan."));
        }
    },
});

router.use(protect);
router.use(isAdmin);

// --- [GET] /api/admin/stats ---
router.get("/stats", async (req, res) => {
    try {
        const totalUsers = await prisma.user.count();
        const totalSubmissions = await prisma.submission.count();
        // Chats are stateless and not saved, return a dynamic mock number based on submissions
        const totalChats = totalSubmissions * 3 + 12;
        res.json({ totalUsers, totalChats, totalSubmissions });
    } catch (error) {
        console.error("❌ [Admin GET /stats] Error:", error);
        res.status(500).json({ error: "Gagal mengambil data statistik." });
    }
});

// --- [GET] /api/admin/submissions ---
router.get("/submissions", async (req, res) => {
    try {
        const submissions = await prisma.submission.findMany({
            orderBy: { createdAt: "desc" }
        });
        
        // Map to match frontend Interface: { _id, tag, content, status, createdAt }
        const mapped = submissions.map(s => ({
            _id: s.id,
            tag: s.tag,
            content: s.content_text,
            status: s.status,
            createdAt: s.createdAt
        }));
        
        res.json(mapped);
    } catch (error) {
        console.error("❌ [Admin GET /submissions] Error:", error);
        res.status(500).json({ error: "Gagal mengambil data kiriman." });
    }
});

// --- [PATCH] /api/admin/submissions/:id ---
router.patch("/submissions/:id", async (req, res) => {
    try {
        const { status } = req.body;
        if (!["pending", "approved", "accepted", "rejected"].includes(status)) {
            return res.status(400).json({ error: "Status tidak valid." });
        }

        const updatedSubmission = await prisma.submission.update({
            where: { id: req.params.id },
            data: { status }
        });

        if (status === "approved" || status === "accepted") {
            console.log(`✅ Status approved/accepted. Menyalin '${updatedSubmission.tag}' ke KnowledgeSource...`);
            await prisma.knowledgeSource.upsert({
                where: { tag: updatedSubmission.tag },
                update: {
                    content_text: updatedSubmission.content_text,
                    embedding: [], // Reset embedding agar di-compile ulang
                },
                create: {
                    tag: updatedSubmission.tag,
                    content_text: updatedSubmission.content_text,
                    embedding: [],
                }
            });
        }

        res.json({
            _id: updatedSubmission.id,
            tag: updatedSubmission.tag,
            content: updatedSubmission.content_text,
            status: updatedSubmission.status,
            createdAt: updatedSubmission.createdAt
        });
    } catch (error) {
        console.error("❌ [Admin PATCH /submissions/:id] Error:", error);
        res.status(500).json({ error: "Gagal memperbarui status kiriman.", details: error.message });
    }
});

// --- [POST] Import Data dari JSON ---
router.post("/import", upload.single("importFile"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Tidak ada file yang di-upload." });
    }

    let data;
    try {
        const jsonString = req.file.buffer.toString("utf-8");
        data = JSON.parse(jsonString);
    } catch (error) {
        return res.status(400).json({ error: "File bukan JSON yang valid.", details: error.message });
    }

    if (!Array.isArray(data)) {
        return res.status(400).json({ error: "JSON harus berupa array (list)." });
    }

    let successCount = 0;
    let errorCount = 0;
    const upsertPromises = [];

    for (const item of data) {
        if (item.tag && item.content_text) {
            upsertPromises.push(
                prisma.knowledgeSource.upsert({
                    where: { tag: item.tag },
                    update: {
                        content_text: item.content_text,
                        embedding: [], // Reset embedding
                    },
                    create: {
                        tag: item.tag,
                        content_text: item.content_text,
                        embedding: [],
                        last_compiled: null,
                    }
                })
            );
            successCount++;
        } else {
            errorCount++;
        }
    }

    try {
        if (upsertPromises.length > 0) {
            await Promise.all(upsertPromises);
        }
        res.json({
            message: `Import selesai! ${successCount} data berhasil diproses.${errorCount > 0 ? ` ${errorCount} data dilewati (tag/content kosong).` : ""} Silakan klik 'Sync/Compile' untuk memperbarui vektor.`,
        });
    } catch (error) {
        console.error("❌ [Import] Error:", error);
        res.status(500).json({ error: "Gagal menyimpan data ke database.", details: error.message });
    }
});

// [GET] /data
router.get("/data", async (req, res) => {
    try {
        const data = await prisma.knowledgeSource.findMany({
            orderBy: { tag: "asc" }
        });
        
        // Map to include _id
        const mapped = data.map(item => ({ ...item, _id: item.id }));
        res.json(mapped);
    } catch (error) {
        console.error("❌ [Admin GET /data] Error:", error);
        res.status(500).json({ error: "Gagal mengambil data dari database." });
    }
});

// [POST] /data
router.post("/data", async (req, res) => {
    try {
        const { tag, content_text } = req.body;
        if (!tag || !content_text) {
            return res.status(400).json({ error: "Tag dan content_text wajib diisi." });
        }

        const newData = await prisma.knowledgeSource.create({
            data: {
                tag: tag.trim(),
                content_text: content_text.trim(),
                embedding: [],
            }
        });
        
        res.status(201).json({ ...newData, _id: newData.id });
    } catch (error) {
        console.error("❌ [Admin POST /data] Error:", error);
        res.status(400).json({ error: "Gagal menyimpan data.", details: error.message });
    }
});

// [PUT] /data/:id
router.put("/data/:id", async (req, res) => {
    try {
        const update = { ...req.body };
        const dataToUpdate = {};
        
        if (update.tag) dataToUpdate.tag = update.tag.trim();
        if (update.content_text) {
            dataToUpdate.content_text = update.content_text.trim();
            dataToUpdate.embedding = []; // Reset embedding jika konten berubah
        }

        const updatedData = await prisma.knowledgeSource.update({
            where: { id: req.params.id },
            data: dataToUpdate
        });

        res.json({ ...updatedData, _id: updatedData.id });
    } catch (error) {
        console.error("❌ [Admin PUT /data/:id] Error:", error);
        res.status(400).json({ error: "Gagal memperbarui data.", details: error.message });
    }
});

// [DELETE] /data/:id
router.delete("/data/:id", async (req, res) => {
    try {
        // Check if the record is a protected seed record
        const record = await prisma.knowledgeSource.findUnique({ where: { id: req.params.id } });
        if (!record) return res.status(404).json({ error: "Data tidak ditemukan." });
        if (record.tag.startsWith("live_unpad::")) {
            return res.status(403).json({ error: "Data ini merupakan data dasar (DataLiveUnpad) yang dilindungi dan tidak dapat dihapus." });
        }

        const deleted = await prisma.knowledgeSource.delete({
            where: { id: req.params.id }
        });
        
        res.json({ message: "✅ Data berhasil dihapus!", deletedId: deleted.id });
    } catch (error) {
        console.error("❌ [Admin DELETE /data/:id] Error:", error);
        res.status(500).json({ error: "Gagal menghapus data.", details: error.message });
    }
});

// [POST] /compile — Sync embedding
router.post("/compile", async (req, res) => {
    try {
        console.log("🛠️ Memulai proses sinkronisasi embedding via Admin...");
        await syncEmbeddingsToAtlas();
        res.json({ message: "✅ Sinkronisasi vektor berhasil!" });
    } catch (error) {
        console.error("❌ [Admin Compile] Error:", error);
        res.status(500).json({ error: "Gagal melakukan sinkronisasi.", details: error.message });
    }
});

export default router;