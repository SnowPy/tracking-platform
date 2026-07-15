import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { getPropertyTypes } from '../api/propertyTypes'
import type { PropertyTypeConfig } from '../types'

const DEFAULT_TYPES: Record<string, PropertyTypeConfig> = {
  string: { id: '0', project_id: '', value: 'string', label: 'string', color: '#1677ff', sort_order: 1, created_at: '', updated_at: '' },
  number: { id: '0', project_id: '', value: 'number', label: 'number', color: '#52c41a', sort_order: 2, created_at: '', updated_at: '' },
  boolean: { id: '0', project_id: '', value: 'boolean', label: 'boolean', color: '#faad14', sort_order: 3, created_at: '', updated_at: '' },
  object: { id: '0', project_id: '', value: 'object', label: 'object', color: '#722ed1', sort_order: 4, created_at: '', updated_at: '' },
  array: { id: '0', project_id: '', value: 'array', label: 'array', color: '#13c2c2', sort_order: 5, created_at: '', updated_at: '' },
}

const cache = new Map<string, Record<string, PropertyTypeConfig>>()
const pending = new Map<string, Promise<void>>()
const listeners = new Map<string, Set<() => void>>()

function notify(projectId: string) {
  listeners.get(projectId)?.forEach((listener) => listener())
}

function subscribe(projectId: string | undefined, listener: () => void) {
  if (!projectId) return () => undefined
  const projectListeners = listeners.get(projectId) ?? new Set<() => void>()
  projectListeners.add(listener)
  listeners.set(projectId, projectListeners)
  return () => {
    projectListeners.delete(listener)
    if (projectListeners.size === 0) listeners.delete(projectId)
  }
}

function loadTypes(projectId: string) {
  if (cache.has(projectId)) return Promise.resolve()
  const existingRequest = pending.get(projectId)
  if (existingRequest) return existingRequest

  const request = getPropertyTypes(projectId)
    .then((data) => {
      cache.set(projectId, Object.fromEntries(data.map((type) => [type.value, type])))
    })
    .catch(() => {
      cache.set(projectId, DEFAULT_TYPES)
    })
    .finally(() => {
      pending.delete(projectId)
      notify(projectId)
    })

  pending.set(projectId, request)
  return request
}

export function invalidatePropertyTypes(projectId: string) {
  cache.delete(projectId)
  notify(projectId)
  return loadTypes(projectId)
}

export function usePropertyTypeMap(projectId?: string) {
  const types = useSyncExternalStore(
    (listener) => subscribe(projectId, listener),
    () => projectId ? cache.get(projectId) ?? DEFAULT_TYPES : DEFAULT_TYPES,
    () => DEFAULT_TYPES,
  )

  useEffect(() => {
    if (projectId) void loadTypes(projectId)
  }, [projectId])

  return types
}

export function usePropertyTypeOptions(projectId?: string) {
  const types = usePropertyTypeMap(projectId)
  return useMemo(
    () => Object.values(types)
      .sort((left, right) => left.sort_order - right.sort_order)
      .map((type) => ({ value: type.value, label: type.label })),
    [types],
  )
}
