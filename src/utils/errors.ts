/**
 * 统一错误格式化 — 将各类错误对象转为可读的中文消息
 */
export function formatError(err: unknown): string {
  if (!err) return '未知错误'

  if (typeof err === 'string') return err

  if (err instanceof Error) {
    // Supabase PostgREST 错误通常包含 code + message
    if ('code' in err && 'details' in (err as any)) {
      return (err as any).message || err.message
    }
    return err.message
  }

  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>
    // Supabase 返回的 { code, message, details } 结构
    if (obj.message) return String(obj.message)
    if (obj.error_description) return String(obj.error_description)
  }

  return '未知错误，请重试'
}
