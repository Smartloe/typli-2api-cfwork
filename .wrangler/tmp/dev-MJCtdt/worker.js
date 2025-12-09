var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-hjrvMy/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// .wrangler/tmp/bundle-hjrvMy/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// worker.js
var CONFIG = {
  // 项目元数据
  PROJECT_NAME: "typli-2api",
  PROJECT_VERSION: "2.3.0",
  // 安全配置 (建议在 Cloudflare 环境变量中设置 API_MASTER_KEY)
  API_MASTER_KEY: "1",
  // === 新增：上下文管理配置 ===
  MAX_CONTEXT_TOKENS: 8e3,
  // 最大上下文 token 数（估算值）
  MAX_MESSAGES: 20,
  // 最大保留消息数
  ALWAYS_KEEP_SYSTEM: true,
  // 始终保留 system prompt
  CHARS_PER_TOKEN: 4,
  // 中英文混合估算：约4字符=1token
  // === 新增：重试配置 ===
  MAX_RETRIES: 3,
  // 最大重试次数
  RETRY_DELAY_MS: 1e3,
  // 重试间隔（毫秒）
  RETRY_BACKOFF: 1.5,
  // 重试退避倍数
  // === 新增：超时配置 ===
  REQUEST_TIMEOUT_MS: 6e4,
  // 请求超时时间（60秒）
  STREAM_TIMEOUT_MS: 3e4,
  // 流式响应超时（30秒无数据）
  // 上游服务配置
  UPSTREAM_CHAT_URL: "https://typli.ai/api/generators/chat",
  UPSTREAM_IMAGE_URL: "https://typli.ai/api/generators/images",
  ORIGIN_URL: "https://typli.ai",
  REFERER_CHAT_URL: "https://typli.ai/free-no-sign-up-chatgpt",
  REFERER_IMAGE_URL: "https://typli.ai/ai-image-generator",
  // 聊天模型列表 (来源于抓包与JS分析)
  CHAT_MODELS: [
    "xai/grok-4-fast",
    "xai/grok-4-fast-reasoning",
    "anthropic/claude-haiku-4-5",
    "openai/gpt-5",
    "openai/gpt-5-mini",
    "openai/gpt-4o",
    "openai/gpt-4o-mini",
    "google/gemini-2.5-flash",
    "deepseek/deepseek-reasoner",
    "deepseek/deepseek-chat",
    "grok-4",
    // 别名
    "gpt-4o",
    // 兼容性别名
    "gpt-3.5-turbo"
    // 兼容性别名
  ],
  // 绘图模型列表 (来源于 JS Chunk 519972)
  IMAGE_MODELS: [
    "fal-ai/flux-2",
    "fal-ai/flux-2-pro",
    "fal-ai/flux-2-lora-gallery/realism",
    "fal-ai/nano-banana",
    "fal-ai/nano-banana-pro",
    "fal-ai/stable-diffusion-v35-large",
    "fal-ai/recraft/v3/text-to-image",
    "imagineart/imagineart-1.5-preview/text-to-image",
    "fal-ai/bytedance/seedream/v4.5/text-to-image"
  ],
  DEFAULT_CHAT_MODEL: "xai/grok-4-fast",
  DEFAULT_IMAGE_MODEL: "fal-ai/flux-2",
  // 伪装指纹 (严格复刻 Chrome 142)
  BASE_HEADERS: {
    "authority": "typli.ai",
    "accept": "*/*",
    "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
    "content-type": "application/json",
    "origin": "https://typli.ai",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    "sec-ch-ua": '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "priority": "u=1, i"
  }
};
var worker_default = {
  async fetch(request, env, ctx) {
    const apiKey = env.API_MASTER_KEY || CONFIG.API_MASTER_KEY;
    request.ctx = { apiKey };
    const url = new URL(request.url);
    if (request.method === "OPTIONS")
      return handleCorsPreflight();
    if (url.pathname === "/")
      return handleUI(request);
    if (url.pathname.startsWith("/v1/"))
      return handleApi(request);
    return createErrorResponse(`\u8DEF\u5F84\u672A\u627E\u5230: ${url.pathname}`, 404, "not_found");
  }
};
async function handleApi(request) {
  if (!verifyAuth(request))
    return createErrorResponse("Unauthorized", 401, "unauthorized");
  const url = new URL(request.url);
  const requestId = `req-${crypto.randomUUID()}`;
  switch (url.pathname) {
    case "/v1/models":
      return handleModelsRequest();
    case "/v1/chat/completions":
      return handleChatCompletions(request, requestId);
    case "/v1/images/generations":
      return handleChatCompletions(request, requestId);
    default:
      return createErrorResponse("Not Found", 404, "not_found");
  }
}
__name(handleApi, "handleApi");
function verifyAuth(request) {
  const auth = request.headers.get("Authorization");
  const key = request.ctx.apiKey;
  if (key === "1")
    return true;
  return auth === `Bearer ${key}`;
}
__name(verifyAuth, "verifyAuth");
function handleModelsRequest() {
  const allModels = [...CONFIG.CHAT_MODELS, ...CONFIG.IMAGE_MODELS];
  const modelsData = {
    object: "list",
    data: allModels.map((id) => ({
      id,
      object: "model",
      created: Math.floor(Date.now() / 1e3),
      owned_by: "typli-2api"
    }))
  };
  return new Response(JSON.stringify(modelsData), {
    headers: corsHeaders({ "Content-Type": "application/json" })
  });
}
__name(handleModelsRequest, "handleModelsRequest");
async function handleChatCompletions(request, requestId) {
  try {
    const body = await request.json();
    const model = body.model || CONFIG.DEFAULT_CHAT_MODEL;
    const isImageModel = CONFIG.IMAGE_MODELS.includes(model);
    let prompt = body.prompt;
    if (!prompt) {
      const lastUserMessage = body.messages?.filter((m) => m.role === "user").pop();
      prompt = lastUserMessage?.content;
    }
    if (!prompt) {
      return createErrorResponse("\u65E0\u6CD5\u627E\u5230\u6709\u6548\u7684 prompt\u3002", 400, "invalid_request");
    }
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();
    (async () => {
      try {
        if (isImageModel) {
          const payload = { prompt, model };
          const headers = { ...CONFIG.BASE_HEADERS, "referer": CONFIG.REFERER_IMAGE_URL };
          const response = await fetchWithRetry(CONFIG.UPSTREAM_IMAGE_URL, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
          });
          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`\u4E0A\u6E38\u56FE\u7247\u670D\u52A1\u9519\u8BEF (${response.status}): ${errText}`);
          }
          const result = await response.json();
          if (result.error || !result.url) {
            throw new Error(`\u56FE\u7247\u751F\u6210\u5931\u8D25: ${result.error || "\u672A\u8FD4\u56DEURL"}`);
          }
          const imageUrl = result.url;
          const markdownContent = `![${prompt}](${imageUrl})`;
          const contentChunk = createChatCompletionChunk(requestId, model, markdownContent);
          await writer.write(encoder.encode(`data: ${JSON.stringify(contentChunk)}

`));
        } else {
          const sessionId = generateRandomId(16);
          const truncatedMessages = truncateMessages(body.messages || []);
          const originalCount = (body.messages || []).length;
          const truncatedCount = truncatedMessages.length;
          if (truncatedCount < originalCount) {
            console.log(`[Context] \u6D88\u606F\u622A\u65AD: ${originalCount} -> ${truncatedCount}, \u4F30\u7B97tokens: ${estimateMessagesTokens(truncatedMessages)}`);
          }
          const typliMessages = truncatedMessages.map((msg) => ({
            parts: [{ type: "text", text: msg.content }],
            id: generateRandomId(16),
            role: msg.role
          }));
          const payload = {
            slug: "free-no-sign-up-chatgpt",
            modelId: model,
            id: sessionId,
            messages: typliMessages,
            trigger: "submit-message"
          };
          const headers = { ...CONFIG.BASE_HEADERS, "referer": CONFIG.REFERER_CHAT_URL };
          const response = await fetchWithRetry(CONFIG.UPSTREAM_CHAT_URL, {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
          });
          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`\u4E0A\u6E38\u804A\u5929\u670D\u52A1\u9519\u8BEF (${response.status}): ${errText}`);
          }
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done)
              break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const dataStr = line.slice(6).trim();
                if (dataStr === "[DONE]")
                  continue;
                try {
                  const data = JSON.parse(dataStr);
                  if (data.type === "text-delta" && data.delta) {
                    const chunk = createChatCompletionChunk(requestId, model, data.delta);
                    await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}

`));
                  }
                } catch (e) {
                }
              }
            }
          }
        }
        const endChunk = createChatCompletionChunk(requestId, model, null, "stop");
        await writer.write(encoder.encode(`data: ${JSON.stringify(endChunk)}

`));
        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } catch (e) {
        const errorContent = `

[\u670D\u52A1\u4EE3\u7406\u9519\u8BEF: ${e.message}]`;
        const errorChunk = createChatCompletionChunk(requestId, model, errorContent, "stop");
        await writer.write(encoder.encode(`data: ${JSON.stringify(errorChunk)}

`));
        await writer.write(encoder.encode("data: [DONE]\n\n"));
      } finally {
        await writer.close();
      }
    })();
    return new Response(readable, {
      headers: corsHeaders({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache" })
    });
  } catch (e) {
    return createErrorResponse(e.message, 500, "internal_error");
  }
}
__name(handleChatCompletions, "handleChatCompletions");
function estimateTokens(text) {
  if (!text)
    return 0;
  return Math.ceil(text.length / CONFIG.CHARS_PER_TOKEN);
}
__name(estimateTokens, "estimateTokens");
function estimateMessagesTokens(messages) {
  return messages.reduce((total, msg) => {
    const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
    return total + estimateTokens(content) + 4;
  }, 0);
}
__name(estimateMessagesTokens, "estimateMessagesTokens");
function truncateMessages(messages, maxTokens = CONFIG.MAX_CONTEXT_TOKENS, maxMessages = CONFIG.MAX_MESSAGES) {
  if (!messages || messages.length === 0)
    return [];
  const systemMessages = CONFIG.ALWAYS_KEEP_SYSTEM ? messages.filter((m) => m.role === "system") : [];
  const otherMessages = CONFIG.ALWAYS_KEEP_SYSTEM ? messages.filter((m) => m.role !== "system") : [...messages];
  const systemTokens = estimateMessagesTokens(systemMessages);
  const remainingTokens = maxTokens - systemTokens;
  const result = [];
  let currentTokens = 0;
  for (let i = otherMessages.length - 1; i >= 0 && result.length < maxMessages; i--) {
    const msg = otherMessages[i];
    const msgTokens = estimateTokens(msg.content) + 4;
    if (currentTokens + msgTokens <= remainingTokens) {
      result.unshift(msg);
      currentTokens += msgTokens;
    } else {
      break;
    }
  }
  return [...systemMessages, ...result];
}
__name(truncateMessages, "truncateMessages");
async function fetchWithTimeout(url, options, timeoutMs = CONFIG.REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
__name(fetchWithTimeout, "fetchWithTimeout");
async function fetchWithRetry(url, options, maxRetries = CONFIG.MAX_RETRIES) {
  let lastError;
  let delay = CONFIG.RETRY_DELAY_MS;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);
      if (response.status >= 500 && attempt < maxRetries) {
        throw new Error(`Server error: ${response.status}`);
      }
      return response;
    } catch (error) {
      lastError = error;
      if (error.name === "AbortError") {
        throw new Error(`\u8BF7\u6C42\u8D85\u65F6 (${CONFIG.REQUEST_TIMEOUT_MS / 1e3}\u79D2)`);
      }
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= CONFIG.RETRY_BACKOFF;
      }
    }
  }
  throw lastError;
}
__name(fetchWithRetry, "fetchWithRetry");
function generateRandomId(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++)
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}
__name(generateRandomId, "generateRandomId");
function createChatCompletionChunk(id, model, content, finishReason = null) {
  const chunk = {
    id: `chatcmpl-${id}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1e3),
    model,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: finishReason
    }]
  };
  if (content) {
    chunk.choices[0].delta.content = content;
  }
  return chunk;
}
__name(createChatCompletionChunk, "createChatCompletionChunk");
function createErrorResponse(message, status, code) {
  return new Response(JSON.stringify({
    error: { message, type: "api_error", code }
  }), {
    status,
    headers: corsHeaders({ "Content-Type": "application/json" })
  });
}
__name(createErrorResponse, "createErrorResponse");
function handleCorsPreflight() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
__name(handleCorsPreflight, "handleCorsPreflight");
function corsHeaders(headers = {}) {
  return {
    ...headers,
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}
__name(corsHeaders, "corsHeaders");
function handleUI(request) {
  const origin = new URL(request.url).origin;
  const apiKey = request.ctx.apiKey;
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${CONFIG.PROJECT_NAME} - \u5F00\u53D1\u8005\u9A7E\u9A76\u8231</title>
    <style>
      :root { --bg: #121212; --panel: #1E1E1E; --border: #333; --text: #E0E0E0; --primary: #FFBF00; --accent: #007AFF; --success: #66BB6A; --error: #CF6679; }
      body { font-family: 'Segoe UI', sans-serif; background: var(--bg); color: var(--text); margin: 0; height: 100vh; display: flex; overflow: hidden; }
      .sidebar { width: 380px; background: var(--panel); border-right: 1px solid var(--border); padding: 20px; display: flex; flex-direction: column; overflow-y: auto; flex-shrink: 0; }
      .main { flex: 1; display: flex; flex-direction: column; padding: 20px; position: relative; }
      .box { background: #252525; padding: 15px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 20px; }
      .label { font-size: 12px; color: #888; margin-bottom: 8px; display: block; font-weight: 600; }
      .code-block { font-family: monospace; font-size: 12px; color: var(--primary); word-break: break-all; background: #111; padding: 10px; border-radius: 4px; cursor: pointer; transition: background 0.2s; }
      .code-block:hover { background: #000; }
      input, select, textarea { width: 100%; background: #333; border: 1px solid #444; color: #fff; padding: 10px; border-radius: 4px; margin-bottom: 15px; box-sizing: border-box; font-family: inherit; }
      input:focus, textarea:focus { border-color: var(--primary); outline: none; }
      button { width: 100%; padding: 12px; background: var(--primary); border: none; border-radius: 4px; font-weight: bold; cursor: pointer; color: #000; transition: opacity 0.2s; }
      button:hover { opacity: 0.9; }
      button:disabled { background: #555; cursor: not-allowed; }
      .tabs { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 15px; }
      .tab-button { padding: 10px 15px; cursor: pointer; background: none; border: none; color: #888; font-weight: 600; border-bottom: 2px solid transparent; }
      .tab-button.active { color: var(--primary); border-bottom-color: var(--primary); }
      .tab-content { display: none; }
      .tab-content.active { display: block; }
      .chat-window { flex: 1; background: #000; border: 1px solid var(--border); border-radius: 8px; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 20px; }
      .msg { max-width: 85%; padding: 15px; border-radius: 8px; line-height: 1.6; word-wrap: break-word; }
      .msg.user { align-self: flex-end; background: #333; color: #fff; border-bottom-right-radius: 2px; }
      .msg.ai { align-self: flex-start; background: #1a1a1a; border: 1px solid #333; border-bottom-left-radius: 2px; }
      .msg.error { color: var(--error); border-color: var(--error); }
      .image-container { text-align: center; margin-top: 20px; }
      .image-container img { max-width: 100%; max-height: 70vh; border-radius: 8px; border: 1px solid var(--border); }
      .log-panel { height: 150px; background: #111; border-top: 1px solid var(--border); padding: 10px; font-family: monospace; font-size: 11px; color: #aaa; overflow-y: auto; }
      .log-entry { margin-bottom: 4px; border-bottom: 1px solid #222; padding-bottom: 2px; }
      .log-time { color: #666; margin-right: 5px; }
    </style>
</head>
<body>
    <div class="sidebar">
        <div class="header" style="margin-bottom: 20px; border-bottom: 1px solid var(--border); padding-bottom: 10px;">
            <h2 style="margin:0; display:flex; align-items:center; gap:10px;">
                \u{1F680} ${CONFIG.PROJECT_NAME}
                <span style="font-size:12px;color:#888; font-weight:normal; margin-top:4px;">v${CONFIG.PROJECT_VERSION}</span>
            </h2>
        </div>
        <div class="box">
            <span class="label">API \u5BC6\u94A5 (\u70B9\u51FB\u590D\u5236)</span>
            <div class="code-block" onclick="copy('${apiKey}')">${apiKey}</div>
        </div>
        <div class="box">
            <span class="label">\u7EDF\u4E00 API \u5165\u53E3 (\u804A\u5929/\u6587\u751F\u56FE)</span>
            <div class="code-block" onclick="copy('${origin}/v1/chat/completions')">${origin}/v1/chat/completions</div>
        </div>
        <div class="box">
            <div class="tabs">
                <button class="tab-button active" onclick="openTab('chat-tab')">\u{1F4AC} \u804A\u5929</button>
                <button class="tab-button" onclick="openTab('image-tab')">\u{1F3A8} \u6587\u751F\u56FE</button>
            </div>
            <div id="chat-tab" class="tab-content active">
                <span class="label">\u804A\u5929\u6A21\u578B</span>
                <select id="chat-model">
                    ${CONFIG.CHAT_MODELS.map((m) => `<option value="${m}" ${m === CONFIG.DEFAULT_CHAT_MODEL ? "selected" : ""}>${m}</option>`).join("")}
                </select>
                <span class="label">\u63D0\u793A\u8BCD (Prompt)</span>
                <textarea id="chat-prompt" rows="5" placeholder="\u8F93\u5165\u4F60\u7684\u95EE\u9898...">\u4F60\u597D\uFF0C\u8BF7\u4ECB\u7ECD\u4E00\u4E0B\u4F60\u81EA\u5DF1\u3002</textarea>
                <button id="btn-chat" onclick="sendChatRequest()">\u{1F680} \u53D1\u9001\u804A\u5929\u8BF7\u6C42</button>
            </div>
            <div id="image-tab" class="tab-content">
                <span class="label">\u7ED8\u56FE\u6A21\u578B</span>
                <select id="image-model">
                    ${CONFIG.IMAGE_MODELS.map((m) => `<option value="${m}" ${m === CONFIG.DEFAULT_IMAGE_MODEL ? "selected" : ""}>${m}</option>`).join("")}
                </select>
                <span class="label">\u63D0\u793A\u8BCD (Prompt)</span>
                <textarea id="image-prompt" rows="5" placeholder="\u63CF\u8FF0\u4F60\u60F3\u8981\u751F\u6210\u7684\u56FE\u7247..."></textarea>
                <button id="btn-image" onclick="sendImageRequest()">\u{1F3A8} \u751F\u6210\u56FE\u7247</button>
            </div>
        </div>
    </div>
    <main class="main">
        <div class="chat-window" id="output-window">
            <div id="initial-message" style="color:#666; text-align:center; margin-top:100px;">
                <div style="font-size:40px; margin-bottom:20px;">\u{1F916}</div>
                <h3>Typli \u4EE3\u7406\u670D\u52A1\u5C31\u7EEA</h3>
                <p>\u6BCF\u6B21\u8BF7\u6C42\u81EA\u52A8\u751F\u6210\u65B0\u8EAB\u4EFD\uFF0C\u7ED5\u8FC7 1000 \u8BCD\u9650\u5236\u3002<br>\u4F53\u9A8C\u6781\u901F Grok-4 \u63A8\u7406\u4E0E\u6587\u751F\u56FE\u80FD\u529B\u3002</p>
            </div>
        </div>
        <div class="log-panel" id="logs">
            <div class="log-entry"><span class="log-time">[System]</span> \u9A7E\u9A76\u8231\u521D\u59CB\u5316\u5B8C\u6210\u3002</div>
        </div>
    </main>
    <script>
        const API_KEY = "${apiKey}";
        const CHAT_ENDPOINT = "${origin}/v1/chat/completions";
        // Web UI \u7684\u56FE\u7247\u8BF7\u6C42\u4E5F\u7EDF\u4E00\u8D70 CHAT_ENDPOINT
        const IMAGE_ENDPOINT = "${origin}/v1/chat/completions"; 

        function openTab(tabName) {
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.getElementById(tabName).classList.add('active');
            event.currentTarget.classList.add('active');
        }

        function copy(text) {
            navigator.clipboard.writeText(text);
            log('System', '\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F');
        }

        function log(type, msg) {
            const el = document.getElementById('logs');
            const div = document.createElement('div');
            div.className = 'log-entry';
            div.innerHTML = \`<span class="log-time">[\${new Date().toLocaleTimeString()}]</span> <span style="color:var(--primary)">[\${type}]</span> \${msg}\`;
            el.appendChild(div);
            el.scrollTop = el.scrollHeight;
        }

        function clearOutput() {
            const initialMsg = document.getElementById('initial-message');
            if (initialMsg) initialMsg.style.display = 'none';
        }

        function appendMsg(role, text) {
            const div = document.createElement('div');
            div.className = \`msg \${role}\`;
            div.innerText = text;
            document.getElementById('output-window').appendChild(div);
            div.scrollIntoView({ behavior: "smooth" });
            return div;
        }
        
        function renderContent(element, text) {
            // \u7B80\u5355\u7684 Markdown \u56FE\u7247\u6E32\u67D3
            const markdownImageRegex = /!\\[(.*?)\\]\\((.*?)\\)/g;
            let lastIndex = 0;
            let htmlContent = '';

            text.replace(markdownImageRegex, (match, alt, src, offset) => {
                htmlContent += text.substring(lastIndex, offset); // \u6DFB\u52A0\u56FE\u7247\u524D\u7684\u6587\u672C
                htmlContent += \`<div class="image-container"><img src="\${src}" alt="\${alt}" style="max-width:100%; border-radius: 8px;" /></div>\`;
                lastIndex = offset + match.length;
                return match;
            });
            htmlContent += text.substring(lastIndex); // \u6DFB\u52A0\u6700\u540E\u4E00\u5F20\u56FE\u7247\u540E\u7684\u6587\u672C

            if (lastIndex > 0) { // \u5982\u679C\u6709\u56FE\u7247
                element.innerHTML = htmlContent;
            } else {
                element.innerText = text;
            }
        }

        async function handleStreamRequest(endpoint, payload, userPrompt) {
            clearOutput();
            appendMsg('user', userPrompt);
            const aiMsg = appendMsg('ai', '\u258B');
            log('Request', \`\u53D1\u9001\u8BF7\u6C42: \${userPrompt.substring(0, 30)}...\`);

            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!res.ok) throw new Error(\`HTTP \${res.status}: \${await res.text()}\`);

                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let fullText = "";
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.slice(6);
                            if (dataStr === '[DONE]') continue;
                            try {
                                const data = JSON.parse(dataStr);
                                const content = data.choices[0]?.delta?.content || "";
                                fullText += content;
                                renderContent(aiMsg, fullText + "\u258B");
                                aiMsg.scrollIntoView({ behavior: "smooth", block: "end" });
                            } catch (e) {}
                        }
                    }
                }
                renderContent(aiMsg, fullText);
                log('Response', '\u54CD\u5E94\u63A5\u6536\u5B8C\u6210');

            } catch (e) {
                aiMsg.classList.add('error');
                aiMsg.innerText += \`
[\u9519\u8BEF: \${e.message}]\`;
                log('Error', e.message);
            }
        }

        async function sendChatRequest() {
            const prompt = document.getElementById('chat-prompt').value.trim();
            if (!prompt) return;
            const btn = document.getElementById('btn-chat');
            btn.disabled = true;
            
            const payload = {
                model: document.getElementById('chat-model').value,
                messages: [{ role: 'user', content: prompt }],
                stream: true
            };
            
            await handleStreamRequest(CHAT_ENDPOINT, payload, prompt);
            btn.disabled = false;
        }

        async function sendImageRequest() {
            const prompt = document.getElementById('image-prompt').value.trim();
            if (!prompt) return;
            const btn = document.getElementById('btn-image');
            btn.disabled = true;

            const payload = {
                model: document.getElementById('image-model').value,
                messages: [{ role: 'user', content: prompt }], // \u7EDF\u4E00\u4F7F\u7528 messages \u683C\u5F0F
                stream: true
            };

            await handleStreamRequest(IMAGE_ENDPOINT, payload, prompt);
            btn.disabled = false;
        }
    <\/script>
</body>
</html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
__name(handleUI, "handleUI");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-hjrvMy/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-hjrvMy/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
