import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB = {
  users: join(DATA_DIR, 'users.json'),
  agents: join(DATA_DIR, 'agents.json'),
  messages: join(DATA_DIR, 'messages.json'),
  metrics: join(DATA_DIR, 'metrics.json'),
  models: join(DATA_DIR, 'models.json'),
  visualizations: join(DATA_DIR, 'visualizations.json'),
  projects: join(DATA_DIR, 'projects.json'),
  project_messages: join(DATA_DIR, 'project_messages.json'),
  permissions: join(DATA_DIR, 'permissions.json'),
  requirements: join(DATA_DIR, 'requirements.json'),
  audit_logs: join(DATA_DIR, 'audit_logs.json'),
  agent_skills: join(DATA_DIR, 'agent_skills.json'),
  datasources: join(DATA_DIR, 'datasources.json'),
  datasets: join(DATA_DIR, 'datasets.json'),
};

function read(key) {
  const path = DB[key];
  if (!fs.existsSync(path)) return [];
  try { return JSON.parse(fs.readFileSync(path, 'utf-8')); } catch { return []; }
}

function write(key, data) {
  fs.writeFileSync(DB[key], JSON.stringify(data, null, 2), 'utf-8');
}

function findOne(key, fn) {
  return read(key).find(fn);
}

function findAll(key, fn) {
  return fn ? read(key).filter(fn) : read(key);
}

function insert(key, item) {
  const arr = read(key);
  arr.push(item);
  write(key, arr);
  return item;
}

function update(key, id, updates) {
  const arr = read(key);
  const idx = arr.findIndex(i => i.id === id);
  if (idx === -1) return null;
  arr[idx] = { ...arr[idx], ...updates };
  write(key, arr);
  return arr[idx];
}

function remove(key, id) {
  const arr = read(key).filter(i => i.id !== id);
  write(key, arr);
}

function count(key, fn) {
  return findAll(key, fn).length;
}

export { read, write, findOne, findAll, insert, update, remove, count };

export function initDB() {
  // Users
  if (!fs.existsSync(DB.users) || read('users').length === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    write('users', [{ id: uuidv4(), username: 'admin', password: hashedPassword, role: 'admin', avatar: null, created_at: new Date().toISOString() }]);
  }

  // Agents
  if (!fs.existsSync(DB.agents) || read('agents').length === 0) {
    const agents = [
      { id: 'analyst', name: 'Analyst Agent', name_cn: '需求分析 Agent', description: '理解业务需求，转化为结构化指标定义', icon: '💡', color: '#6366f1', capabilities: ['需求解析', '指标定义', '口径校验', '分析方案'], status: 'online' },
      { id: 'modeler', name: 'Modeler Agent', name_cn: '数据模型 Agent', description: '设计数据仓库模型，支持星型/雪花模型', icon: '🏗️', color: '#8b5cf6', capabilities: ['模型设计', 'DDL生成', '模型复用', '变更影响分析'], status: 'online' },
      { id: 'etl', name: 'ETL Agent', name_cn: 'ETL 开发 Agent', description: '自动生成数据管道SQL代码和调度配置', icon: '⚡', color: '#f59e0b', capabilities: ['SQL生成', '管道编排', '增量策略', '性能优化'], status: 'online' },
      { id: 'service', name: 'Service Agent', name_cn: '指标服务 Agent', description: '提供指标API接口，支持灵活查询', icon: '🔌', color: '#10b981', capabilities: ['接口生成', '查询优化', '缓存管理', '版本控制'], status: 'online' },
      { id: 'viz', name: 'Viz Agent', name_cn: '可视化 Agent', description: '智能推荐图表类型，设计仪表盘', icon: '📊', color: '#3b82f6', capabilities: ['图表推荐', '布局设计', '交互配置', '自动发布'], status: 'online' },
      { id: 'qa', name: 'QA Agent', name_cn: '质量保障 Agent', description: '全链路数据质量检查和验证', icon: '🛡️', color: '#ef4444', capabilities: ['数据质量', '口径一致性', '回归测试', '测试报告'], status: 'online' },
      { id: 'uat', name: 'UAT Agent', name_cn: 'UAT验证 Agent', description: '业务验收验证，展示看板并收集用户反馈', icon: '✅', color: '#14b8a6', capabilities: ['验收测试', '看板展示', '用户反馈', '验收报告'], status: 'online' },
      { id: 'ops', name: 'Ops Agent', name_cn: '运维监控 Agent', description: '监控任务执行，处理告警', icon: '⚙️', color: '#6b7280', capabilities: ['调度监控', '数据新鲜度', '性能监控', '告警管理'], status: 'online' },
      { id: 'orchestrator', name: 'Orchestrator Agent', name_cn: '编排调度 Agent', description: '协调各Agent工作，跟踪项目进度', icon: '🎯', color: '#ec4899', capabilities: ['任务编排', 'Agent分派', '状态追踪', '异常处理'], status: 'online' },
    ];
    write('agents', agents);
  }

  // Metrics
  if (!fs.existsSync(DB.metrics) || read('metrics').length === 0) {
    const metrics = [
      { id: uuidv4(), name: 'daily_revenue', name_cn: '日销售额', category: '交易', expression: 'SUM(order_amount)', dimensions: ['dt', 'city', 'product_category'], description: '每日所有订单的销售总额', status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: uuidv4(), name: 'daily_orders', name_cn: '日订单量', category: '交易', expression: 'COUNT(DISTINCT order_id)', dimensions: ['dt', 'city'], description: '每日订单总数', status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: uuidv4(), name: 'dau', name_cn: '日活跃用户数', category: '用户', expression: 'COUNT(DISTINCT user_id)', dimensions: ['dt', 'platform'], description: '每日活跃用户去重数量', status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: uuidv4(), name: 'avg_order_value', name_cn: '客单价', category: '交易', expression: 'SUM(order_amount)/COUNT(DISTINCT user_id)', dimensions: ['dt', 'city'], description: '每用户平均订单金额', status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: uuidv4(), name: 'retention_rate_d1', name_cn: '次日留存率', category: '用户', expression: 'DAY1_RETAIN/DAY0_LOGIN*100', dimensions: ['dt', 'channel'], description: '新用户次日留存率', status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
    write('metrics', metrics);
  }

  // Visualizations
  if (!fs.existsSync(DB.visualizations) || read('visualizations').length === 0) {
    const vizs = [
      { id: uuidv4(), title: '销售概览仪表盘', type: 'dashboard', config: { layout: 'grid', charts: [{ id: 'c1', type: 'line', title: '日销售额趋势', metrics: ['daily_revenue'], xAxis: 'dt' }, { id: 'c2', type: 'bar', title: 'TOP10城市', metrics: ['daily_revenue'], xAxis: 'city', limit: 10 }, { id: 'c3', type: 'pie', title: '品类占比', metrics: ['daily_revenue'], xAxis: 'product_category' }] }, metrics: ['daily_revenue'], created_by: 'admin', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: uuidv4(), title: '用户分析仪表盘', type: 'dashboard', config: { layout: 'grid', charts: [{ id: 'c1', type: 'line', title: 'DAU趋势', metrics: ['dau'], xAxis: 'dt' }, { id: 'c2', type: 'line', title: '留存率趋势', metrics: ['retention_rate_d1'], xAxis: 'dt' }] }, metrics: ['dau', 'retention_rate_d1'], created_by: 'admin', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
    write('visualizations', vizs);
  }

  // Projects
  if (!fs.existsSync(DB.projects) || read('projects').length === 0) {
    const projects = [
      { id: uuidv4(), name: '电商销售分析平台', description: '整合多渠道销售数据，提供实时销售洞察', status: 'developing', current_phase: 'etl', progress: 65, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: uuidv4(), name: '用户行为分析系统', description: '追踪用户全链路行为，支持精细化运营', status: 'planning', current_phase: 'analysis', progress: 20, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: uuidv4(), name: '供应链监控平台', description: '实时监控供应链各环节指标', status: 'completed', current_phase: 'ops', progress: 100, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
    write('projects', projects);
  }

  // DataSources
  if (!fs.existsSync(DB.datasources) || read('datasources').length === 0) {
    const datasources = [
      { id: 'ds-mes', name: 'MES 制造执行系统', type: 'mysql', host: '192.168.1.10', port: 3306, database: 'mes_production', username: 'readonly', password_encrypted: Buffer.from('mes_readonly_2026').toString('base64'), status: 'online', description: '生产制造执行系统，包含生产订单、工位数据、产出量等', last_test_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'ds-crm', name: 'CRM 客户关系系统', type: 'mysql', host: '192.168.1.20', port: 3306, database: 'crm_sales', username: 'readonly', password_encrypted: Buffer.from('crm_readonly_2026').toString('base64'), status: 'online', description: '客户关系管理系统，包含客户信息、销售订单、交付数据等', last_test_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'ds-dms', name: 'DMS 经销商管理系统', type: 'postgresql', host: '192.168.1.30', port: 5432, database: 'dms_dealer', username: 'readonly', password_encrypted: Buffer.from('dms_readonly_2026').toString('base64'), status: 'online', description: '经销商管理系统，包含交付、维修工单、NPS等数据', last_test_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'ds-erp', name: 'ERP 企业资源计划', type: 'mysql', host: '192.168.1.40', port: 3306, database: 'erp_finance', username: 'readonly', password_encrypted: Buffer.from('erp_readonly_2026').toString('base64'), status: 'online', description: 'ERP系统，包含成本、库存、采购等财务数据', last_test_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'ds-wms', name: 'WMS 仓储管理系统', type: 'mysql', host: '192.168.1.50', port: 3306, database: 'wms_inventory', username: 'readonly', password_encrypted: Buffer.from('wms_readonly_2026').toString('base64'), status: 'offline', description: '仓储管理系统，包含配件库存、出入库记录等', last_test_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: 'ds-tms', name: 'TMS 运输管理系统', type: 'mysql', host: '192.168.1.60', port: 3306, database: 'tms_logistics', username: 'readonly', password_encrypted: Buffer.from('tms_readonly_2026').toString('base64'), status: 'online', description: '运输管理系统，包含在途车辆、物流跟踪等数据', last_test_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
    write('datasources', datasources);
  }

  // Datasets
  if (!fs.existsSync(DB.datasets) || read('datasets').length === 0) {
    const datasets = [
      {
        id: 'set-production', source_id: 'ds-mes', name: '车辆生产明细表', table_name: 'mes_vehicle_production', query: '', mode: 'table',
        fields: [
          { name: 'vehicle_id', type: 'string', description: '车辆唯一标识' },
          { name: 'vehicle_model', type: 'string', description: '车型代号' },
          { name: 'production_status', type: 'string', description: '生产状态：planned/ongoing/completed' },
          { name: 'production_date', type: 'date', description: '生产完成日期' },
          { name: 'workshop', type: 'string', description: '车间' },
          { name: 'line_id', type: 'string', description: '产线编号' },
          { name: 'region', type: 'string', description: '工厂所在区域' },
        ],
        row_count: 125680, sync_mode: 'manual', status: 'active',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      },
      {
        id: 'set-delivery', source_id: 'ds-crm', name: '车辆交付明细表', table_name: 'crm_vehicle_delivery', query: '', mode: 'table',
        fields: [
          { name: 'delivery_id', type: 'string', description: '交付记录ID' },
          { name: 'vin', type: 'string', description: '车架号' },
          { name: 'vehicle_model', type: 'string', description: '车型代号' },
          { name: 'delivery_status', type: 'string', description: '交付状态' },
          { name: 'customer_sign_date', type: 'date', description: '客户签收日期' },
          { name: 'promised_date', type: 'date', description: '承诺交付日期' },
          { name: 'region', type: 'string', description: '销售区域' },
          { name: 'dealer_id', type: 'string', description: '经销商ID' },
        ],
        row_count: 98320, sync_mode: 'manual', status: 'active',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      },
      {
        id: 'set-transit', source_id: 'ds-tms', name: '在途车辆明细表', table_name: 'tms_vehicle_transit', query: '', mode: 'table',
        fields: [
          { name: 'transit_id', type: 'string', description: '在途记录ID' },
          { name: 'vin', type: 'string', description: '车架号' },
          { name: 'ship_date', type: 'date', description: '发运日期' },
          { name: 'arrival_status', type: 'string', description: '到达状态：in_transit/arrived/signed' },
          { name: 'origin', type: 'string', description: '始发地' },
          { name: 'destination', type: 'string', description: '目的地' },
          { name: 'vehicle_model', type: 'string', description: '车型代号' },
        ],
        row_count: 4520, sync_mode: 'manual', status: 'active',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      },
      {
        id: 'set-aftersales', source_id: 'ds-dms', name: '售后维修工单表', table_name: 'dms_service_workorder', query: '', mode: 'table',
        fields: [
          { name: 'workorder_id', type: 'string', description: '工单编号' },
          { name: 'service_type', type: 'string', description: '服务类型：warranty/maintenance/repair' },
          { name: 'vin', type: 'string', description: '车架号' },
          { name: 'vehicle_model', type: 'string', description: '车型' },
          { name: 'checkin_time', type: 'datetime', description: '进站时间' },
          { name: 'completion_time', type: 'datetime', description: '维修完成时间' },
          { name: 'labor_cost', type: 'decimal', description: '工时费' },
          { name: 'parts_cost', type: 'decimal', description: '材料费' },
          { name: 'total_cost', type: 'decimal', description: '总费用' },
          { name: 'nps_score', type: 'int', description: '客户满意度评分' },
          { name: 'satisfaction_level', type: 'string', description: '满意程度：satisfied/neutral/unsatisfied' },
        ],
        row_count: 67800, sync_mode: 'manual', status: 'active',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      },
      {
        id: 'set-parts-cost', source_id: 'ds-erp', name: '维修成本明细表', table_name: 'erp_repair_cost', query: '', mode: 'table',
        fields: [
          { name: 'cost_id', type: 'string', description: '成本记录ID' },
          { name: 'workorder_id', type: 'string', description: '关联工单号' },
          { name: 'cost_type', type: 'string', description: '成本类型：labor/parts/overhead' },
          { name: 'amount', type: 'decimal', description: '金额' },
          { name: 'period', type: 'string', description: '统计周期(年月)' },
        ],
        row_count: 203400, sync_mode: 'manual', status: 'active',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      },
      {
        id: 'set-parts-inventory', source_id: 'ds-wms', name: '配件库存明细表', table_name: 'wms_parts_inventory', query: '', mode: 'table',
        fields: [
          { name: 'material_id', type: 'string', description: '物料编码' },
          { name: 'material_name', type: 'string', description: '物料名称' },
          { name: 'warehouse', type: 'string', description: '仓库' },
          { name: 'stock_qty', type: 'int', description: '当前库存量' },
          { name: 'safety_stock', type: 'int', description: '安全库存量' },
          { name: 'avg_daily_consumption', type: 'float', description: '日均消耗量' },
          { name: 'outbound_amount', type: 'decimal', description: '出库金额' },
          { name: 'avg_inventory_amount', type: 'decimal', description: '平均库存金额' },
          { name: 'period', type: 'string', description: '统计周期(年月)' },
        ],
        row_count: 15600, sync_mode: 'manual', status: 'active',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      },
    ];
    write('datasets', datasets);
  }

  console.log('✅ JSON数据库初始化完成');
}
