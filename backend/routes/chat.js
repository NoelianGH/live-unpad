import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { protect } from '../middleware/authMiddleware.js';
import { processQuestion } from '../utils/chatHelper.js';

const router = express.Router();

let flowsData = null;

async function loadFlows() {
  if (!flowsData) {
    try {
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const flowsPath = path.join(__dirname, '../chatbot_flows.json');
      const content = await fs.readFile(flowsPath, 'utf8');
      flowsData = JSON.parse(content);
    } catch (err) {
      console.error('❌ [loadFlows] Error:', err);
      flowsData = {};
    }
  }
  return flowsData;
}

const ROOTS = {
  "LOGIN": "_tkUI_51MUsOe7TQKEoO-1",
  "Backup and Restore": "4xQD4HL6rll4TQHeG6X7-1",
  "Masuk Course": "T1CiP7t_2xLl8tIqyYkA-1",
  "Enroll": "dXrBW42aY8iMoSeRXM6q-1",
  "Menambahkan Aktivitas": "0naJWreVL6bufnB3jpqe-1",
  "Menambahkan Resources": "LRuQX09GwBHCN9T-BBus-1",
  "Quiz": "eQU1HDJ9kKaACiZ6EsR5-6",
  "Gradebook": "ocxWwH8_N_tSz0td5z8m-6",
  "Panopto": "8KYLmkby_ry8VcUU_vcJ-6",
  "Mahasiswa": "TbaGbQ_XiF8c29XMoCXL-2"
};

const CATEGORY_CHOICES = [
  { id: "LOGIN", text: "Login" },
  { id: "Backup and Restore", text: "Backup and Restore" },
  { id: "Masuk Course", text: "Masuk Course" },
  { id: "Enroll", text: "Enroll" },
  { id: "Menambahkan Aktivitas", text: "Menambahkan Aktivitas" },
  { id: "Menambahkan Resources", text: "Menambahkan Resources" },
  { id: "Quiz", text: "Quiz" },
  { id: "Gradebook", text: "Gradebook" },
  { id: "Panopto", text: "Panopto" },
  { id: "Mahasiswa", text: "Panduan Mahasiswa" }
];

function traverse(flows, category, node_id) {
  const cat = flows[category];
  if (!cat) return { message: `Category ${category} not found.`, choices: [] };
  
  const nodes = cat.nodes || {};
  const edges = cat.edges || [];
  
  const outgoing = {};
  for (const nid of Object.keys(nodes)) {
    outgoing[nid] = [];
  }
  for (const edge of edges) {
    const { source, target } = edge;
    if (source && outgoing[source]) {
      outgoing[source].push(target);
    }
  }
  
  let curr = node_id;
  if (!curr || !nodes[curr]) {
    return { message: `Node ${curr} not found in category ${category}.`, choices: [] };
  }
  
  const texts = [nodes[curr].text];
  
  while (true) {
    const targets = outgoing[curr] || [];
    if (targets.length === 0) {
      return { message: texts.join("\n\n"), choices: [] };
    } else if (targets.length === 1) {
      const next_id = targets[0];
      const next_node = nodes[next_id];
      if (!next_node) {
        return { message: texts.join("\n\n"), choices: [] };
      }
      
      const is_tetap_tidak_bisa = next_node.text.trim().toLowerCase().startsWith("tetap tidak bisa");
      if (is_tetap_tidak_bisa || next_node.is_question) {
        const choices = [{ id: next_id, text: next_node.text }];
        return { message: texts.join("\n\n"), choices };
      } else {
        texts.push(next_node.text);
        curr = next_id;
      }
    } else {
      const seen = new Set();
      const choices = [];
      for (const tid of targets) {
        const tnode = nodes[tid];
        if (tnode && !seen.has(tid)) {
          seen.add(tid);
          choices.push({ id: tid, text: tnode.text });
        }
      }
      return { message: texts.join("\n\n"), choices };
    }
  }
}

router.post('/flow', async (req, res) => {
  try {
    const { category, node_id } = req.body;
    
    const flows = await loadFlows();
    
    if (!category && !node_id) {
      return res.json({
        message: "Halo! Silakan pilih kategori pertanyaan Anda seputar LMS LiVE Unpad:",
        choices: CATEGORY_CHOICES,
        category: null
      });
    }
    
    let activeCategory = category;
    let activeNodeId = node_id;
    
    // Resolve if node_id is a category key
    if (activeNodeId && ROOTS[activeNodeId]) {
      activeCategory = activeNodeId;
      activeNodeId = ROOTS[activeCategory];
    }
    
    if (activeCategory && !activeNodeId) {
      activeNodeId = ROOTS[activeCategory];
      if (!activeNodeId) {
        return res.status(400).json({ error: `Kategori ${activeCategory} tidak valid.` });
      }
    }
    
    if (!activeCategory && activeNodeId) {
      for (const catName of Object.keys(flows)) {
        if (flows[catName].nodes && flows[catName].nodes[activeNodeId]) {
          activeCategory = catName;
          break;
        }
      }
      if (!activeCategory) {
        return res.status(400).json({ error: `Node ID ${activeNodeId} tidak ditemukan di kategori manapun.` });
      }
    }
    
    const result = traverse(flows, activeCategory, activeNodeId);
    
    res.json({
      message: result.message,
      choices: result.choices,
      category: activeCategory
    });
    
  } catch (err) {
    console.error('❌ [Chat /flow] Error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan saat memproses alur chatbot.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'Pesan tidak boleh kosong.' });
    }

    const reply = await processQuestion(message.trim());
    res.json({ reply });
  } catch (err) {
    console.error('❌ [Chat /] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;