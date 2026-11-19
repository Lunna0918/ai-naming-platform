import { getModelConfig } from './config.js';
import { saveHistory } from './supabase.js';

export const config = {
  // 流式响应不缓存
  runtime: 'edge',
};

function buildPrompt({ scene, requirement, businessDoc, ruleDoc, rules, count }) {
  const parts = [];
  parts.push(`你是资深命名顾问，请为「${scene || '通用命名'}」给出 ${count} 组高质量名字。`);
  if (requirement?.trim()) parts.push(`用户需求：${requirement.trim()}`);
  if (businessDoc?.trim()) parts.push(`【业务资料】\n${businessDoc.trim()}`);
  if (ruleDoc?.trim()) parts.push(`【规则文档】\n${ruleDoc.trim()}`);
  const ruleLines = [];
  if (rules?.style) ruleLines.push(`风格倾向：${rules.style}`);
  if (rules?.wordCount) ruleLines.push(`字数要求：${rules.wordCount}`);
  if (rules?.keywords) ruleLines.push(`偏好关键词：${rules.keywords}`);
  if (rules?.banned) ruleLines.push(`禁用字/词：${rules.banned}`);
  if (rules?.meaning) ruleLines.push(`寓意方向：${rules.meaning}`);
  if (ruleLines.length) parts.push(`【界面规则】\n${ruleLines.join('\n')}`);
  parts.push(
    '每组输出：名字、寓意解读（30 字以内）、1-3 个风格标签。名字不重复，避开禁用字。',
  );
  return parts.join('\n\n');
}

// 解析 SSE 分片，把 delta.content 透传给前端
function streamModelResponse(config, prompt, res) {
  const encoder = new TextEncoder();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  return fetch(config.baseURL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: '你是严谨的命名顾问。' },
        { role: 'user', content: prompt },
      ],
      stream: true,
      temperature: 0.9,
    }),
    signal: controller.signal,
  })
    .then(async (upstream) => {
      if (!upstream.ok) {
        const errText = await upstream.text();
        send('error', { message: `模型接口错误（${upstream.status}）：${errText.slice(0, 200)}` });
        res.end();
        return;
      }
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content || '';
            if (delta) send('delta', { text: delta });
          } catch {
            // 忽略不完整分片
          }
        }
      }
      send('done', {});
      res.end();
    })
    .catch((err) => {
      send('error', { message: `请求失败：${String(err)}` });
      res.end();
    })
    .finally(() => clearTimeout(timer));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: '仅支持 POST' });
    return;
  }

  let body = {};
  try {
    body = await req.json();
  } catch {
    res.status(400).json({ error: '请求体不是合法 JSON' });
    return;
  }

  const { model = 'doubao', historyText } = body;
  const config = getModelConfig(model);
  if (!config) {
    res.status(400).json({ error: '未知模型' });
    return;
  }
  if (!config.apiKey) {
    res.status(500).json({ error: `${config.label} 未配置密钥，请在环境变量中填写` });
    return;
  }

  const prompt = buildPrompt(body);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });

  // 收集流式文本，用于落库
  let collected = '';
  const originalWrite = res.write.bind(res);
  res.write = (chunk) => {
    const str = typeof chunk === 'string' ? chunk : chunk.toString();
    const match = str.match(/data: (.*)\n\n/);
    if (match) {
      try {
        const data = JSON.parse(match[1]);
        if (data.text) collected += data.text;
      } catch {
        /* noop */
      }
    }
    return originalWrite(chunk);
  };

  await streamModelResponse(config, prompt, res);

  // 流式结束后写入 Supabase（不阻塞响应）
  const requirement =
    [body.requirement, body.scene, body.rules?.style].filter(Boolean).join('，') || '通用起名';
  saveHistory({
    requirement,
    nameResult: collected,
    modelName: config.label,
    historyText,
  }).catch(() => undefined);
}
