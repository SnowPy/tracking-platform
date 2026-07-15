/**
 * AI 名称生成工具函数
 * 调用 /api/suggest-name 端点，流式读取 SSE 并返回完整建议名称
 * 用于不需要完整 hook 生命周期的场景（如动态添加的属性行）
 */

type SuggestType = 'event' | 'common_property' | 'user_property'

function getResponseError(value: unknown) {
  if (value && typeof value === 'object' && 'error' in value && typeof value.error === 'string') {
    return value.error
  }
  return null
}

/**
 * 调用 AI 生成技术名称，流式读取结果
 * @param displayName 中文显示名
 * @param type 类型
 * @param onChunk 可选，每次收到流式片段时回调（用于实时更新 UI）
 * @returns 完整的 AI 建议名称
 */
export async function fetchSuggestedName(
  displayName: string,
  type: SuggestType,
  onChunk?: (chunk: string) => void,
): Promise<string> {
  const trimmed = displayName.trim()
  if (!trimmed) throw new Error('displayName 不能为空')

  const res = await fetch('/api/suggest-name', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ displayName: trimmed, type }),
  })

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}))
    throw new Error(getResponseError(errData) || `请求失败 (${res.status})`)
  }

  // 流式读取 SSE
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let accumulated = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') break
        try {
          const content: unknown = JSON.parse(data)
          if (typeof content === 'string') {
            accumulated += content
            onChunk?.(accumulated)
          }
        } catch { /* 跳过解析失败 */ }
      }
    }
  }

  return accumulated
}
