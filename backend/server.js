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
app.use(express.json());

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

app.use('/api/auth', authRoutes);
app.use('/api/agents', authMiddleware, agentRoutes);
app.use('/api/metrics', authMiddleware, metricsRoutes);
app.use('/api/visualization', authMiddleware, visualizationRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/models', authMiddleware, modelRoutes);
app.use('/api/requirements', authMiddleware, requirementRoutes);

// Agent 模拟服务（调用 OpenClaw 或模拟）
import { AgentService } from './services/agentService.js';

app.post('/api/agents/:agentId/chat', authMiddleware, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { message, context, create_requirement } = req.body;
    const result = await AgentService.chat(agentId, message, context);
    
    // 如果是 analyst agent 且开启了自动创建需求
    if (create_requirement && agentId === 'analyst' && message) {
      try {
        const { insert } = await import('./db/init.js');
        const { v4: uuidv4 } = await import('uuid');
        
        // 使用 LLM 快速提取需求
        const extractResult = await result.response?.substring(0, 200) || '';
        const requirement = {
          id: uuidv4(),
          title: message.substring(0, 80),
          description: message,
          summary: message.substring(0, 100),
          metrics: [],
          dimensions: [],
          suggestions: extractResult ? [extractResult] : [],
          source: 'agent',
          agent_id: agentId,
          priority: 'medium',
          status: 'draft',
          created_by: req.user?.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        insert('requirements', requirement);
        result.requirement_id = requirement.id;
      } catch (e) {
        console.error('自动创建需求失败:', e.message);
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
