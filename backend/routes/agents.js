import express from 'express';
import { findAll, insert } from '../db/init.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.get('/', (req, res) => {
  res.json(findAll('agents'));
});

router.get('/:agentId', (req, res) => {
  const agent = findAll('agents').find(a => a.id === req.params.agentId);
  if (!agent) return res.status(404).json({ error: 'Agent不存在' });
  res.json(agent);
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
