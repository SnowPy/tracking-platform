import type {
  Platform,
  Requirement,
  RequirementPriority,
  RequirementStatus,
  RequirementType,
  TrackingType,
} from '../../types'
import { PLATFORM_OPTIONS } from '../../types'

export const ACTIVE_REQUIREMENT_STATUSES = ['pending', 'in_progress', 'done'] as const
export type ActiveRequirementStatus = (typeof ACTIVE_REQUIREMENT_STATUSES)[number]

export const REQUIREMENT_STATUS_LABELS: Record<ActiveRequirementStatus, string> = {
  pending: '待开发',
  in_progress: '待验收',
  done: '已完成',
}

export const REQUIREMENT_PRIORITY_META: Record<RequirementPriority, { color: string; label: string; order: number }> = {
  high: { color: 'red', label: '高', order: 0 },
  medium: { color: 'orange', label: '中', order: 1 },
  low: { color: 'default', label: '低', order: 2 },
}

export const TRACKING_TYPE_META: Record<TrackingType, { color: string; label: string }> = {
  event: { color: 'purple', label: '事件' },
  common_property: { color: 'cyan', label: '公共属性' },
  user_property: { color: 'geekblue', label: '用户属性' },
}

export const REQUIREMENT_TYPE_META: Record<RequirementType, { color: string; label: string }> = {
  new: { color: 'blue', label: '新增' },
  modify: { color: 'green', label: '修改' },
}

export interface RequirementFilters {
  query: string
  version?: string
  platform?: Platform
  trackingType?: TrackingType
  requirementType?: RequirementType
  priority?: RequirementPriority
}

export function isActiveRequirementStatus(status: RequirementStatus): status is ActiveRequirementStatus {
  return ACTIVE_REQUIREMENT_STATUSES.includes(status as ActiveRequirementStatus)
}

export function getRequirementDisplayName(requirement: Requirement) {
  return requirement.display_name?.trim() || requirement.title
}

export function getRequirementTechnicalName(requirement: Requirement) {
  return requirement.event_name?.trim() || '未填写技术名'
}

export function getRequirementPlatformText(platforms: Platform[]) {
  if (platforms.length === 0) return ''

  const selectedPlatforms = new Set(platforms)
  const hasAllPlatforms = PLATFORM_OPTIONS.every((option) => selectedPlatforms.has(option.value))
  if (hasAllPlatforms) return '全部平台'

  return platforms
    .map((platform) => PLATFORM_OPTIONS.find((option) => option.value === platform)?.label || platform)
    .join(' / ')
}

export function getRequirementScope(requirement: Requirement) {
  const platformText = getRequirementPlatformText(requirement.platforms || [])
  return [requirement.version, platformText].filter(Boolean).join(' · ') || '未设置交付范围'
}

export function filterRequirements(requirements: Requirement[], filters: RequirementFilters) {
  const normalizedQuery = filters.query.trim().toLocaleLowerCase('zh-CN')

  return requirements.filter((requirement) => {
    if (!isActiveRequirementStatus(requirement.status)) return false
    if (filters.version && requirement.version !== filters.version) return false
    if (filters.platform && !requirement.platforms?.includes(filters.platform)) return false
    if (filters.trackingType && requirement.tracking_type !== filters.trackingType) return false
    if (filters.requirementType && requirement.modification_type !== filters.requirementType) return false
    if (filters.priority && requirement.priority !== filters.priority) return false
    if (!normalizedQuery) return true

    const searchableText = [
      requirement.display_name,
      requirement.title,
      requirement.event_name,
      requirement.description,
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('zh-CN')

    return searchableText.includes(normalizedQuery)
  })
}

export function sortRequirements(requirements: Requirement[]) {
  return [...requirements].sort((left, right) => {
    const priorityDifference = REQUIREMENT_PRIORITY_META[left.priority].order
      - REQUIREMENT_PRIORITY_META[right.priority].order
    if (priorityDifference !== 0) return priorityDifference

    return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
  })
}
