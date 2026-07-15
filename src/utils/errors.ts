/**
 * 统一错误格式化 — 将各类错误对象转为可读的中文消息
 */
export function formatError(err: unknown): string {
  if (!err) return '未知错误'

  if (typeof err === 'string') return err

  const obj = typeof err === 'object' ? err as Record<string, unknown> : undefined
  const code = obj?.code ? String(obj.code) : ''
  const message = obj?.message
    ? String(obj.message)
    : err instanceof Error
      ? err.message
      : ''

  const codeMessages: Record<string, string> = {
    '23503': '该记录仍被其他数据引用，无法完成操作',
    '23505': '名称已存在，请使用唯一的技术标识',
    '23514': '数据不符合约束，请检查类型或状态',
    '42501': '没有权限执行此操作',
    '42703': '数据库结构与当前页面不一致，请联系管理员',
    PGRST100: '搜索条件包含不支持的字符',
    PGRST116: '未找到记录',
  }
  if (codeMessages[code]) return codeMessages[code]

  if (/invalid login credentials/i.test(message)) return '邮箱或密码错误'
  if (/failed to fetch|networkerror|network request failed/i.test(message)) return '网络连接失败，请稍后重试'
  if (message) return message
  if (obj?.error_description) return String(obj.error_description)

  return '未知错误，请重试'
}
