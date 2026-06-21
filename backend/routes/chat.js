import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import { protect } from '../middleware/authMiddleware.js';
import { processQuestion } from '../utils/chatHelper.js';
import { prisma } from '../services/prisma.js';

// Helper: ambil role user dari token jika ada (tidak wajib login)
async function getUserRoleFromRequest(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      await fs.appendFile('debug.log', 'getUserRoleFromRequest: No auth header\n');
      return null;
    }
    if (!authHeader.startsWith('Bearer ')) {
      await fs.appendFile('debug.log', 'getUserRoleFromRequest: Auth header does not start with Bearer\n');
      return null;
    }
    const token = authHeader.split(' ')[1];
    await fs.appendFile('debug.log', `getUserRoleFromRequest: Token found: ${token.substring(0, 15)}...\n`);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await fs.appendFile('debug.log', `getUserRoleFromRequest: Decoded: ${JSON.stringify(decoded)}\n`);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { role: true } });
    await fs.appendFile('debug.log', `getUserRoleFromRequest: User in DB: ${JSON.stringify(user)}\n`);
    return user?.role || null;
  } catch (err) {
    await fs.appendFile('debug.log', `getUserRoleFromRequest: Error: ${err.message}\n`);
    return null;
  }
}

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

function traverse(flows, category, node_id, userRole) {
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

  // Helper to check if a node is the role selection question
  const isRoleQuestionNode = (nid) => {
    const node = nodes[nid];
    if (!node) return false;
    const text = (node.text || "").toLowerCase();
    return nid.includes('role_question') || (text.includes('dosen') && text.includes('mahasiswa') && text.includes('apakah'));
  };

  const isTeacher = userRole === 'teacher' || userRole === 'admin';
  const isStudent = userRole === 'student';

  const texts = [];
  
  // If the starting node is the role question, and we have a role, auto-skip
  if (userRole && isRoleQuestionNode(curr)) {
    const targets = outgoing[curr] || [];
    let targetId = null;
    for (const tid of targets) {
      const tnode = nodes[tid];
      if (tnode) {
        const txt = (tnode.text || "").toLowerCase();
        if (isTeacher && (txt.includes('dosen') || tid.includes('dosen'))) {
          targetId = tid;
          break;
        } else if (isStudent && (txt.includes('mahasiswa') || tid.includes('mahasiswa'))) {
          targetId = tid;
          break;
        }
      }
    }
    if (targetId) {
      curr = targetId;
    }
  }

  // If the current node is a role choice button (e.g. "Dosen" or "Mahasiswa"), and we are skipping, we don't add its text.
  const isRoleChoiceButton = (nid) => {
    const node = nodes[nid];
    if (!node) return false;
    const txt = (node.text || "").toLowerCase();
    return (txt === 'dosen' || txt === 'mahasiswa') && (nid.includes('dosen') || nid.includes('mahasiswa'));
  };

  const currNode = nodes[curr];
  if (!isRoleChoiceButton(curr) && !isRoleQuestionNode(curr)) {
    texts.push(currNode.text);
  }

  while (true) {
    let targets = outgoing[curr] || [];
    
    // Check if the next node is a role question that we should auto-skip
    if (userRole && targets.length === 1 && isRoleQuestionNode(targets[0])) {
      const qNodeId = targets[0];
      const qTargets = outgoing[qNodeId] || [];
      let targetId = null;
      for (const tid of qTargets) {
        const tnode = nodes[tid];
        if (tnode) {
          const txt = (tnode.text || "").toLowerCase();
          if (isTeacher && (txt.includes('dosen') || tid.includes('dosen'))) {
            targetId = tid;
            break;
          } else if (isStudent && (txt.includes('mahasiswa') || tid.includes('mahasiswa'))) {
            targetId = tid;
            break;
          }
        }
      }
      if (targetId) {
        // Skip the question and go straight to the chosen role node
        curr = targetId;
        continue;
      }
    }

    // Refresh targets after potential skips
    targets = outgoing[curr] || [];

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
        if (!isRoleChoiceButton(next_id) && !isRoleQuestionNode(next_id)) {
          texts.push(next_node.text);
        }
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

    // Cek role user dari token (opsional, tidak wajib login)
    const userRole = await getUserRoleFromRequest(req);
    const isTeacher = userRole === 'teacher';
    const isStudent = userRole === 'student';
    const isAdmin = userRole === 'admin';

    // Filter category choices based on role
    let filteredChoices = [...CATEGORY_CHOICES];
    if (isTeacher) {
      filteredChoices = filteredChoices.filter(c => c.id !== 'Mahasiswa');
    } else if (isStudent) {
      filteredChoices = filteredChoices.filter(c => ['LOGIN', 'Masuk Course', 'Enroll', 'Mahasiswa'].includes(c.id));
    } else if (isAdmin) {
      filteredChoices = filteredChoices.map(c => {
        if (['Backup and Restore', 'Menambahkan Aktivitas', 'Menambahkan Resources', 'Quiz', 'Gradebook', 'Panopto'].includes(c.id)) {
          return { ...c, text: `${c.text} (Khusus Dosen)` };
        }
        if (c.id === 'Mahasiswa') {
          return { ...c, text: `${c.text} (Khusus Mahasiswa)` };
        }
        return c;
      });
    }

    if (!category && !node_id) {
      return res.json({
        message: "Halo! Silakan pilih kategori pertanyaan Anda seputar LMS LiVE Unpad:",
        choices: filteredChoices,
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

    // Role-based access restriction check
    if (activeCategory) {
      if (isTeacher && activeCategory === 'Mahasiswa') {
        return res.status(403).json({ error: 'Kategori ini hanya dapat diakses oleh Mahasiswa.' });
      }
      if (isStudent && ['Backup and Restore', 'Menambahkan Aktivitas', 'Menambahkan Resources', 'Quiz', 'Gradebook', 'Panopto'].includes(activeCategory)) {
        return res.status(403).json({ error: 'Kategori ini hanya dapat diakses oleh Dosen.' });
      }
    }
    
    let result = traverse(flows, activeCategory, activeNodeId, userRole);
    
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