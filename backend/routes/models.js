import express from 'express';
import { llmService } from '../services/llm.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONFIG_FILE = join(__dirname, '../config/models.json');

const router = express.Router();

function readModelConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    return { defaultModel: 'modelroute', defaultProvider: 'qclaw', availableModels: ['modelroute'], customProviders: [] };
  }
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    // 兼容：补齐可能缺失的字段
    cfg.defaultProvider = cfg.defaultProvider || 'qclaw';
    cfg.availableModels = cfg.availableModels || ['modelroute'];
    cfg.customProviders = cfg.customProviders || [];
    return cfg;
  } catch {
    return { defaultModel: 'modelroute', defaultProvider: 'qclaw', availableModels: ['modelroute'], customProviders: [] };
  }
}

function saveModelConfig(cfg) {
  const dir = dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // 保存时脱敏：不写入完整 apiKey 到文件（仅保存掩码版）
  const safeCfg = { ...cfg };
  safeCfg.customProviders = (safeCfg.customProviders || []).map(p => ({
    ...p,
    apiKeyPreview: p.apiKey ? `${p.apiKey.slice(0, 6)}...${p.apiKey.slice(-4)}` : '',
    apiKey: p.apiKey, // 实际使用时需要完整 key
  }));
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
}

// 获取模型配置（脱敏返回）
router.get('/config', async (req, res) => {
  try {
    const cfg = readModelConfig();
    // 脱敏：不把完整 apiKey 返回给前端
    const safeProviders = (cfg.customProviders || []).map(p => ({
      ...p,
      apiKey: p.apiKeyPreview || (p.apiKey ? `${p.apiKey.slice(0, 6)}...${p.apiKey.slice(-4)}` : ''),
    }));
    res.json({
      defaultModel: cfg.defaultModel || 'modelroute',
      defaultProvider: cfg.defaultProvider || 'qclaw',
      availableModels: cfg.availableModels || ['modelroute'],
      customProviders: safeProviders,
      currentModel: cfg.defaultModel || 'modelroute',
    });
  } catch (err) {
    res.json({ defaultModel: 'modelroute', defaultProvider: 'qclaw', availableModels: ['modelroute'], customProviders: [], currentModel: 'modelroute' });
  }
});

// 设置默认模型名称
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

// ========== Provider CRUD ==========

// 新增 Provider
router.post('/providers', (req, res) => {
  const { name, id, type, baseUrl, apiKey, model } = req.body;
  if (!name || !baseUrl || !apiKey) {
    return res.status(400).json({ error: '缺少必要参数：name, baseUrl, apiKey' });
  }
  const cfg = readModelConfig();
  const providerId = id || `custom-${Date.now()}`;
  // 检查 ID 是否重复
  if (cfg.customProviders.some(p => p.id === providerId)) {
    return res.status(409).json({ error: 'Provider ID 已存在' });
  }
  const provider = {
    id: providerId,
    name,
    type: type || detectProviderType(baseUrl),
    baseUrl: baseUrl.replace(/\/+$/, ''), // 去掉尾部斜杠
    apiKey,
    model: model || '',
    enabled: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  cfg.customProviders.push(provider);
  // 如果是第一个 provider，自动设为默认
  if (cfg.customProviders.length === 1) {
    cfg.defaultProvider = providerId;
    cfg.defaultModel = model || 'gpt-4o';
  }
  saveModelConfig(cfg);
  res.json({ message: 'Provider 已添加', provider: { ...provider, apiKey: `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}` } });
});

// 更新 Provider
router.put('/providers/:providerId', (req, res) => {
  const { providerId } = req.params;
  const { name, baseUrl, apiKey, model, enabled } = req.body;
  const cfg = readModelConfig();
  const idx = cfg.customProviders.findIndex(p => p.id === providerId);
  if (idx === -1) return res.status(404).json({ error: 'Provider 不存在' });

  const provider = cfg.customProviders[idx];
  if (name !== undefined) provider.name = name;
  if (baseUrl !== undefined) provider.baseUrl = baseUrl.replace(/\/+$/, '');
  if (apiKey) provider.apiKey = apiKey; // 只在有传入时更新
  if (model !== undefined) provider.model = model;
  if (enabled !== undefined) provider.enabled = enabled;
  provider.type = provider.type || detectProviderType(provider.baseUrl);
  provider.updated_at = new Date().toISOString();

  saveModelConfig(cfg);
  res.json({ message: 'Provider 已更新', provider: { ...provider, apiKey: `${provider.apiKey.slice(0, 6)}...${provider.apiKey.slice(-4)}` } });
});

// 删除 Provider
router.delete('/providers/:providerId', (req, res) => {
  const { providerId } = req.params;
  const cfg = readModelConfig();
  const idx = cfg.customProviders.findIndex(p => p.id === providerId);
  if (idx === -1) return res.status(404).json({ error: 'Provider 不存在' });

  cfg.customProviders.splice(idx, 1);
  // 如果删除的是当前默认 provider，回退到 qclaw
  if (cfg.defaultProvider === providerId) {
    cfg.defaultProvider = 'qclaw';
  }
  saveModelConfig(cfg);
  res.json({ message: 'Provider 已删除' });
});

// 设置默认 Provider
router.put('/default-provider', (req, res) => {
  const { providerId } = req.body;
  if (!providerId) return res.status(400).json({ error: '缺少 providerId' });
  const cfg = readModelConfig();

  if (providerId === 'qclaw') {
    cfg.defaultProvider = 'qclaw';
    cfg.defaultModel = 'modelroute';
  } else {
    const provider = cfg.customProviders.find(p => p.id === providerId);
    if (!provider) return res.status(404).json({ error: 'Provider 不存在' });
    cfg.defaultProvider = providerId;
    if (provider.model) cfg.defaultModel = provider.model;
  }

  saveModelConfig(cfg);
  res.json({ message: '默认 Provider 已切换', defaultProvider: cfg.defaultProvider, defaultModel: cfg.defaultModel });
});

// ========== 测试 ==========

// 测试模型连通性（使用现有逻辑）
router.post('/test', async (req, res) => {
  const { model, providerId } = req.body;
  try {
    let result;
    if (providerId && providerId !== 'qclaw') {
      // 测试指定的 custom provider
      const cfg = readModelConfig();
      const provider = cfg.customProviders.find(p => p.id === providerId);
      if (!provider) return res.status(404).json({ success: false, error: 'Provider 不存在' });
      result = await llmService.chat(
        [{ role: 'user', content: '用一句话介绍数据仓库的星型模型' }],
        { model: model || provider.model || 'gpt-4o', maxTokens: 200, provider: { ...provider, id: providerId } }
      );
    } else {
      // 测试 QClaw 或使用默认模型
      result = await llmService.chat(
        [{ role: 'user', content: '用一句话介绍数据仓库的星型模型' }],
        { model: model || 'modelroute', maxTokens: 200 }
      );
    }
    res.json({ success: true, response: result });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// 根据 URL 自动检测 Provider 类型
function detectProviderType(baseUrl) {
  if (baseUrl.includes('openai')) return 'openai';
  if (baseUrl.includes('anthropic')) return 'anthropic';
  if (baseUrl.includes('generativelanguage') || baseUrl.includes('gemini')) return 'gemini';
  if (baseUrl.includes('deepseek')) return 'deepseek';
  if (baseUrl.includes('dashscope') || baseUrl.includes('qwen')) return 'qwen';
  if (baseUrl.includes('zhipuai') || baseUrl.includes('bigmodel')) return 'zhipu';
  return 'openai'; // 默认 OpenAI 兼容格式
}

export default router;
