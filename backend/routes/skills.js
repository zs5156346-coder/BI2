import express from 'express';
import { findAll, findOne, insert, update, remove } from '../db/init.js';

const router = express.Router();

// ========== SKILL.md 解析/生成工具 ==========

function parseSkillMd(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { frontmatter: {}, instructions: content.trim() };
  const lines = match[1].split('\n');
  const frontmatter = {};
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();
    frontmatter[key] = val;
  }
  return { frontmatter, instructions: match[2].trim() };
}

function generateSkillMd(skill) {
  const fm = [
    '---',
    `name: ${skill.skill_id || skill.id || ''}`,
    `description: ${skill.skill_description || skill.description || ''}`,
  ];
  if (skill.allowed_tools && skill.allowed_tools.length > 0) {
    fm.push(`allowed-tools: ${skill.allowed_tools.join(', ')}`);
  }
  if (skill.category) fm.push(`category: ${skill.category}`);
  if (skill.version) fm.push(`version: ${skill.version}`);
  if (skill.icon) fm.push(`icon: ${skill.icon}`);
  fm.push('---');
  fm.push('');
  fm.push(skill.instructions || '');
  return fm.join('\n');
}

// ========== 市场技能数据（含 Claude 兼容 instructions） ==========

const MARKET_SKILLS = [
  {
    id: 'sql-optimizer', name: 'SQL 优化器', name_en: 'sql-optimizer',
    description: '自动优化 SQL 查询性能，索引建议',
    category: '数据开发', icon: '🚀', version: '1.2.0',
    downloads: 1520, rating: 4.8, author: 'ClawBI Team',
    allowed_tools: ['Read', 'Grep'],
    instructions: `你是一个 SQL 优化专家。当用户提供 SQL 查询时：

1. 分析查询执行计划，识别性能瓶颈
2. 检查是否存在全表扫描、笛卡尔积、冗余子查询
3. 建议索引优化方案（覆盖索引、联合索引）
4. 重写低效的子查询和 JOIN
5. 提供优化前后的 SQL 对比和预期性能提升

**规则**
- 始终解释优化原因
- 给出 BEFORE/AFTER 对比
- 考虑数据量级和分布
- 兼顾可读性和性能`
  },
  {
    id: 'data-quality', name: '数据质量检查', name_en: 'data-quality',
    description: '自动化数据质量规则和异常检测',
    category: '数据治理', icon: '✅', version: '1.0.3',
    downloads: 890, rating: 4.6, author: 'OpenClaw',
    allowed_tools: ['Read', 'Grep'],
    instructions: `你是一个数据质量专家。你的职责是帮助用户建立和执行数据质量检查：

1. 根据数据表结构，自动推荐质量检查规则
2. 覆盖五大质量维度：完整性、准确性、一致性、时效性、唯一性
3. 为每条规则定义阈值和严重级别（P0/P1/P2）
4. 生成可执行的 SQL 质量检查语句
5. 输出质量评分卡

**输出格式**
- 规则表格：规则类型 | 检查规则 | 阈值 | 严重性
- SQL 检查语句（可直接执行）
- 质量评分和建议`
  },
  {
    id: 'metric-calc', name: '指标计算引擎', name_en: 'metric-calc',
    description: '标准化指标计算口径和公式管理',
    category: '指标管理', icon: '📐', version: '2.0.1',
    downloads: 2100, rating: 4.9, author: 'ClawBI Team',
    allowed_tools: ['Read', 'Grep'],
    instructions: `你是一个指标管理专家。你的职责是帮助用户定义和管理标准化指标：

1. 将业务需求转化为结构化指标定义（名称、英文名、计算公式、维度、粒度）
2. 校验新指标与已有指标的口径冲突
3. 生成指标计算 SQL
4. 管理指标的派生关系（基础指标 → 复合指标）

**输出格式**
- YAML 格式指标定义
- 指标依赖关系图
- 口径对齐验证结果`
  },
  {
    id: 'chart-recommender', name: '图表推荐引擎', name_en: 'chart-recommender',
    description: '基于数据特征智能推荐最佳图表类型',
    category: '可视化', icon: '📊', version: '1.1.0',
    downloads: 1230, rating: 4.7, author: 'OpenClaw',
    allowed_tools: ['Read'],
    instructions: `你是一个数据可视化专家。根据用户的数据特征和分析目的：

1. 推荐最佳图表类型（折线图、柱状图、饼图、散点图、热力图等）
2. 说明推荐理由（数据类型、维度数量、对比/趋势/构成/分布）
3. 提供 ECharts 配置片段
4. 设计仪表盘布局建议

**推荐规则**
- 时间序列 → 折线图
- 分类对比 → 柱状图
- 占比分析 → 饼图/环形图
- 相关性 → 散点图
- 地理分布 → 地图`
  },
  {
    id: 'alert-rules', name: '智能告警', name_en: 'alert-rules',
    description: '基于阈值的智能告警规则配置',
    category: '运维', icon: '🔔', version: '1.0.0',
    downloads: 560, rating: 4.3, author: 'Community',
    allowed_tools: ['Read', 'Grep'],
    instructions: `你是一个智能告警配置专家。你的职责是帮助用户设计告警规则：

1. 根据指标特征推荐告警阈值（静态阈值、动态基线、环比波动）
2. 设计告警级别（P0紧急/P1重要/P2一般）
3. 配置告警通知策略（通知渠道、升级策略、静默规则）
4. 生成 YAML 格式告警配置

**输出格式**
- 告警规则 YAML 配置
- 阈值计算说明
- 升级策略矩阵`
  },
  {
    id: 'dim-modeling', name: '维度建模助手', name_en: 'dim-modeling',
    description: '星型/雪花模型设计和DDL生成',
    category: '数据建模', icon: '🏗️', version: '1.3.0',
    downloads: 1780, rating: 4.8, author: 'ClawBI Team',
    allowed_tools: ['Read', 'Grep'],
    instructions: `你是一个数据仓库维度建模专家。你的职责是：

1. 识别业务过程，确定事实表粒度
2. 设计星型或雪花型模型
3. 定义维度表（缓慢变化维度类型 SCD1/SCD2）
4. 生成标准 DDL 建表语句（含分区、索引）
5. 分析模型变更对下游的影响

**建模原则**
- 优先星型模型，降低 JOIN 复杂度
- 适度退化维度（DDD），平衡性能与灵活性
- 分区设计支持增量抽取
- 命名规范：ods_ / dwd_ / dws_ / ads_ 前缀`
  },
  {
    id: 'data-lineage', name: '数据血缘分析', name_en: 'data-lineage',
    description: '追踪数据来源和流向，影响分析',
    category: '数据治理', icon: '🔗', version: '0.9.0',
    downloads: 420, rating: 4.2, author: 'Community',
    allowed_tools: ['Read', 'Grep'],
    instructions: `你是一个数据血缘分析专家。你的职责是：

1. 解析 SQL/ETL 代码，提取表级和字段级血缘关系
2. 绘制数据流向图（源表 → 中间表 → 目标表）
3. 进行影响分析：变更某个字段会影响哪些下游表和报表
4. 识别数据孤岛和冗余链路

**输出格式**
- ASCII 血缘关系图
- 影响范围列表
- 优化建议`
  },
  {
    id: 'report-gen', name: '报告自动生成', name_en: 'report-gen',
    description: '根据指标数据自动生成分析报告',
    category: '报告', icon: '📝', version: '1.5.0',
    downloads: 2340, rating: 4.9, author: 'ClawBI Team',
    allowed_tools: ['Read'],
    instructions: `你是一个数据分析报告撰写专家。你的职责是：

1. 根据指标数据自动生成结构化分析报告
2. 包含：摘要、关键发现、趋势分析、异常点、建议
3. 使用数据驱动的叙述方式，避免空洞描述
4. 支持日报、周报、月报、专题分析等模板

**报告结构**
- 执行摘要（1-2 句话概括）
- 核心指标概览（表格）
- 趋势分析（环比/同比）
- 异常发现与归因
- 行动建议`
  },
  {
    id: 'schema-drift', name: 'Schema 漂移监控', name_en: 'schema-drift',
    description: '监控表结构变更，自动告警',
    category: '运维', icon: '📡', version: '1.0.1',
    downloads: 310, rating: 4.1, author: 'Community',
    allowed_tools: ['Read', 'Grep'],
    instructions: `你是一个 Schema 变更监控专家。你的职责是：

1. 检测数据库表结构变更（新增列、删除列、类型变更、索引变更）
2. 评估变更影响（下游 ETL、报表、API 的兼容性）
3. 生成变更报告和告警
4. 建议变更的安全执行策略（蓝绿部署、灰度发布）

**监控规则**
- 列删除/类型变更 → P0 告警
- 列新增 → P2 通知
- 索引变更 → P1 告警`
  },
  {
    id: 'ab-testing', name: 'A/B 测试分析', name_en: 'ab-testing',
    description: '自动化A/B测试指标计算和显著性检验',
    category: '分析', icon: '🧪', version: '1.2.0',
    downloads: 980, rating: 4.5, author: 'OpenClaw',
    allowed_tools: ['Read'],
    instructions: `你是一个 A/B 测试分析专家。你的职责是：

1. 设计实验方案（样本量计算、分组策略、指标选择）
2. 进行统计显著性检验（t检验、卡方检验、Z检验）
3. 计算置信区间和 p 值
4. 分析实验结果并给出决策建议

**分析流程**
- 确认实验指标（主指标 + 护栏指标）
- 检查样本量是否充足（最小检测效应 MDE）
- 执行统计检验（α=0.05, power=0.8）
- 输出结论：显著/不显著/需继续观察`
  },
  {
    id: 'api-doc-gen', name: 'API 文档生成', name_en: 'api-doc-gen',
    description: '根据接口定义自动生成 API 文档',
    category: '开发工具', icon: '📖', version: '1.0.0',
    downloads: 670, rating: 4.4, author: 'Community',
    allowed_tools: ['Read', 'Grep', 'Glob'],
    instructions: `你是一个 API 文档生成专家。你的职责是：

1. 根据代码中的接口定义自动生成 RESTful API 文档
2. 包含：请求方法、路径、参数说明、响应示例、错误码
3. 输出 OpenAPI/Swagger 兼容格式
4. 生成 SDK 调用示例（JavaScript/Python/cURL）

**文档结构**
- 接口概述
- 请求参数表格
- 响应 JSON 示例
- 错误码说明
- 调用示例代码`
  },
  {
    id: 'data-catalog', name: '数据目录管理', name_en: 'data-catalog',
    description: '自动化数据资产目录和搜索',
    category: '数据治理', icon: '📚', version: '1.1.0',
    downloads: 1450, rating: 4.7, author: 'OpenClaw',
    allowed_tools: ['Read', 'Grep', 'Glob'],
    instructions: `你是一个数据目录管理专家。你的职责是：

1. 梳理数据资产（表、字段、指标、报表）并建立目录
2. 自动生成表/字段的业务描述和技术描述
3. 建立数据分类标签体系
4. 支持自然语言搜索数据资产

**目录结构**
- 数据域 → 主题域 → 数据表 → 字段
- 每项包含：业务名称、技术名称、描述、负责人、更新频率
- 标签：敏感级别、质量评分、使用频率`
  },
];

// ========== API 路由 ==========

// 获取所有已安装 skills
router.get('/', (req, res) => {
  res.json(findAll('agent_skills'));
});

// 获取某个 Agent 的 skills
router.get('/agent/:agentId', (req, res) => {
  const skills = findAll('agent_skills').filter(s => s.agent_id === req.params.agentId);
  res.json(skills);
});

// 获取 ClawHub 技能市场列表
router.get('/market', (req, res) => {
  // 返回不含完整 instructions 的摘要列表（节省传输）
  const summary = MARKET_SKILLS.map(({ instructions, ...rest }) => ({
    ...rest,
    instructions_preview: instructions ? instructions.slice(0, 120) + '...' : '',
  }));
  res.json(summary);
});

// 获取单个市场技能详情（含完整 instructions）
router.get('/market/:skillId', (req, res) => {
  const skill = MARKET_SKILLS.find(s => s.id === req.params.skillId);
  if (!skill) return res.status(404).json({ error: '技能不存在' });
  res.json(skill);
});

// 为 Agent 安装 Skill
router.post('/install', (req, res) => {
  const { agent_id, skill_id, skill_name, skill_description, category, icon, version, allowed_tools, instructions } = req.body;
  if (!agent_id || !skill_id) return res.status(400).json({ error: '缺少 agent_id 或 skill_id' });

  const existing = findOne('agent_skills', s => s.agent_id === agent_id && s.skill_id === skill_id);
  if (existing) return res.status(409).json({ error: '该技能已安装到此 Agent' });

  // 如果未提供 instructions，从市场技能中查找
  const marketSkill = MARKET_SKILLS.find(s => s.id === skill_id);
  const finalInstructions = instructions || (marketSkill ? marketSkill.instructions : '');
  const finalAllowedTools = allowed_tools || (marketSkill ? marketSkill.allowed_tools : []);

  const skill = {
    id: `${agent_id}__${skill_id}`,
    agent_id,
    skill_id,
    skill_name,
    skill_description: skill_description || '',
    category: category || '通用',
    icon: icon || '🧩',
    version: version || '1.0.0',
    allowed_tools: finalAllowedTools,
    instructions: finalInstructions,
    status: 'active',
    installed_at: new Date().toISOString(),
  };
  insert('agent_skills', skill);
  res.json({ success: true, skill });
});

// 卸载 Skill
router.delete('/:id', (req, res) => {
  remove('agent_skills', req.params.id);
  res.json({ success: true });
});

// 更新 Skill 状态（启用/禁用）
router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!['active', 'disabled'].includes(status)) return res.status(400).json({ error: '无效状态' });
  const result = update('agent_skills', req.params.id, { status, updated_at: new Date().toISOString() });
  if (!result) return res.status(404).json({ error: 'Skill 不存在' });
  res.json({ success: true, skill: result });
});

// 更新 Skill 指令内容
router.patch('/:id/instructions', (req, res) => {
  const { instructions, allowed_tools } = req.body;
  const updates = { updated_at: new Date().toISOString() };
  if (instructions !== undefined) updates.instructions = instructions;
  if (allowed_tools !== undefined) updates.allowed_tools = allowed_tools;
  const result = update('agent_skills', req.params.id, updates);
  if (!result) return res.status(404).json({ error: 'Skill 不存在' });
  res.json({ success: true, skill: result });
});

// 导出 Skill 为 SKILL.md 格式
router.get('/:id/export', (req, res) => {
  const skill = findOne('agent_skills', s => s.id === req.params.id);
  if (!skill) return res.status(404).json({ error: 'Skill 不存在' });
  const md = generateSkillMd(skill);
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${skill.skill_id || 'skill'}.SKILL.md"`);
  res.send(md);
});

// 导入 SKILL.md（解析并返回，不自动安装）
router.post('/import', express.text({ type: '*/*', limit: '1mb' }), (req, res) => {
  try {
    const content = typeof req.body === 'string' ? req.body : String(req.body);
    const { frontmatter, instructions } = parseSkillMd(content);
    const parsed = {
      skill_id: frontmatter.name || '',
      skill_name: frontmatter.name || '',
      skill_description: frontmatter.description || '',
      category: frontmatter.category || '通用',
      icon: frontmatter.icon || '🧩',
      version: frontmatter.version || '1.0.0',
      allowed_tools: frontmatter['allowed-tools'] ? frontmatter['allowed-tools'].split(',').map(s => s.trim()) : [],
      instructions,
    };
    res.json({ success: true, skill: parsed });
  } catch (err) {
    res.status(400).json({ error: '解析 SKILL.md 失败: ' + err.message });
  }
});

export { parseSkillMd, generateSkillMd, MARKET_SKILLS };
export default router;
