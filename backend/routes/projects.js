import express from 'express';
import { findAll, findOne, insert, update, remove, write as dbWrite } from '../db/init.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.get('/', (req, res) => {
  const { status } = req.query;
  let list = findAll('projects');
  if (status) list = list.filter(p => p.status === status);
  res.json(list);
});

router.get('/:id', (req, res) => {
  const project = findOne('projects', p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: '项目不存在' });
  const messages = findAll('project_messages').filter(m => m.project_id === req.params.id);
  res.json({ ...project, messages });
});

router.post('/', (req, res) => {
  const { name, description } = req.body;
  const project = { id: uuidv4(), name, description: description || '', status: 'planning', current_phase: 'analysis', progress: 5, created_by: req.user.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  insert('projects', project);
  res.json(project);
});

router.put('/:id', (req, res) => {
  const { name, description, status, current_phase, progress } = req.body;
  const updated = update('projects', req.params.id, { name, description, status, current_phase, progress, updated_at: new Date().toISOString() });
  if (!updated) return res.status(404).json({ error: '项目不存在' });
  res.json(updated);
});

router.post('/:id/messages', (req, res) => {
  const { agent_id, role, content, phase } = req.body;
  const msg = { id: uuidv4(), project_id: req.params.id, agent_id, role, content, phase, created_at: new Date().toISOString() };
  insert('project_messages', msg);
  if (phase) {
    const phaseMap = { analysis: 15, model: 35, etl: 55, viz: 75, qa: 90, ops: 100 };
    if (phaseMap[phase]) update('projects', req.params.id, { current_phase: phase, progress: phaseMap[phase], updated_at: new Date().toISOString() });
  }
  res.json({ id: msg.id, created_at: msg.created_at });
});

router.delete('/:id', (req, res) => {
  const proj = findOne('projects', p => p.id === req.params.id);
  if (!proj) return res.status(404).json({ error: '项目不存在' });
  remove('projects', req.params.id);
  dbWrite('project_messages', findAll('project_messages').filter(m => m.project_id !== req.params.id));
  res.json({ message: '删除成功' });
});

export default router;
