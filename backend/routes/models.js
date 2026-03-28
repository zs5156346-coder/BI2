import express from 'express';
import { llmService } from '../services/llm.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONFIG_FILE = join(__dirname, '../config/models.json');

const router = express.Router();

function readModelConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    return { defaultModel: 'modelroute', availableModels: ['modelroute'] };
  }
  try {
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return { defaultModel: 'modelroute', availableModels: ['modelroute'] };
  }
}

function saveModelConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
}

// 获取模型配置
router.get('/config', async (req, res) => {
  try {
    const cfg = readModelConfig();
    const availableModels = await llmService.listModels();
    res.json({
      ...cfg,
      availableModels: [...new Set([...cfg.availableModels, ...availableModels])],
      currentModel: cfg.defaultModel,
    });
  } catch (err) {
    res.json({ defaultModel: 'modelroute', availableModels: ['modelroute'], currentModel: 'modelroute' });
  }
});

// 设置默认模型
router.post('/config', (req, res) => {
  const { defaultModel } = req.body;
  if (!defaultModel) return res.status(400).json({ error: '缺少模型名称' });
  const cfg = readModelConfig();
  cfg.defaultModel = defaultModel;
  if (!cfg.availableModels.includes(defaultModel)) {
    cfg.availableModels.push(defaultModel);
  }
  saveModelConfig(cfg);
  res.json({ message: '模型已切换', currentModel: defaultModel });
});

// 测试模型
router.post('/test', async (req, res) => {
  const { model } = req.body;
  try {
    const result = await llmService.chat(
      [{ role: 'user', content: '用一句话介绍数据仓库的星型模型' }],
      { model: model || 'modelroute', maxTokens: 200 }
    );
    res.json({ success: true, response: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
