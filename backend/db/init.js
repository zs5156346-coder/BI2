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

  console.log('✅ JSON数据库初始化完成');
}
