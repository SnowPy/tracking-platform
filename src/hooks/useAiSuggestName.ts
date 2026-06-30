import { useState, useRef, useCallback } from 'react'

/** 字段值的来源 */
type FieldSource = 'empty' | 'ai' | 'manual'

interface UseAiSuggestNameOptions {
  /** 事件/属性类型 */
  type: 'event' | 'common_property' | 'user_property'
  /** 防抖延迟 (ms) */
  debounceMs?: number
}

interface UseAiSuggestNameReturn {
  /** AI 推荐的名称（流式累积） */
  suggestedName: string
  /** 是否正在生成 */
  isLoading: boolean
  /** 当前字段值的来源 */
  source: FieldSource
  /** 当手动模式下有新的 AI 建议时，存放备用建议 */
  pendingSuggestion: string | null
  /** 错误信息 */
  error: string | null
  /**
   * 触发 AI 建议生成
   * source='empty' → 直接流式填入
   * source='ai'    → 替换当前建议
   * source='manual' → 不替换，但存为 pendingSuggestion
   */
  trigger: (displayName: string) => void
  /** 确认当前 AI 建议（source: ai → manual） */
  accept: () => void
  /** 拒绝当前 AI 建议 */
  reject: () => void
  /** 标记字段为用户手动输入 */
  markManual: (value: string) => void
  /** 重置全部状态 */
  reset: () => void
}

export function useAiSuggestName(options: UseAiSuggestNameOptions): UseAiSuggestNameReturn {
  const { type, debounceMs = 500 } = options

  const [suggestedName, setSuggestedName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [source, setSource] = useState<FieldSource>('empty')
  const [pendingSuggestion, setPendingSuggestion] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const trigger = useCallback((displayName: string) => {
    const trimmed = displayName.trim()
    if (!trimmed) return

    // 清除之前的定时器和请求
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (abortRef.current) abortRef.current.abort()

    setError(null)

    timeoutRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller

      setIsLoading(true)

      try {
        const res = await fetch('/api/suggest-name', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName: trimmed, type }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          setError((errData as any).error || `请求失败 (${res.status})`)
          setIsLoading(false)
          return
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
          buffer = lines.pop() || '' // 保留未完成的行

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') break
              try {
                const content = JSON.parse(data)
                accumulated += content
                setSuggestedName(accumulated)
              } catch { /* 跳过解析失败 */ }
            }
          }
        }

        // 流式完成
        if (accumulated) {
          setSource((prev) => {
            // source 为 'manual' 时，不覆盖 —— 存为 pending
            if (prev === 'manual') {
              setPendingSuggestion(accumulated)
              setSuggestedName('')
              return 'manual'
            }
            return 'ai'
          })
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('AI suggest error:', err)
          setError(err.message || '生成失败')
        }
      } finally {
        setIsLoading(false)
      }
    }, debounceMs)
  }, [type, debounceMs])

  const accept = useCallback(() => {
    setSource('manual')
    setPendingSuggestion(null)
    // suggestedName 保留，作为用户确认的值
  }, [])

  const reject = useCallback(() => {
    setSuggestedName('')
    setSource('empty')
    setPendingSuggestion(null)
    setError(null)
  }, [])

  const markManual = useCallback((value: string) => {
    setSource('manual')
    setSuggestedName(value)
    setPendingSuggestion(null)
    setError(null)
    // 取消正在进行的 AI 请求
    if (abortRef.current) abortRef.current.abort()
    setIsLoading(false)
  }, [])

  const reset = useCallback(() => {
    setSuggestedName('')
    setSource('empty')
    setPendingSuggestion(null)
    setError(null)
    setIsLoading(false)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (abortRef.current) abortRef.current.abort()
  }, [])

  return {
    suggestedName,
    isLoading,
    source,
    pendingSuggestion,
    error,
    trigger,
    accept,
    reject,
    markManual,
    reset,
  }
}
