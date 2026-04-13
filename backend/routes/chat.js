const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getAIReply } = require('../services/ai');
const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    const reply = await getAIReply(message);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;