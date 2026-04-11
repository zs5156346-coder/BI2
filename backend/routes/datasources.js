import express from 'express';
import { findAll, findOne, insert, update, remove, count } from '../db/init.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// 列表（密码脱敏）
router.get('/', (req, res) => {
  const { status, type, search } = req.query;
  let list = findAll('datasources');
  if (status) list = list.filter(d => d.status === status);
  if (type) list = list.filter(d => d.type === type);
  if (search) list = list.filter(d => d.name.includes(search) || (d.description || '').includes(search));
  // 脱敏密码
  const safe = list.map(d => {
    const { password_encrypted, ...rest } = d;
    return { ...rest, has_password: !!password_encrypted };
  });
  res.json(safe);
});

// 详情
router.get('/:id', (req, res) => {
  const ds = findOne('datasources', d => d.id === req.params.id);
  if (!ds) return res.status(404).json({ error: '数据源不存在' });
  const { password_encrypted, ...rest } = ds;
  res.json({ ...rest, has_password: !!password_encrypted });
});

// 创建
router.post('/', (req, res) => {
  const { name, type, host, port, database, username, password, description } = req.body;
  if (!name || !type || !host) return res.status(400).json({ error: '名称、类型和主机地址为必填项' });
  const ds = {
    id: uuidv4(),
    name, type, host, port: port || (type === 'postgresql' ? 5432 : 3306),
    database: database || '', username: username || '',
    password_encrypted: password ? Buffer.from(password).toString('base64') : '',
    description: description || '',
    status: 'offline',
    last_test_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  insert('datasources', ds);
  const { password_encrypted, ...safe } = ds;
  res.json({ ...safe, has_password: !!ds.password_encrypted });
});

// 更新
router.put('/:id', (req, res) => {
  const ds = findOne('datasources', d => d.id === req.params.id);
  if (!ds) return res.status(404).json({ error: '数据源不存在' });
  const { name, type, host, port, database, username, password, description } = req.body;
  const updates = {
    name, type, host, port, database, username, description,
    updated_at: new Date().toISOString(),
  };
  if (password !== undefined) {
    updates.password_encrypted = password ? Buffer.from(password).toString('base64') : '';
  }
  // 清除undefined字段
  Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);
  const updated = update('datasources', req.params.id, updates);
  const { password_encrypted, ...safe } = updated;
  res.json({ ...safe, has_password: !!updated.password_encrypted });
});

// 删除
router.delete('/:id', (req, res) => {
  // 检查是否有关联数据集
  const dsCount = count('datasets', d => d.source_id === req.params.id);
  if (dsCount > 0) return res.status(400).json({ error: `该数据源下还有 ${dsCount} 个数据集，请先删除数据集` });
  remove('datasources', req.params.id);
  res.json({ message: '删除成功' });
});

// 测试连接（模拟）
router.post('/:id/test', (req, res) => {
  const ds = findOne('datasources', d => d.id === req.params.id);
  if (!ds) return res.status(404).json({ error: '数据源不存在' });

  // 模拟连接测试：根据当前状态随机返回
  // 实际生产环境需要真正尝试连接数据库
  const isOnline = ds.status === 'online' || Math.random() > 0.2;
  const result = isOnline ? 'success' : 'failed';
  const latency = Math.floor(Math.random() * 100) + 10;

  update('datasources', req.params.id, {
    status: isOnline ? 'online' : 'offline',
    last_test_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  res.json({
    result,
    latency_ms: latency,
    message: isOnline ? '连接成功' : '连接失败：无法访问数据库服务器',
    tested_at: new Date().toISOString(),
  });
});

// 浏览数据源下的表列表（模拟）
router.get('/:id/tables', (req, res) => {
  const ds = findOne('datasources', d => d.id === req.params.id);
  if (!ds) return res.status(404).json({ error: '数据源不存在' });

  // 根据数据源类型返回模拟表列表
  const tableMap = {
    'ds-mes': [
      { name: 'mes_vehicle_production', comment: '车辆生产明细', row_count: 125680 },
      { name: 'mes_line_output', comment: '产线产出汇总', row_count: 8900 },
      { name: 'mes_quality_inspection', comment: '质量检验记录', row_count: 342000 },
      { name: 'mes_downtime', comment: '停线记录', row_count: 5600 },
    ],
    'ds-crm': [
      { name: 'crm_vehicle_delivery', comment: '车辆交付明细', row_count: 98320 },
      { name: 'crm_customer', comment: '客户信息', row_count: 450000 },
      { name: 'crm_order', comment: '销售订单', row_count: 210000 },
      { name: 'crm_lead', comment: '线索数据', row_count: 680000 },
    ],
    'ds-dms': [
      { name: 'dms_service_workorder', comment: '售后维修工单', row_count: 67800 },
      { name: 'dms_dealer', comment: '经销商信息', row_count: 3200 },
      { name: 'dms_nps_survey', comment: 'NPS调查', row_count: 89000 },
    ],
    'ds-erp': [
      { name: 'erp_repair_cost', comment: '维修成本明细', row_count: 203400 },
      { name: 'erp_purchase', comment: '采购订单', row_count: 56000 },
      { name: 'erp_budget', comment: '预算数据', row_count: 12000 },
    ],
    'ds-wms': [
      { name: 'wms_parts_inventory', comment: '配件库存', row_count: 15600 },
      { name: 'wms_inbound', comment: '入库记录', row_count: 89000 },
      { name: 'wms_outbound', comment: '出库记录', row_count: 76000 },
    ],
    'ds-tms': [
      { name: 'tms_vehicle_transit', comment: '在途车辆', row_count: 4520 },
      { name: 'tms_shipment', comment: '发运记录', row_count: 34000 },
      { name: 'tms_logistics_order', comment: '物流订单', row_count: 28000 },
    ],
  };

  const tables = tableMap[ds.id] || [
    { name: `${ds.database || 'default'}_table_1`, comment: '示例表1', row_count: 1000 },
    { name: `${ds.database || 'default'}_table_2`, comment: '示例表2', row_count: 2000 },
  ];

  res.json(tables);
});

// 获取表的字段元数据（模拟）
router.get('/:id/tables/:tableName/fields', (req, res) => {
  const ds = findOne('datasources', d => d.id === req.params.id);
  if (!ds) return res.status(404).json({ error: '数据源不存在' });

  // 从已有数据集中查找该表的字段定义
  const dataset = findOne('datasets', d => d.source_id === ds.id && d.table_name === req.params.tableName);
  if (dataset && dataset.fields) {
    return res.json(dataset.fields);
  }

  // 通用模拟字段
  res.json([
    { name: 'id', type: 'string', description: '主键ID' },
    { name: 'created_at', type: 'datetime', description: '创建时间' },
    { name: 'updated_at', type: 'datetime', description: '更新时间' },
  ]);
});

export default router;
