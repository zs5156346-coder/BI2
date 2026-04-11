import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// 初始化数据库
import { initDB } from './db/init.js';
initDB();

// 认证中间件
import { authMiddleware } from './middleware/auth.js';

// 路由
import authRoutes from './routes/auth.js';
import agentRoutes from './routes/agents.js';
import metricsRoutes from './routes/metrics.js';
import visualizationRoutes from './routes/visualization.js';
import projectRoutes from './routes/projects.js';
import dashboardRoutes from './routes/dashboard.js';
import modelRoutes from './routes/models.js';
import requirementRoutes from './routes/requirements.js';
import skillRoutes from './routes/skills.js';
import datasourceRoutes from './routes/datasources.js';
import datasetRoutes from './routes/datasets.js';

app.use('/api/auth', authRoutes);
app.use('/api/agents', authMiddleware, agentRoutes);
app.use('/api/skills', authMiddleware, skillRoutes);
app.use('/api/metrics', authMiddleware, metricsRoutes);
app.use('/api/visualization', authMiddleware, visualizationRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/models', authMiddleware, modelRoutes);
app.use('/api/requirements', authMiddleware, requirementRoutes);
app.use('/api/datasources', authMiddleware, datasourceRoutes);
app.use('/api/datasets', authMiddleware, datasetRoutes);

// Agent 模拟服务（调用 OpenClaw 或模拟）
import { AgentService } from './services/agentService.js';

app.post('/api/agents/:agentId/chat', authMiddleware, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { message, context } = req.body;
    const result = await AgentService.chat(agentId, message, context);

    // 需求分析 agent：检测用户是否确认通过评审
    if (agentId === 'analyst') {
      const msg = message.trim();
      const approvalKeywords = ['确认通过', '通过', '没问题', '确认', '同意', 'OK', 'ok', '可以', '没有问题'];
      if (approvalKeywords.some(k => msg.includes(k))) {
        try {
          const { findAll, findOne, update: dbUpdate, insert: dbInsert } = await import('./db/init.js');
          const { v4: uuidv4 } = await import('uuid');
          // 查找处于 analyzing 状态且有 report 的需求（最近评审的）
          const reqs = findAll('requirements') || [];
          const reviewingReq = reqs
            .filter(r => r.status === 'analyzing' && r.report && r.agent_id === 'analyst')
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];

          if (reviewingReq) {
            // 更新需求状态为交付中
            dbUpdate('requirements', reviewingReq.id, {
              status: 'delivering',
              review_passed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

            // 在项目管理中自动创建交付任务
            const project = {
              id: uuidv4(),
              name: `${reviewingReq.title} - 交付任务`,
              description: `需求「${reviewingReq.title}」已通过评审，进入交付阶段。\n\n需求编号：${reviewingReq.id.substring(0, 8)}\n需求描述：${reviewingReq.description || ''}`,
              status: 'developing',
              current_phase: 'model',
              progress: 15,
              requirement_id: reviewingReq.id,
              created_by: req.user?.id || 'system',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            dbInsert('projects', project);

            // 记录项目初始消息
            dbInsert('project_messages', {
              id: uuidv4(),
              project_id: project.id,
              agent_id: 'analyst',
              role: 'assistant',
              content: `需求「${reviewingReq.title}」已通过评审，交付任务已自动创建。即将进入数据建模阶段。`,
              phase: 'analysis',
              created_at: new Date().toISOString(),
            });

            // 把审批结果附加到返回中
            result.review_approved = true;
            result.requirement_id = reviewingReq.id;
            result.project_id = project.id;
          }
        } catch (err) {
          console.error('评审通过处理失败:', err.message);
        }
      }
    }

    // UAT 验证 agent：检测用户是否验收通过
    if (agentId === 'uat') {
      const msg = message.trim();
      const uatApprovalKeywords = ['验收通过', '通过验收', '确认通过', '通过', '没问题', '确认', 'OK', 'ok'];
      if (uatApprovalKeywords.some(k => msg.includes(k))) {
        try {
          const { findAll, findOne: dbFindOne, update: dbUpdate, insert: dbInsert } = await import('./db/init.js');
          const { v4: uuidv4 } = await import('uuid');

          // 查找处于 uat 阶段的项目
          const projects = findAll('projects') || [];
          const uatProject = projects
            .filter(p => p.current_phase === 'uat' && p.status === 'developing')
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];

          if (uatProject) {
            // 更新项目阶段到 ops
            dbUpdate('projects', uatProject.id, {
              current_phase: 'ops',
              progress: 95,
              updated_at: new Date().toISOString(),
            });

            dbInsert('project_messages', {
              id: uuidv4(),
              project_id: uatProject.id,
              agent_id: 'uat',
              role: 'assistant',
              content: `UAT 验收已通过，项目进入上线运维阶段。`,
              phase: 'ops',
              created_at: new Date().toISOString(),
            });

            result.uat_approved = true;
            result.project_id = uatProject.id;
          }
        } catch (err) {
          console.error('UAT验收通过处理失败:', err.message);
        }
      }
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/agents/:agentId/history', authMiddleware, (req, res) => {
  const { agentId } = req.params;
  const history = AgentService.getHistory(agentId);
  res.json(history);
});

app.listen(PORT, () => {
  console.log(`🦞 ClawBI Backend running on http://localhost:${PORT}`);
});
