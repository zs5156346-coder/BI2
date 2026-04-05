import { llmService } from './llm.js';

/**
 * 从 Agent 对话内容生成结构化分析报告
 */
export async function generateAnalysisReport(requirementId, conversationMessages, options = {}) {
  const { title, description } = options;

  // 构建分析报告的 prompt
  const conversationText = conversationMessages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n\n---\n\n');

  const reportPrompt = `你是一个专业的 BI 需求分析师。请根据以下需求信息和对话内容，生成一份完整的结构化需求分析报告。

要求：返回标准 JSON 格式，包含以下字段：
{
  "background": "需求背景（业务背景、数据现状、为什么提出该需求）",
  "topic": "需求主题（一句话概括需求核心主题）",
  "description": "需求描述（详细描述需求的具体内容和范围）",
  "value": "需求价值（该需求对业务的价值和预期收益）",
  "requester": "需求提出人（从对话中推断，未知则填'待确认'）",
  "users": "需求使用人（目标用户群体，如运营团队、管理层等）",
  "metrics": [
    {
      "domain": "业务域（如销售、财务、运营、用户等）",
      "name": "指标名称",
      "level": "指标等级（核心指标/重要指标/一般指标）",
      "definition": "指标定义（业务含义说明）",
      "formula": "指标计算公式",
      "logic": "指标取值逻辑（数据筛选条件、口径说明）",
      "source_system": "来源业务系统（如ERP、CRM等，未知填'待确认'）",
      "screenshot_needed": false,
      "owner": "指标 Owner（负责人，未知填'待确认'）"
    }
  ],
  "report_prototype": "报表展示原型（描述报表的布局结构、图表类型、筛选条件等）",
  "has_manual_data": false,
  "manual_data_sample": "手工数据样例说明（如无手工数据则填'无'）",
  "confidence": 0.85
}

需求原始信息：
标题：${title || '未命名'}
描述：${description || '无'}

Agent 对话内容：
${conversationText}

请只返回 JSON，不要包含其他文字。如果某些信息在对话中未提及，请基于需求内容合理推断或标注"待确认"。`;

  try {
    const result = await llmService.chat([
      { role: 'system', content: '你是专业的 BI 需求分析报告生成专家，只返回标准 JSON 格式。' },
      { role: 'user', content: reportPrompt }
    ], { temperature: 0.3, maxTokens: 4000, timeout: 180000 });

    // 提取 JSON - 使用括号匹配找到完整的顶层 JSON 对象
    let jsonStr = '';
    const startIdx = result.indexOf('{');
    if (startIdx === -1) throw new Error('无法从回复中提取 JSON');
    let depth = 0;
    for (let i = startIdx; i < result.length; i++) {
      const ch = result[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      if (depth === 0) {
        jsonStr = result.substring(startIdx, i + 1);
        break;
      }
    }
    if (!jsonStr) throw new Error('无法从回复中提取完整 JSON');

    // 清理常见的 JSON 格式问题：末尾多余逗号
    jsonStr = jsonStr.replace(/,\s*([\]}])/g, '$1');

    const report = JSON.parse(jsonStr);

    // 格式化报告为可读文本
    const readableReport = formatReadableReport(report);

    return {
      requirementId,
      report,
      readableReport,
      generatedAt: new Date().toISOString(),
      confidence: report.confidence || 0.8,
    };
  } catch (err) {
    console.error('生成分析报告失败:', err.message);
    throw err;
  }
}

function formatReadableReport(report) {
  let text = `# 需求分析报告\n\n`;
  text += `## 1. 需求背景\n${report.background || '待补充'}\n\n`;
  text += `## 2. 需求主题\n${report.topic || '待补充'}\n\n`;
  text += `## 3. 需求描述\n${report.description || '待补充'}\n\n`;
  text += `## 4. 需求价值\n${report.value || '待补充'}\n\n`;
  text += `**需求提出人**: ${report.requester || '待确认'}\n\n`;
  text += `**需求使用人**: ${report.users || '待确认'}\n\n`;

  if (report.metrics?.length > 0) {
    text += `## 5. 指标清单\n\n`;
    report.metrics.forEach((m, i) => {
      text += `### ${i + 1}. ${m.name}\n`;
      text += `- **业务域**: ${m.domain || '待确认'}\n`;
      text += `- **指标等级**: ${m.level || '待确认'}\n`;
      text += `- **指标定义**: ${m.definition || '待补充'}\n`;
      text += `- **计算公式**: \`${m.formula || '待定义'}\`\n`;
      text += `- **取值逻辑**: ${m.logic || '待补充'}\n`;
      text += `- **来源系统**: ${m.source_system || '待确认'}\n`;
      text += `- **指标 Owner**: ${m.owner || '待确认'}\n\n`;
    });
  }

  text += `## 6. 报表展示原型\n${report.report_prototype || '待设计'}\n\n`;
  text += `## 7. 手工数据\n`;
  text += `**是否涉及手工数据**: ${report.has_manual_data ? '是' : '否'}\n\n`;
  if (report.has_manual_data && report.manual_data_sample) {
    text += `**手工数据样例**: ${report.manual_data_sample}\n\n`;
  }

  text += `---\n`;
  text += `*本报告由需求分析 Agent 生成，置信度 ${((report.confidence || 0.8) * 100).toFixed(0)}%*\n`;

  return text;
}

/**
 * 生成 DDL 模型设计报告（Modeler Agent）
 */
export async function generateModelReport(requirementId, conversationMessages, options = {}) {
  const conversationText = conversationMessages.map(m => `${m.role}: ${m.content}`).join('\n\n---\n\n');

  const reportPrompt = `你是一个专业的数据仓库建模工程师。请根据以下 Modeler Agent 的对话内容，生成一份数据模型设计报告。

返回 JSON 格式：
{
  "tables": [
    {
      "name": "表名",
      "type": "fact/dimension",
      "description": "表描述",
      "columns": [
        {"name": "列名", "type": "数据类型", "description": "列描述", "is_pk": true/false}
      ],
      "partition": "分区字段（如有）",
      "indexes": ["索引字段1"]
    }
  ],
  "lineage": "上下游血缘关系说明",
  "model_type": "star/snowflake/hybrid",
  "next_steps": ["下一步建议"]
}

Agent 对话内容：
${conversationText}

请只返回 JSON。`;

  try {
    const result = await llmService.chat([
      { role: 'system', content: '你是专业的数据建模专家，只返回标准 JSON 格式。' },
      { role: 'user', content: reportPrompt }
    ], { temperature: 0.3, maxTokens: 4000 });

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('无法解析模型设计报告');

    return {
      requirementId,
      report: JSON.parse(jsonMatch[0]),
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('生成模型报告失败:', err.message);
    throw err;
  }
}
