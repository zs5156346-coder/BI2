import express from 'express';
import { findAll, findOne, insert, update, remove } from '../db/init.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

router.get('/', (req, res) => {
  const { status, category, search } = req.query;
  let list = findAll('metrics');
  if (status) list = list.filter(m => m.status === status);
  if (category) list = list.filter(m => m.category === category);
  if (search) list = list.filter(m => m.name.includes(search) || m.name_cn.includes(search));
  res.json(list);
});

router.get('/:id', (req, res) => {
  const metric = findOne('metrics', m => m.id === req.params.id);
  if (!metric) return res.status(404).json({ error: '指标不存在' });
  res.json(metric);
});

router.post('/', (req, res) => {
  const { name, name_cn, category, expression, dimensions, description } = req.body;
  const metric = { id: uuidv4(), name, name_cn, category: category || '', expression: expression || '', dimensions: dimensions || [], description: description || '', status: 'draft', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  insert('metrics', metric);
  res.json(metric);
});

router.put('/:id', (req, res) => {
  const { name, name_cn, category, expression, dimensions, description, status } = req.body;
  const updated = update('metrics', req.params.id, { name, name_cn, category, expression, dimensions, description, status, updated_at: new Date().toISOString() });
  if (!updated) return res.status(404).json({ error: '指标不存在' });
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  remove('metrics', req.params.id);
  res.json({ message: '删除成功' });
});

export default router;
