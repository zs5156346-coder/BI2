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

  const reportPrompt = `你是一个专业的 BI 需求分析师。请根据以下需求分析师 Agent 的对话内容，生成一份结构化的需求分析报告。

要求：返回标准 JSON 格式，包含以下字段：
{
  "summary": "需求一句话总结（20字以内）",
  "business_goal": "核心业务目标描述",
  "metrics": [
    {
      "name": "指标英文名",
      "name_cn": "指标中文名",
      "category": "所属分类（交易/用户/流量/财务等）",
      "expression": "计算公式",
      "dimensions": ["维度1", "维度2"],
      "description": "指标业务含义",
      "priority": "high/medium/low"
    }
  ],
  "analysis_plan": {
    "approach": "推荐分析方法",
    "visualizations": ["可视化类型建议1", "可视化类型建议2"],
    "data_range": "建议数据范围和时间粒度"
  },
  "next_steps": ["建议下一步1", "建议下一步2"],
  "confidence": 0.85
}

需求原始信息：
标题：${title || '未命名'}
描述：${description || '无'}

Agent 对话内容：
${conversationText}

请只返回 JSON，不要包含其他文字。`;

  try {
    const result = await llmService.chat([
      { role: 'system', content: '你是专业的 BI 需求分析报告生成专家，只返回标准 JSON 格式。' },
      { role: 'user', content: reportPrompt }
    ], { temperature: 0.3, maxTokens: 2000 });

    // 提取 JSON
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法从回复中提取 JSON');
    }

    const report = JSON.parse(jsonMatch[0]);

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
  let text = `# 📋 需求分析报告\n\n`;
  text += `## 1. 需求概述\n${report.summary || ''}\n\n`;
  text += `**业务目标**: ${report.business_goal || ''}\n\n`;

  if (report.metrics?.length > 0) {
    text += `## 2. 核心指标定义\n\n`;
    report.metrics.forEach((m, i) => {
      text += `### ${i + 1}. ${m.name_cn} (${m.name})\n`;
      text += `- **分类**: ${m.category}\n`;
      text += `- **计算公式**: \`${m.expression || '待定义'}\`\n`;
      text += `- **分析维度**: ${(m.dimensions || []).join('、')}\n`;
      text += `- **业务含义**: ${m.description || '待补充'}\n`;
      text += `- **优先级**: ${m.priority === 'high' ? '🔴 高' : m.priority === 'low' ? '⚪ 低' : '🟡 中'}\n\n`;
    });
  }

  if (report.analysis_plan) {
    text += `## 3. 分析方案\n\n`;
    text += `**推荐方法**: ${report.analysis_plan.approach || ''}\n\n`;
    text += `**可视化建议**: ${(report.analysis_plan.visualizations || []).join('、')}\n\n`;
    text += `**数据范围**: ${report.analysis_plan.data_range || ''}\n\n`;
  }

  if (report.next_steps?.length > 0) {
    text += `## 4. 下一步行动\n\n`;
    report.next_steps.forEach((s, i) => {
      text += `${i + 1}. ${s}\n`;
    });
    text += `\n`;
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
    ], { temperature: 0.3, maxTokens: 2000 });

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
