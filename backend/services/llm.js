/**
 * LLM 服务 - 默认使用 QClaw 大模型，支持自定义 API Key
 */
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONFIG_FILE = join(__dirname, '../config/models.json');

const QCLAW_PROXY = 'http://127.0.0.1:19000/proxy/llm';
const QCLAW_KEY = '__QCLAW_AUTH_GATEWAY_MANAGED__';
const DEFAULT_TIMEOUT = 60000;
const CACHE_TTL = 5 * 60 * 1000;

function readConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return { defaultProvider: 'qclaw', customProviders: [] };
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')); }
  catch { return { defaultProvider: 'qclaw', customProviders: [] }; }
}

function getActiveProvider() {
  const cfg = readConfig();
  if (cfg.defaultProvider === 'qclaw') return null; // 使用 QClaw
  return cfg.customProviders?.find(p => p.id === cfg.defaultProvider) || null;
}

class LLMService {
  constructor() {
    this.cache = new Map();
  }

  async chat(messages, options = {}) {
    const active = options.provider === 'qclaw' ? null : getActiveProvider();

    // 模式1：使用 QClaw 内置代理
    if (!active) {
      return this._chatQClaw(messages, options);
    }

    // 模式2：使用自定义 API Key
    return this._chatCustom(messages, { ...options, provider: active });
  }

  // QClaw 代理模式
  async _chatQClaw(messages, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT);

    try {
      const response = await fetch(`${QCLAW_PROXY}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${QCLAW_KEY}`,
        },
        body: JSON.stringify({
          model: options.model || 'modelroute',
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`QClaw LLM error: ${response.status} - ${err}`);
      }
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new Error('LLM 请求超时');
      throw err;
    }
  }

  // 自定义 API Key 模式
  async _chatCustom(messages, options = {}) {
    const provider = options.provider;
    const apiKey = provider.apiKey;
    const baseUrl = provider.baseUrl;
    const model = provider.model || 'gpt-4o';

    if (!apiKey || !baseUrl) {
      // fallback 到 QClaw
      return this._chatQClaw(messages, options);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeout || DEFAULT_TIMEOUT);

    try {
      let url = `${baseUrl}/chat/completions`;
      let headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
      let body = {
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
      };

      // Anthropic 特殊处理
      if (provider.id === 'anthropic' || baseUrl.includes('anthropic')) {
        url = `${baseUrl}/messages`;
        headers = { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' };
        body = {
          model: model || 'claude-3-5-sonnet-20241022',
          max_tokens: options.maxTokens ?? 4096,
          temperature: options.temperature ?? 0.7,
          messages: messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content })),
          system: messages.find(m => m.role === 'system')?.content,
        };
      }

      // Gemini 特殊处理
      if (provider.id === 'gemini' || baseUrl.includes('generativelanguage')) {
        const geminiModel = model || 'gemini-1.5-flash';
        url = `${baseUrl}/models/${geminiModel}:generateContent?key=${apiKey}`;
        headers = { 'Content-Type': 'application/json' };
        body = {
          contents: messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          systemInstruction: messages.find(m => m.role === 'system') ? { parts: [{ text: messages.find(m => m.role === 'system').content }] } : undefined,
          generationConfig: { maxOutputTokens: options.maxTokens ?? 4096, temperature: options.temperature ?? 0.7 },
        };
      }

      const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`Custom LLM error: ${response.status} - ${errData.error?.message || errData.error?.type || 'unknown'}`);
      }

      const data = await response.json();

      // 解析不同格式
      if (provider.id === 'anthropic' || baseUrl.includes('anthropic')) {
        return data.content?.[0]?.text || '';
      }
      if (provider.id === 'gemini' || baseUrl.includes('generativelanguage')) {
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
      return data.choices?.[0]?.message?.content || '';
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new Error('LLM 请求超时');
      throw err;
    }
  }

  async chatWithCache(key, messages, options = {}) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.value;
    const value = await this.chat(messages, options);
    this.cache.set(key, { value, ts: Date.now() });
    return value;
  }

  async listModels() {
    return [{ id: 'modelroute', provider: 'qclaw', name: 'QClaw Default' }];
  }
}

export const llmService = new LLMService();
export default llmService;
