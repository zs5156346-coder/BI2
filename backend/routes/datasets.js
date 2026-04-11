import express from 'express';
import { findAll, findOne, insert, update, remove, count } from '../db/init.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// 列表
router.get('/', (req, res) => {
  const { source_id, status, search } = req.query;
  let list = findAll('datasets');
  if (source_id) list = list.filter(d => d.source_id === source_id);
  if (status) list = list.filter(d => d.status === status);
  if (search) list = list.filter(d => d.name.includes(search) || d.table_name.includes(search));

  // 附加数据源名称和关联指标数
  const enriched = list.map(d => {
    const source = findOne('datasources', s => s.id === d.source_id);
    const metricCount = count('metrics', m => m.dataset_id === d.id);
    return { ...d, source_name: source?.name || '未知', metric_count: metricCount };
  });
  res.json(enriched);
});

// 详情
router.get('/:id', (req, res) => {
  const ds = findOne('datasets', d => d.id === req.params.id);
  if (!ds) return res.status(404).json({ error: '数据集不存在' });
  const source = findOne('datasources', s => s.id === ds.source_id);
  const metrics = findAll('metrics').filter(m => m.dataset_id === ds.id);
  res.json({ ...ds, source_name: source?.name || '未知', metrics });
});

// 创建
router.post('/', (req, res) => {
  const { source_id, name, table_name, query, mode, fields, description } = req.body;
  if (!source_id || !name) return res.status(400).json({ error: '数据源和名称为必填项' });
  if (mode === 'table' && !table_name) return res.status(400).json({ error: '表模式下表名不能为空' });
  if (mode === 'sql' && !query) return res.status(400).json({ error: 'SQL模式下查询语句不能为空' });

  const source = findOne('datasources', s => s.id === source_id);
  if (!source) return res.status(400).json({ error: '指定的数据源不存在' });

  const dataset = {
    id: uuidv4(),
    source_id, name,
    table_name: table_name || '',
    query: query || '',
    mode: mode || 'table',
    fields: fields || [],
    description: description || '',
    row_count: 0,
    sync_mode: 'manual',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  insert('datasets', dataset);
  res.json({ ...dataset, source_name: source.name, metric_count: 0 });
});

// 更新
router.put('/:id', (req, res) => {
  const ds = findOne('datasets', d => d.id === req.params.id);
  if (!ds) return res.status(404).json({ error: '数据集不存在' });
  const { name, table_name, query, mode, fields, description, sync_mode, status } = req.body;
  const updates = {
    name, table_name, query, mode, fields, description, sync_mode, status,
    updated_at: new Date().toISOString(),
  };
  Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);
  const updated = update('datasets', req.params.id, updates);
  const source = findOne('datasources', s => s.id === updated.source_id);
  res.json({ ...updated, source_name: source?.name || '未知' });
});

// 删除
router.delete('/:id', (req, res) => {
  const metricCount = count('metrics', m => m.dataset_id === req.params.id);
  if (metricCount > 0) return res.status(400).json({ error: `该数据集关联了 ${metricCount} 个指标，请先解除绑定` });
  remove('datasets', req.params.id);
  res.json({ message: '删除成功' });
});

// 数据预览（模拟返回前20行样例数据）
router.get('/:id/preview', (req, res) => {
  const ds = findOne('datasets', d => d.id === req.params.id);
  if (!ds) return res.status(404).json({ error: '数据集不存在' });

  // 根据字段生成模拟预览数据
  if (!ds.fields || ds.fields.length === 0) {
    return res.json({ fields: [], rows: [] });
  }

  const rows = [];
  for (let i = 0; i < 5; i++) {
    const row = {};
    ds.fields.forEach(f => {
      if (f.type === 'string') row[f.name] = `${f.name}_${1001 + i}`;
      else if (f.type === 'int') row[f.name] = Math.floor(Math.random() * 1000) + 100;
      else if (f.type === 'float' || f.type === 'decimal') row[f.name] = (Math.random() * 10000).toFixed(2);
      else if (f.type === 'date') row[f.name] = `2026-0${3 + Math.floor(i / 2)}-${10 + i}`;
      else if (f.type === 'datetime') row[f.name] = `2026-0${3 + Math.floor(i / 2)}-${10 + i} ${8 + i}:${30 + i}:00`;
      else row[f.name] = `sample_${i + 1}`;
    });
    rows.push(row);
  }

  res.json({ fields: ds.fields, rows, total: ds.row_count || 0 });
});

// 刷新字段元数据（模拟）
router.post('/:id/refresh-fields', (req, res) => {
  const ds = findOne('datasets', d => d.id === req.params.id);
  if (!ds) return res.status(404).json({ error: '数据集不存在' });

  // 模拟刷新：返回现有字段（实际环境会重新从数据源读取）
  const updated = update('datasets', req.params.id, {
    updated_at: new Date().toISOString(),
  });
  res.json({ message: '字段元数据已刷新', fields: updated.fields || [] });
});

export default router;
