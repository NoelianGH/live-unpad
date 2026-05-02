import express from 'express';
import { chat, clearSession } from '../controllers/chatbotControllers.js';

const router = express.Router();

router.post("/", chat);
router.post("/clear", clearSession);

export default router;