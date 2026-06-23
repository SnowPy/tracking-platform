import { useEffect, useState } from 'react'
import { Tag } from 'antd'
import { getPropertyTypes } from '../api/propertyTypes'
import type { PropertyTypeConfig } from '../types'

// 默认兜底配置
const DEFAULT_TYPES: Record<string, PropertyTypeConfig> = {
  string: { id: '0', project_id: '', value: 'string', label: 'string', color: '#1677ff', sort_order: 1, created_at: '', updated_at: '' },
  number: { id: '0', project_id: '', value: 'number', label: 'number', color: '#52c41a', sort_order: 2, created_at: '', updated_at: '' },
  boolean: { id: '0', project_id: '', value: 'boolean', label: 'boolean', color: '#faad14', sort_order: 3, created_at: '', updated_at: '' },
  object: { id: '0', project_id: '', value: 'object', label: 'object', color: '#722ed1', sort_order: 4, created_at: '', updated_at: '' },
  array: { id: '0', project_id: '', value: 'array', label: 'array', color: '#13c2c2', sort_order: 5, created_at: '', updated_at: '' },
}

// 按 projectId 缓存
const cachedTypesByProject = new Map<string, Record<string, PropertyTypeConfig>>()
const loadingSet = new Set<string>()
const listeners: (() => void)[] = []

function loadTypes(projectId: string) {
  if (cachedTypesByProject.has(projectId) || loadingSet.has(projectId)) return
  loadingSet.add(projectId)
  getPropertyTypes(projectId).then((data) => {
    const map: Record<string, PropertyTypeConfig> = {}
    data.forEach((t) => { map[t.value] = t })
    cachedTypesByProject.set(projectId, map)
    listeners.forEach((fn) => fn())
  }).catch(() => {
    cachedTypesByProject.set(projectId, DEFAULT_TYPES)
  }).finally(() => {
    loadingSet.delete(projectId)
  })
}

interface PropertyTypeTagProps {
  type: string
  projectId?: string
}

export default function PropertyTypeTag({ type, projectId }: PropertyTypeTagProps) {
  const [, setRefresh] = useState(0)

  useEffect(() => {
    if (projectId) {
      loadTypes(projectId)
      const fn = () => setRefresh((n) => n + 1)
      listeners.push(fn)
      return () => { listeners.splice(listeners.indexOf(fn), 1) }
    }
  }, [projectId])

  const types = (projectId ? cachedTypesByProject.get(projectId) : undefined) || DEFAULT_TYPES
  const config = types[type]
  return <Tag color={config?.color || '#999'}>{config?.label || type}</Tag>
}

// 导出 hook 供表单使用
export function usePropertyTypeOptions(projectId?: string) {
  const [options, setOptions] = useState<{ value: string; label: string }[]>([])

  useEffect(() => {
    if (!projectId) return
    getPropertyTypes(projectId)
      .then((data) => setOptions(data.map((t) => ({ value: t.value, label: t.label }))))
      .catch(() => setOptions(Object.keys(DEFAULT_TYPES).map((k) => ({ value: k, label: k }))))
  }, [projectId])

  return options
}
