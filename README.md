# 文档驱动 · 多模型 AI 起名平台（Vercel 全栈）

按实验步骤实现：前端 `index.html`，服务端接口 `api/name.js`（SSE 流式输出）、`api/history.js`（历史查询），模型配置集中在 `api/config.js`（modelConfigMap），历史存入 Supabase。

## 目录结构

```
.
├── index.html            # 前端页面
├── api/
│   ├── name.js           # 起名接口：流式调用模型 + 落库
│   ├── history.js        # 历史记录查询
│   ├── config.js         # modelConfigMap：豆包/DeepSeek/通义/Kimi
│   └── supabase.js       # Supabase 客户端与读写
├── supabase-schema.sql   # 建表 SQL
├── vercel.json
├── .env.example          # 环境变量模板
└── package.json
```

## 本地开发

1. 安装依赖：

```bash
npm install
```

2. 复制 `.env.example` 为 `.env`，填入 Supabase 与各模型密钥：

```bash
cp .env.example .env
```

3. 先在 Supabase SQL 编辑器执行 `supabase-schema.sql` 建表。

4. 启动本地开发（需 Vercel CLI：`npm i -g vercel`）：

```bash
vercel dev
```

打开终端输出的本地地址测试。

## 环境变量（部署到 Vercel 时在 Project → Settings → Environment Variables 填写）

| 变量 | 说明 |
|---|---|
| `SUPABASE_URL` | Supabase 项目地址 |
| `SUPABASE_ANON_KEY` | Supabase 匿名密钥 |
| `DOUBAO_API_KEY` | 火山方舟密钥 |
| `DEEPSEEK_API_KEY` | DeepSeek 密钥 |
| `QWEN_API_KEY` | 通义千问 DashScope 密钥 |
| `KIMI_API_KEY` | Kimi 月之暗面密钥 |

模型 ID 可用 `DOUBAO_MODEL` / `DEEPSEEK_MODEL` / `QWEN_MODEL` / `KIMI_MODEL` 覆盖默认值。

## 部署到 Vercel

1. 确认 `.env` 在 `.gitignore` 中（已配置），不要把密钥提交到 GitHub。
2. 把代码推送到 GitHub 仓库 main 分支。
3. Vercel → Add New → Project，导入该仓库。
4. 在 Environment Variables 中填入上表全部变量。
5. 点击 Deploy，完成后获得公网域名；如需绑定自己的域名，在 Project → Domains 中添加。

## 实现要点

- **流式输出（SSE）**：`api/name.js` 以 `text/event-stream` 返回，前端逐片渲染 `delta.content`，不等全部生成完才显示。
- **modelConfigMap**：四家平台均为 OpenAI 兼容接口，一套 `fetch` 调用代码，按模型 key 读取 `baseURL / model / apiKey`，新增模型只改配置表。
- **密钥安全**：全部从环境变量读取，前端不接触密钥；`.env` 不进 Git。
- **Supabase 历史**：每次生成结束后把需求、结果、模型名写入 `name_history`，前端从 `/api/history` 读取最近 20 条。

## 边界说明

- 未配置 Supabase 时，起名功能仍可用，只是历史不落库；未配置某模型密钥时，切换到该模型会在接口处提示。
- 通义千问必须使用 `compatible-mode` 兼容地址（已在配置中写好）。
