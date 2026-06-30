import { useState, useEffect } from 'react'

/**
 * 防抖 hook — 延迟 value 更新直到连续 delay 毫秒无变化
 * 用于搜索输入，避免每次键入都触发 API 请求
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}
