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
    status: 'imported', // imported, analyzing, designed, developing, completed, rejected
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

// 从 Agent 对话确认导入需求（合并需求分析与澄清内容，整理为结构化需求）
router.post('/import-from-chat', async (req, res) => {
  const { conversation, agent_id } = req.body;
  if (!conversation || !Array.isArray(conversation) || conversation.length < 2) {
    return res.status(400).json({ error: '需要至少包含一轮对话' });
  }

  try {
    const userMsgs = conversation.filter(m => m.role === 'user');
    const assistantMsgs = conversation.filter(m => m.role === 'assistant');
    const firstUserMsg = userMsgs[0]?.content || '';

    // 尝试用 LLM 从对话中整理结构化需求
    let extracted = {};
    try {
      const chatText = conversation.map(m => `${m.role === 'user' ? '用户' : 'Agent'}：${m.content}`).join('\n\n');
      const extractPrompt = `请根据以下用户与 BI 需求分析 Agent 的完整对话，判断是否包含有效的 BI 分析需求。

对话内容：
${chatText}

判断标准：
- 如果对话只是闲聊、问候、询问系统用法等非需求内容，返回 {"valid": false}
- 如果包含明确的 BI 分析需求（如数据分析、报表、指标查询等），则提取结构化需求

请返回 JSON 格式（只返回 JSON，不要其他内容）：
如果无有效需求：{"valid": false}
如果有有效需求：
{
  "valid": true,
  "title": "需求标题（简洁明了，15字以内）",
  "description": "需求详细描述（合并原始需求 + Agent分析 + 澄清补充，完整描述业务背景、分析目标和具体要求）",
  "summary": "一句话摘要（20字以内）",
  "metrics": ["需要分析的指标1", "指标2"],
  "dimensions": ["分析维度1", "维度2"],
  "priority": "high/medium/low（根据对话中的紧急程度判断）",
  "suggestions": ["实现建议1", "建议2"]
}`;

      const result = await llmService.chat([
        { role: 'system', content: '你是 BI 需求分析专家，擅长将多轮需求分析与澄清对话合并整理为完整的结构化需求。只返回 JSON，不要其他内容。' },
        { role: 'user', content: extractPrompt }
      ], { maxTokens: 1000 });

      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.valid === false) {
          return res.status(400).json({ error: '对话中未发现有效的 BI 需求，无法导入' });
        }
        extracted = parsed;
      }
    } catch (llmErr) {
      console.warn('LLM 提取失败，使用对话内容兜底:', llmErr.message);
    }

    // 兜底：LLM 失败时从对话内容中拼接需求信息
    if (!extracted.title) {
      const userContent = userMsgs.map(m => m.content).join('\n');

      // 检查对话内容是否太短
      if (userContent.length < 10) {
        return res.status(400).json({ error: '对话内容过短，无法提取有效需求' });
      }

      // 闲聊关键词过滤：拦截明显非需求的对话
      const chattyKeywords = [
        '你怎么用', '怎么使用', '怎么用', '你会什么', '你能做什么',
        '你好', 'hello', 'hi', '谢谢', '感谢', '再见', '拜拜',
        '测试', '试试', '试试看', '是什么', '是谁',
        '在吗', '在不在', '有人吗',
      ];
      const lowerContent = userContent.toLowerCase();
      if (chattyKeywords.some(kw => lowerContent.includes(kw))) {
        return res.status(400).json({ error: '该对话为闲聊内容，不包含有效 BI 需求，无法导入' });
      }

      // 检查用户消息是否全是短句（< 20 字）且无业务关键词
      const businessKeywords = ['分析', '报表', '指标', '看板', '需求', '监控', '统计', '展示', '数据', '查询', '计算', '对比', '趋势', '维度', '度量'];
      const allShort = userMsgs.every(m => m.content.trim().length < 20);
      const hasBusinessKeyword = businessKeywords.some(kw => lowerContent.includes(kw));
      if (allShort && !hasBusinessKeyword) {
        return res.status(400).json({ error: '对话内容未包含明确的业务需求描述，无法导入' });
      }

      const agentContent = assistantMsgs.map(m => m.content).join('\n');
      extracted = {
        title: firstUserMsg.substring(0, 80),
        description: `【用户需求】\n${userContent}\n\n【分析与澄清】\n${agentContent}`,
        summary: firstUserMsg.substring(0, 50),
        metrics: [],
        dimensions: [],
        priority: 'medium',
        suggestions: [],
      };
    }

    const requirement = {
      id: uuidv4(),
      title: extracted.title,
      description: extracted.description,
      summary: extracted.summary || extracted.title,
      metrics: extracted.metrics || [],
      dimensions: extracted.dimensions || [],
      suggestions: extracted.suggestions || [],
      source: 'agent',
      agent_id: agent_id || 'analyst',
      priority: extracted.priority || 'medium',
      status: 'imported',
      created_by: req.user?.id || 'system',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    insert('requirements', requirement);
    res.json(requirement);
  } catch (err) {
    console.error('从对话导入需求失败:', err.message);
    res.status(500).json({ error: err.message });
  }
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
    imported: all.filter(r => r.status === 'imported').length,
    analyzing: all.filter(r => r.status === 'analyzing').length,
    delivering: all.filter(r => r.status === 'delivering').length,
    designed: all.filter(r => r.status === 'designed').length,
    developing: all.filter(r => r.status === 'developing').length,
    completed: all.filter(r => r.status === 'completed').length,
    rejected: all.filter(r => r.status === 'rejected').length,
    highPriority: all.filter(r => r.priority === 'high').length,
  });
});



// 发起需求评审 - 将需求分析报告以文档形式发送到 analyst agent 对话中
router.post('/:id/start-review', async (req, res) => {
  const requirement = findOne('requirements', r => r.id === req.params.id);
  if (!requirement) return res.status(404).json({ error: '需求不存在' });
  if (!requirement.report) return res.status(400).json({ error: '尚未生成分析报告，请先生成报告' });

  try {
    const userId = req.user?.id || 'system';
    const agentId = requirement.agent_id || 'analyst';

    // 构建评审文档内容
    const reportData = requirement.report_data ? JSON.parse(requirement.report_data) : {};
    const metricsTable = (reportData.metrics || []).map((m, i) =>
      `| ${i + 1} | ${m.domain || '-'} | ${m.name} | ${m.level || '-'} | ${m.definition || '-'} | ${m.formula || '-'} | ${m.logic || '-'} | ${m.source_system || '-'} | ${m.owner || '-'} |`
    ).join('\n');

    const reviewDoc = `📋 **需求分析报告 - 评审文档**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**需求标题**: ${requirement.title}
**需求编号**: ${requirement.id.substring(0, 8)}
**评审发起时间**: ${new Date().toLocaleString('zh-CN')}

---

**一、需求背景**
${reportData.background || requirement.description || '待补充'}

**二、需求主题**
${reportData.topic || requirement.title}

**三、需求描述**
${reportData.description || requirement.description || '待补充'}

**四、需求价值**
${reportData.value || '待补充'}

**五、人员信息**
- 需求提出人：${reportData.requester || '待确认'}
- 需求使用人：${reportData.users || '待确认'}

**六、指标清单**
| # | 业务域 | 指标名称 | 指标等级 | 指标定义 | 计算公式 | 取值逻辑 | 来源系统 | Owner |
|---|--------|----------|----------|----------|----------|----------|----------|-------|
${metricsTable || '| - | - | 暂无指标 | - | - | - | - | - | - |'}

**七、报表展示原型**
${reportData.report_prototype || '待设计'}

**八、手工数据**
- 是否涉及手工数据：${reportData.has_manual_data ? '是' : '否'}
${reportData.has_manual_data && reportData.manual_data_sample ? `- 手工数据样例：${reportData.manual_data_sample}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
请确认以上需求分析报告内容是否准确完整。如有修改意见请直接回复，确认无误请回复"确认通过"。`;

    // 以 assistant 身份将评审文档发送到 agent 对话中
    const reviewMsg = {
      id: uuidv4(),
      agent_id: agentId,
      user_id: userId,
      role: 'assistant',
      content: reviewDoc,
      metadata: { type: 'review_document', requirement_id: requirement.id },
      created_at: new Date().toISOString(),
    };
    insert('messages', reviewMsg);

    // 更新需求状态为评审中
    update('requirements', requirement.id, {
      status: 'analyzing',
      review_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    res.json({ success: true, message: '已发起需求评审', agent_id: agentId });
  } catch (err) {
    console.error('发起需求评审失败:', err.message);
    res.status(500).json({ error: err.message });
  }
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

    update('requirements', requirement_id, {
      status: 'analyzing',
      summary: result.report.topic || result.report.description?.substring(0, 50),
      background: result.report.background,
      topic: result.report.topic,
      value: result.report.value,
      requester: result.report.requester,
      users: result.report.users,
      metrics: metrics.map(m => m.name),
      report_prototype: result.report.report_prototype,
      has_manual_data: result.report.has_manual_data || false,
      manual_data_sample: result.report.manual_data_sample,
      report_data: JSON.stringify(result.report),
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

  const reportData = requirement.report_data ? JSON.parse(requirement.report_data) : {};
  res.json({
    report: requirement.report,
    background: reportData.background || requirement.background,
    topic: reportData.topic || requirement.topic,
    description: reportData.description || requirement.description,
    value: reportData.value || requirement.value,
    requester: reportData.requester || requirement.requester,
    users: reportData.users || requirement.users,
    metrics: reportData.metrics || [],
    report_prototype: reportData.report_prototype || requirement.report_prototype,
    has_manual_data: reportData.has_manual_data || false,
    manual_data_sample: reportData.manual_data_sample,
    report_confidence: requirement.report_confidence,
    updated_at: requirement.updated_at,
  });
});

// 评审通过 - 将需求分析报告中的指标清单同步导入指标管理模块
router.post('/:id/approve-review', (req, res) => {
  const requirement = findOne('requirements', r => r.id === req.params.id);
  if (!requirement) return res.status(404).json({ error: '需求不存在' });
  if (!requirement.report_data) return res.status(400).json({ error: '尚未生成分析报告，无法评审' });

  try {
    const reportData = JSON.parse(requirement.report_data);
    const metrics = reportData.metrics || [];

    if (metrics.length === 0) {
      return res.status(400).json({ error: '报告中没有指标数据，无需导入' });
    }

    // 将指标映射为指标管理模块的数据结构
    const importedMetrics = [];
    for (const m of metrics) {
      // 生成英文标识符：取名称拼音首字母或直接用 name 转换
      const name = (m.name || '').toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fff]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 50);

      const metric = {
        id: uuidv4(),
        name: name || `metric_${Date.now()}_${importedMetrics.length}`,
        name_cn: m.name || '未命名指标',
        category: mapDomainToCategory(m.domain),
        expression: m.formula || '',
        dimensions: [],
        description: m.definition ? `${m.definition}${m.logic ? `\n取值逻辑：${m.logic}` : ''}` : (m.logic || ''),
        status: 'active',
        source_requirement_id: requirement.id,
        level: m.level || '',
        source_system: m.source_system || '',
        owner: m.owner || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      insert('metrics', metric);
      importedMetrics.push(metric);
    }

    // 更新需求状态为"交付中"
    update('requirements', requirement.id, {
      status: 'delivering',
      metrics_imported: true,
      metrics_imported_count: importedMetrics.length,
      updated_at: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: `评审通过，已成功导入 ${importedMetrics.length} 个指标到指标管理`,
      imported_count: importedMetrics.length,
      metrics: importedMetrics.map(m => ({ id: m.id, name: m.name_cn, category: m.category })),
    });
  } catch (err) {
    console.error('评审通过/导入指标失败:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 业务域 -> 指标分类映射
function mapDomainToCategory(domain) {
  if (!domain) return '运营';
  const d = domain.toLowerCase();
  if (d.includes('销售') || d.includes('交易') || d.includes('收入')) return '交易';
  if (d.includes('用户') || d.includes('客户') || d.includes('留存')) return '用户';
  if (d.includes('流量') || d.includes('访问')) return '流量';
  if (d.includes('财务') || d.includes('成本') || d.includes('预算')) return '财务';
  return '运营';
}

export default router;
