/**
 * Vercel Function — AI 生成埋点技术标识名
 * POST /api/suggest-name
 * Body: { displayName: string, type: 'event' | 'common_property' | 'user_property' }
 * Response: text/plain streaming — 模型逐字输出建议名称
 *
 * 环境变量:
 *   AI_API_KEY  — 必需。API key
 *   AI_API_URL  — 可选。默认 https://api.deepseek.com
 *   AI_MODEL    — 可选。默认 deepseek-v4-flash
 */

import type { IncomingMessage, ServerResponse } from 'http'

// ─── system prompt ────────────────────────────────────────
const SYSTEM_PROMPT = `你是一个埋点数据平台的技术命名助手。用户输入中文"显示名"，你需要输出对应的英文技术标识名。

命名规则（严格遵循）：
1. 全部小写，单词之间用下划线分隔（snake_case）
2. 事件名格式：verb_noun（动词_名词），如 user_click_login, page_view_home, btn_tap_confirm
3. 属性名格式：noun（名词短语），如 user_id, page_url, button_name, login_timestamp
4. 只用英文字母、数字、下划线。不用中文、空格、特殊符号
5. 长度控制在 4-50 字符
6. 动词尽量用通用术语：click, tap, view, submit, search, scroll, load, input, select, switch, upload, download, share, navigate, enter, exit, play, pause
7. 常见名词缩写：btn(button), nav(navigation), img(image), id(identifier), url(URL), api(API), h5(H5), web(web), app(app), sdk(SDK), pv(page_view), uv(unique_visitor)

输出格式：只输出一个名称，不要有任何解释、标点、换行。`

// 生成示例以帮助模型理解
const EXAMPLES: Record<string, string> = {
  event: `示例：
"用户点击登录按钮" → user_click_login
"页面浏览首页" → page_view_home
"搜索商品" → search_product
"提交订单" → submit_order`,

  common_property: `示例：
"用户ID" → user_id
"页面URL" → page_url
"设备型号" → device_model
"应用版本号" → app_version`,

  user_property: `示例：
"用户昵称" → nickname
"注册时间" → register_time
"会员等级" → member_level
"城市" → city`,
}

interface RequestBody {
  displayName: string
  type: 'event' | 'common_property' | 'user_property'
}

/** 读取 IncomingMessage 的 JSON body */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString()))
    req.on('error', reject)
  })
}

/** 发送 JSON 响应 */
function json(res: ServerResponse, code: number, data: unknown) {
  res.statusCode = code
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method Not Allowed' })
    return
  }

  const apiKey = process.env.AI_API_KEY
  if (!apiKey) {
    json(res, 500, { error: 'AI_API_KEY 环境变量未配置' })
    return
  }

  let body: RequestBody
  try {
    const raw = await readBody(req)
    body = JSON.parse(raw) as RequestBody
  } catch {
    json(res, 400, { error: '请求体无效' })
    return
  }

  const { displayName, type } = body
  if (!displayName || !displayName.trim()) {
    json(res, 400, { error: 'displayName 不能为空' })
    return
  }

  const apiUrl = (process.env.AI_API_URL || 'https://api.deepseek.com').replace(/\/$/, '')
  const model = process.env.AI_MODEL || 'deepseek-v4-flash'

  // Strip 'v1' if present — DeepSeek uses /chat/completions directly
  const baseUrl = apiUrl.endsWith('/v1') ? apiUrl.slice(0, -3) : apiUrl

  const exampleBlock = EXAMPLES[type] || EXAMPLES['event']
  const userMessage = `${exampleBlock}\n\n显示名："${displayName.trim()}"\n\n输出名称：`

  try {
    const aiRes = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 30,
        temperature: 0.2,
        stream: true,
        thinking: { type: 'disabled' },
      }),
    })

    if (!aiRes.ok) {
      const errText = await aiRes.text()
      console.error('AI API error:', aiRes.status, errText)
      json(res, 502, { error: `AI 服务返回错误 (${aiRes.status})` })
      return
    }

    // 流式转发 SSE
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const reader = aiRes.body!.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n').filter((l) => l.startsWith('data: '))
      for (const line of lines) {
        const data = line.slice(6)
        if (data === '[DONE]') {
          res.write('data: [DONE]\n\n')
          break
        }
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) {
            res.write(`data: ${JSON.stringify(content)}\n\n`)
          }
        } catch {
          // 跳过解析失败的行
        }
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err: any) {
    console.error('AI suggest error:', err)
    json(res, 500, { error: 'AI 建议生成失败，请稍后重试' })
  }
}
