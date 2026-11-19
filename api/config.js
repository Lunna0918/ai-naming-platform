// modelConfigMap：各模型配置集中存放，一套调用代码适配所有模型
// 所有模型均为 OpenAI 兼容接口（/chat/completions，messages、stream、delta.content、Bearer 鉴权一致）

export const MODEL_CONFIG_MAP = {
  doubao: {
    label: '豆包（火山方舟）',
    baseURL: 'https://ark.cn-beijing.volces.com/api/v1/chat/completions',
    model: process.env.DOUBAO_MODEL || 'doubao-seed-1-6-250615',
    apiKey: process.env.DOUBAO_API_KEY || '',
  },
  deepseek: {
    label: 'DeepSeek',
    baseURL: 'https://api.deepseek.com/v1/chat/completions',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    apiKey: process.env.DEEPSEEK_API_KEY || '',
  },
  qwen: {
    label: '通义千问',
    // 注意：必须使用 compatible-mode 兼容地址
    baseURL:
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: process.env.QWEN_MODEL || 'qwen-plus',
    apiKey: process.env.QWEN_API_KEY || '',
  },
  kimi: {
    label: 'Kimi（月之暗面）',
    baseURL: 'https://api.moonshot.cn/v1/chat/completions',
    model: process.env.KIMI_MODEL || 'moonshot-v1-8k',
    apiKey: process.env.KIMI_API_KEY || '',
  },
};

export function getModelConfig(key) {
  return MODEL_CONFIG_MAP[key] || null;
}
