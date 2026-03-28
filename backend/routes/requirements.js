import express from 'express';
import { findAll, findOne, insert, update, remove, write } from '../db/init.js';
import { v4 as uuidv4 } from 'uuid';
import { llmService } from '../services/llm.js';

const router = express.Router();

// 获取所有需求
router.get('/', (req, res) => {
  const { status, priority, search } = req.query;
  let list = findAll('requirements') || [];
  if (status) list = list.filter(r => r.status === status);
  if (priority) list = list.filter(r => r.priority === priority);
  if (search) list = list.filter(r =>
    r.title?.includes(search) ||
    r.description?.includes(search) ||
    r.id?.includes(search)
  );
  // 按创建时间倒序
  list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.json(list);
});

// 获取单个需求
router.get('/:id', (req, res) => {
  const reqmt = findOne('requirements', r => r.id === req.params.id);
  if (!reqmt) return res.status(404).json({ error: '需求不存在' });
  res.json(reqmt);
});

// 创建需求（从 Agent 对话中提取）
router.post('/', async (req, res) => {
  const { title, description, source, priority, metrics, dimensions, agent_id, conversation_id } = req.body;

  // 使用 LLM 提取结构化信息
  let extracted = { metrics: metrics || [], dimensions: dimensions || [], summary: description };
  if (description && description.length > 20) {
    try {
      const extractPrompt = `分析以下 BI 需求描述，提取关键信息，以 JSON 格式返回：
需求描述：${description}

请返回 JSON 格式：
{
  "summary": "需求一句话摘要（20字以内）",
  "metrics": ["指标1", "指标2"],
  "dimensions": ["维度1", "维度2"],
  "suggestions": ["建议1", "建议2"]
}`;
      const result = await llmService.chat([
        { role: 'system', content: '你是 BI 需求分析专家，擅长从模糊需求中提取结构化信息。只返回 JSON，不要其他内容。' },
        { role: 'user', content: extractPrompt }
      ], { maxTokens: 500 });

      // 解析 JSON
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extracted = { ...extracted, ...JSON.parse(jsonMatch[0]) };
      }
    } catch (err) {
      console.error('需求提取失败:', err.message);
    }
  }

  const requirement = {
    id: uuidv4(),
    title: title || extracted.summary || '新需求',
    description: description || '',
    summary: extracted.summary || description?.substring(0, 50),
    metrics: extracted.metrics || metrics || [],
    dimensions: extracted.dimensions || dimensions || [],
    suggestions: extracted.suggestions || [],
    source: source || 'manual', // manual, agent, imported
    agent_id: agent_id || null,
    conversation_id: conversation_id || null,
    priority: priority || 'medium', // high, medium, low
    status: 'draft', // draft, analyzing, designed, developing, completed, rejected
    assignee: null,
    project_id: null,
    created_by: req.user?.id || 'system',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  insert('requirements', requirement);
  res.json(requirement);
});

// 更新需求
router.put('/:id', (req, res) => {
  const updates = { ...req.body, updated_at: new Date().toISOString() };
  const updated = update('requirements', req.params.id, updates);
  if (!updated) return res.status(404).json({ error: '需求不存在' });
  res.json(updated);
});

// 删除需求
router.delete('/:id', (req, res) => {
  remove('requirements', req.params.id);
  res.json({ message: '删除成功' });
});

// 批量更新状态
router.post('/batch-status', (req, res) => {
  const { ids, status } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: '需要提供 ids 数组' });
  }
  const all = findAll('requirements');
  ids.forEach(id => {
    const idx = all.findIndex(r => r.id === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], status, updated_at: new Date().toISOString() };
    }
  });
  write('requirements', all);
  res.json({ message: `已更新 ${ids.length} 个需求状态` });
});

// 从 Agent 对话创建需求
router.post('/from-conversation', async (req, res) => {
  const { agent_id, conversation, user_id } = req.body;

  // 使用 LLM 从对话中提取需求
  try {
    const extractPrompt = `从以下 Agent 对话中提取 BI 需求：

Agent: ${agent_id}
对话内容：
${conversation}

请返回 JSON 格式的需求列表：
[
  {
    "title": "需求标题",
    "description": "详细描述",
    "metrics": ["指标"],
    "dimensions": ["维度"],
    "priority": "high/medium/low"
  }
]`;

    const result = await llmService.chat([
      { role: 'system', content: '你是需求分析专家，擅长从对话中识别和提取 BI 需求。只返回 JSON 数组。' },
      { role: 'user', content: extractPrompt }
    ], { maxTokens: 1000 });

    const jsonMatch = result.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return res.status(400).json({ error: '无法从对话中提取需求' });
    }

    const requirements = JSON.parse(jsonMatch[0]);
    const created = [];

    for (const req of requirements) {
      const requirement = {
        id: uuidv4(),
        title: req.title,
        description: req.description,
        metrics: req.metrics || [],
        dimensions: req.dimensions || [],
        source: 'agent',
        agent_id,
        conversation_id: null,
        priority: req.priority || 'medium',
        status: 'draft',
        created_by: user_id || req.user?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      insert('requirements', requirement);
      created.push(requirement);
    }

    res.json({ created: created.length, requirements: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 统计
router.get('/stats/overview', (req, res) => {
  const all = findAll('requirements') || [];
  res.json({
    total: all.length,
    draft: all.filter(r => r.status === 'draft').length,
    analyzing: all.filter(r => r.status === 'analyzing').length,
    designed: all.filter(r => r.status === 'designed').length,
    developing: all.filter(r => r.status === 'developing').length,
    completed: all.filter(r => r.status === 'completed').length,
    rejected: all.filter(r => r.status === 'rejected').length,
    highPriority: all.filter(r => r.priority === 'high').length,
  });
});



// 生成分析报告
router.post('/report/generate', async (req, res) => {
  const { requirement_id, agent_id, conversation } = req.body;
  if (!requirement_id) return res.status(400).json({ error: '需要 requirement_id' });

  const requirement = findOne('requirements', r => r.id === requirement_id);
  if (!requirement) return res.status(404).json({ error: '需求不存在' });

  try {
    const { generateAnalysisReport } = await import('../services/reportGenerator.js');

    const messages = conversation || [];
    const result = await generateAnalysisReport(requirement_id, messages, {
      title: requirement.title,
      description: requirement.description,
    });

    // 更新需求状态和报告
    const metrics = result.report.metrics || [];
    const dimensions = [...new Set(metrics.flatMap(m => m.dimensions || []))];

    update('requirements', requirement_id, {
      status: 'analyzing',
      summary: result.report.summary,
      business_goal: result.report.business_goal,
      metrics: metrics.map(m => m.name),
      dimensions,
      analysis_plan: JSON.stringify(result.report.analysis_plan),
      next_steps: JSON.stringify(result.report.next_steps || []),
      report: result.readableReport,
      report_confidence: result.confidence,
      updated_at: new Date().toISOString(),
    });

    // 如果有对应的项目消息，也记录
    if (requirement.project_id) {
      insert('project_messages', {
        id: uuidv4(),
        project_id: requirement.project_id,
        agent_id: 'analyst',
        role: 'assistant',
        content: `生成需求分析报告，置信度 ${(result.confidence * 100).toFixed(0)}%`,
        phase: 'analysis',
        metadata: JSON.stringify({ report: result.report, requirement_id }),
        created_at: new Date().toISOString(),
      });
    }

    res.json({ success: true, report: result });
  } catch (err) {
    console.error('生成报告失败:', err.message);
    res.status(500).json({ error: err.message, details: err.stack });
  }
});

// 获取需求的分析报告
router.get('/:id/report', (req, res) => {
  const requirement = findOne('requirements', r => r.id === req.params.id);
  if (!requirement) return res.status(404).json({ error: '需求不存在' });

  if (!requirement.report) {
    return res.json({ report: null, message: '尚未生成分析报告' });
  }

  res.json({
    report: requirement.report,
    summary: requirement.summary,
    business_goal: requirement.business_goal,
    metrics: requirement.metrics,
    dimensions: requirement.dimensions,
    analysis_plan: requirement.analysis_plan ? JSON.parse(requirement.analysis_plan) : null,
    next_steps: requirement.next_steps ? JSON.parse(requirement.next_steps) : [],
    report_confidence: requirement.report_confidence,
    updated_at: requirement.updated_at,
  });
});

export default router;

// 已存在路由，追加报告生成端点（通过追加方式已处理）
