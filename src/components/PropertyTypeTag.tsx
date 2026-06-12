import { useEffect, useState } from 'react'
import { Tag } from 'antd'
import { getPropertyTypes } from '../api/propertyTypes'
import type { PropertyTypeConfig } from '../types'

// 默认兜底配置
const DEFAULT_TYPES: Record<string, PropertyTypeConfig> = {
  string: { id: '0', value: 'string', label: 'string', color: '#1677ff', sort_order: 1, created_at: '', updated_at: '' },
  number: { id: '0', value: 'number', label: 'number', color: '#52c41a', sort_order: 2, created_at: '', updated_at: '' },
  boolean: { id: '0', value: 'boolean', label: 'boolean', color: '#faad14', sort_order: 3, created_at: '', updated_at: '' },
  object: { id: '0', value: 'object', label: 'object', color: '#722ed1', sort_order: 4, created_at: '', updated_at: '' },
  array: { id: '0', value: 'array', label: 'array', color: '#13c2c2', sort_order: 5, created_at: '', updated_at: '' },
}

let cachedTypes: Record<string, PropertyTypeConfig> | null = null
let loading = false
const listeners: (() => void)[] = []

function loadTypes() {
  if (cachedTypes || loading) return
  loading = true
  getPropertyTypes().then((data) => {
    cachedTypes = {}
    data.forEach((t) => { cachedTypes![t.value] = t })
    listeners.forEach((fn) => fn())
  }).catch(() => {
    cachedTypes = DEFAULT_TYPES
  }).finally(() => {
    loading = false
  })
}

interface PropertyTypeTagProps {
  type: string
}

export default function PropertyTypeTag({ type }: PropertyTypeTagProps) {
  const [, setRefresh] = useState(0)

  useEffect(() => {
    loadTypes()
    const fn = () => setRefresh((n) => n + 1)
    listeners.push(fn)
    return () => { listeners.splice(listeners.indexOf(fn), 1) }
  }, [])

  const types = cachedTypes || DEFAULT_TYPES
  const config = types[type]
  return <Tag color={config?.color || '#999'}>{config?.label || type}</Tag>
}

// 导出 hook 供表单使用
export function usePropertyTypeOptions() {
  const [options, setOptions] = useState<{ value: string; label: string }[]>([])

  useEffect(() => {
    getPropertyTypes()
      .then((data) => setOptions(data.map((t) => ({ value: t.value, label: t.label }))))
      .catch(() => setOptions(Object.keys(DEFAULT_TYPES).map((k) => ({ value: k, label: k }))))
  }, [])

  return options
}
