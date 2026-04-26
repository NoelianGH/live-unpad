import express from 'express';

const router = express.Router();

router.get("/", (req, res) => {
  res.json({ httpMethod: 'Hello from the chatbot route!' });
});

router.get("/hello", (req, res) => {
  res.json({ httpMethod: 'robby shirtless!' });
});

router.post("/", (req, res) => {
  res.json({ httpMethod: 'Post endpoint' });
});

router.put("/", (req, res) => {
  res.json({ httpMethod: 'Update endpoint' });
});

router.delete("/", (req, res) => {
  res.json({ httpMethod: 'Delete endpoint' });
});

export default router;