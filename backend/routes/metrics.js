import express from 'express';
import { findAll, findOne, insert, update, remove } from '../db/init.js';
import { v4 as uuidv4 } from 'uuid';
import { llmService } from '../services/llm.js';

const router = express.Router();

router.get('/', (req, res) => {
  const { status, category, search, bind_status } = req.query;
  let list = findAll('metrics');
  if (status) list = list.filter(m => m.status === status);
  if (category) list = list.filter(m => m.category === category);
  if (search) list = list.filter(m => m.name.includes(search) || m.name_cn.includes(search));

  // 附加绑定状态和数据集信息
  const enriched = list.map(m => {
    let bindStatus = 'unbound';
    let datasetInfo = null;
    if (m.dataset_id) {
      const ds = findOne('datasets', d => d.id === m.dataset_id);
      if (ds) {
        datasetInfo = { id: ds.id, name: ds.name, table_name: ds.table_name };
        if (m.sql_expression && m.dimension_mappings && m.dimension_mappings.length > 0) {
          bindStatus = 'bound';
        } else {
          bindStatus = 'partial';
        }
      }
    }
    // 如果维度都映射了也算已绑定
    if (bindStatus === 'partial' && m.sql_expression && m.dimension_mappings) {
      const metricDims = m.dimensions || [];
      const mappedDims = (m.dimension_mappings || []).map(dm => dm.metric_dimension);
      if (metricDims.every(d => mappedDims.includes(d))) {
        bindStatus = 'bound';
      }
    }
    return { ...m, bind_status: m.bind_status || bindStatus, dataset_info: datasetInfo };
  });

  if (bind_status) list = enriched.filter(m => m.bind_status === bind_status);
  else list = enriched;

  res.json(list);
});

router.get('/:id', (req, res) => {
  const metric = findOne('metrics', m => m.id === req.params.id);
  if (!metric) return res.status(404).json({ error: '指标不存在' });

  // 附加绑定详情
  let bindInfo = { bind_status: 'unbound', dataset: null, source: null, lineage: [] };
  if (metric.dataset_id) {
    const ds = findOne('datasets', d => d.id === metric.dataset_id);
    if (ds) {
      const source = findOne('datasources', s => s.id === ds.source_id);
      bindInfo = {
        bind_status: metric.bind_status || (metric.sql_expression ? 'bound' : 'partial'),
        dataset: { id: ds.id, name: ds.name, table_name: ds.table_name, fields: ds.fields },
        source: source ? { id: source.id, name: source.name, type: source.type, status: source.status } : null,
        dimension_mappings: metric.dimension_mappings || [],
        sql_expression: metric.sql_expression || '',
      };
    }
  }

  // 血缘链路
  const reqs = metric.source_requirement_id ? findOne('requirements', r => r.id === metric.source_requirement_id) : null;
  const lineage = [];
  if (reqs) lineage.push({ type: 'requirement', id: reqs.id, name: reqs.title });
  lineage.push({ type: 'metric', id: metric.id, name: metric.name_cn });
  if (bindInfo.dataset) lineage.push({ type: 'dataset', id: bindInfo.dataset.id, name: bindInfo.dataset.name });
  if (bindInfo.source) lineage.push({ type: 'datasource', id: bindInfo.source.id, name: bindInfo.source.name });

  res.json({ ...metric, bind_info: bindInfo, lineage });
});

router.post('/', (req, res) => {
  const { name, name_cn, category, expression, dimensions, description } = req.body;
  const metric = { id: uuidv4(), name, name_cn, category: category || '', expression: expression || '', dimensions: dimensions || [], description: description || '', status: 'draft', dataset_id: null, sql_expression: '', dimension_mappings: [], bind_status: 'unbound', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  insert('metrics', metric);
  res.json(metric);
});

router.put('/:id', (req, res) => {
  const { name, name_cn, category, expression, dimensions, description, status } = req.body;
  const updated = update('metrics', req.params.id, { name, name_cn, category, expression, dimensions, description, status, updated_at: new Date().toISOString() });
  if (!updated) return res.status(404).json({ error: '指标不存在' });
  res.json(updated);
});

// 绑定数据集 + 映射字段
router.put('/:id/bind', (req, res) => {
  const metric = findOne('metrics', m => m.id === req.params.id);
  if (!metric) return res.status(404).json({ error: '指标不存在' });

  const { dataset_id, sql_expression, dimension_mappings } = req.body;
  if (!dataset_id) return res.status(400).json({ error: '请选择数据集' });

  const dataset = findOne('datasets', d => d.id === dataset_id);
  if (!dataset) return res.status(400).json({ error: '指定的数据集不存在' });

  // 计算绑定状态
  let bindStatus = 'partial';
  if (sql_expression && dimension_mappings && dimension_mappings.length > 0) {
    const metricDims = metric.dimensions || [];
    const mappedDims = dimension_mappings.map(dm => dm.metric_dimension);
    if (metricDims.every(d => mappedDims.includes(d)) || metricDims.length === 0) {
      bindStatus = 'bound';
    }
  }

  const updated = update('metrics', req.params.id, {
    dataset_id,
    sql_expression: sql_expression || '',
    dimension_mappings: dimension_mappings || [],
    bind_status: bindStatus,
    status: bindStatus === 'bound' ? 'active' : metric.status,
    updated_at: new Date().toISOString(),
  });

  res.json(updated);
});

// 解除绑定
router.put('/:id/unbind', (req, res) => {
  const metric = findOne('metrics', m => m.id === req.params.id);
  if (!metric) return res.status(404).json({ error: '指标不存在' });

  const updated = update('metrics', req.params.id, {
    dataset_id: null,
    sql_expression: '',
    dimension_mappings: [],
    bind_status: 'unbound',
    updated_at: new Date().toISOString(),
  });
  res.json(updated);
});

// LLM 辅助生成 SQL 表达式
router.post('/:id/generate-sql', async (req, res) => {
  const metric = findOne('metrics', m => m.id === req.params.id);
  if (!metric) return res.status(404).json({ error: '指标不存在' });

  const { dataset_id } = req.body;
  const dsId = dataset_id || metric.dataset_id;
  if (!dsId) return res.status(400).json({ error: '请先选择或绑定数据集' });

  const dataset = findOne('datasets', d => d.id === dsId);
  if (!dataset) return res.status(400).json({ error: '指定的数据集不存在' });

  try {
    const fieldsDesc = (dataset.fields || []).map(f => `${f.name} (${f.type}) - ${f.description}`).join('\n');
    const dimsStr = (metric.dimensions || []).join(', ');

    const prompt = `你是一个 SQL 生成助手。请根据以下信息，生成一个 MySQL 兼容的 SQL 查询表达式。

指标名称：${metric.name_cn}
指标计算公式（自然语言）：${metric.expression || '未定义'}
指标维度：${dimsStr || '无'}
指标描述：${metric.description || ''}

数据集表名：${dataset.table_name}
数据集字段：
${fieldsDesc}

要求：
1. 生成一条 SELECT 语句，用于计算该指标
2. 如果有维度，使用 GROUP BY 包含所有维度字段
3. 只返回 SQL 语句，不要任何解释
4. SQL 应该简洁、可执行
5. 使用中文注释说明关键计算逻辑`;

    const result = await llmService.chat([
      { role: 'system', content: '你是一个专业的 SQL 生成助手，只返回纯 SQL 语句，不要任何 markdown 格式或解释文字。' },
      { role: 'user', content: prompt },
    ], { temperature: 0.3, maxTokens: 1024 });

    // 清理 LLM 可能返回的 markdown 格式
    let sql = (result || '').trim();
    sql = sql.replace(/^```sql\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();

    // 自动生成维度映射建议
    const dimensionMappings = [];
    if (metric.dimensions && dataset.fields) {
      metric.dimensions.forEach(dim => {
        // 尝试模糊匹配字段
        const matched = dataset.fields.find(f =>
          f.name.toLowerCase() === dim.toLowerCase() ||
          f.name.toLowerCase().includes(dim.toLowerCase()) ||
          dim.toLowerCase().includes(f.name.toLowerCase()) ||
          (f.description && f.description.includes(dim))
        );
        dimensionMappings.push({
          metric_dimension: dim,
          dataset_field: matched ? matched.name : '',
          dataset_field_desc: matched ? matched.description : '',
        });
      });
    }

    res.json({ sql_expression: sql, dimension_mappings: dimensionMappings, dataset_id: dsId });
  } catch (err) {
    console.error('SQL 生成失败:', err.message);
    res.status(500).json({ error: 'SQL 生成失败：' + err.message });
  }
});

// 查询指标数据（模拟）
router.get('/:id/data', (req, res) => {
  const metric = findOne('metrics', m => m.id === req.params.id);
  if (!metric) return res.status(404).json({ error: '指标不存在' });
  if (!metric.dataset_id) return res.status(400).json({ error: '指标尚未绑定数据集' });
  if (!metric.sql_expression) return res.status(400).json({ error: '指标尚未配置 SQL 表达式' });

  // 模拟返回查询结果
  const dimensions = metric.dimensions || [];
  const rows = [];
  for (let i = 0; i < 10; i++) {
    const row = {};
    dimensions.forEach(d => {
      row[d] = `${d}_value_${i + 1}`;
    });
    row.metric_value = Math.floor(Math.random() * 10000) + 100;
    row.period = `2026-0${3 + Math.floor(i / 5)}-${10 + i}`;
    rows.push(row);
  }

  res.json({
    metric: { id: metric.id, name: metric.name_cn, expression: metric.expression, sql_expression: metric.sql_expression },
    dimensions,
    rows,
    total: rows.length,
  });
});

router.delete('/:id', (req, res) => {
  remove('metrics', req.params.id);
  res.json({ message: '删除成功' });
});

export default router;
