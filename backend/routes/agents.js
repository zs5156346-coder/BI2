import express from 'express';
import { findAll, insert, write } from '../db/init.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const AGENTS_FILE = join(__dirname, '../db/data/agents.json');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(findAll('agents'));
});

router.get('/:agentId', (req, res) => {
  const agent = findAll('agents').find(a => a.id === req.params.agentId);
  if (!agent) return res.status(404).json({ error: 'Agent不存在' });
  res.json(agent);
});

// 设置 Agent 的模型
router.put('/:agentId/model', (req, res) => {
  const { model } = req.body;
  if (!model) return res.status(400).json({ error: '缺少 model 参数' });

  const agents = findAll('agents');
  const idx = agents.findIndex(a => a.id === req.params.agentId);
  if (idx === -1) return res.status(404).json({ error: 'Agent不存在' });

  agents[idx] = { ...agents[idx], model, updated_at: new Date().toISOString() };
  fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2), 'utf-8');

  res.json({ message: '模型已更新', model, agent_id: req.params.agentId });
});

router.post('/:agentId/messages', (req, res) => {
  const { role, content, metadata } = req.body;
  const msg = { id: uuidv4(), agent_id: req.params.agentId, user_id: req.user.id, role, content, metadata: metadata || {}, created_at: new Date().toISOString() };
  insert('messages', msg);
  res.json({ id: msg.id, created_at: msg.created_at });
});

router.get('/:agentId/messages', (req, res) => {
  const messages = findAll('messages').filter(m => m.agent_id === req.params.agentId && m.user_id === req.user.id);
  res.json(messages);
});

export default router;
