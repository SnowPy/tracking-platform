import { Tag } from 'antd'
import type { EventStatus, RequirementStatus } from '../types'

const EVENT_STATUS_MAP: Record<EventStatus, { color: string; label: string }> = {
  draft: { color: 'default', label: '草稿' },
  active: { color: 'success', label: '启用' },
  deprecated: { color: 'warning', label: '废弃' },
}

const REQUIREMENT_STATUS_MAP: Record<RequirementStatus, { color: string; label: string }> = {
  pending: { color: 'processing', label: '待处理' },
  in_progress: { color: 'warning', label: '进行中' },
  done: { color: 'success', label: '已完成' },
  rejected: { color: 'error', label: '已拒绝' },
}

interface StatusBadgeProps {
  status: EventStatus | RequirementStatus
  type: 'event' | 'requirement'
}

export default function StatusBadge({ status, type }: StatusBadgeProps) {
  const config = type === 'event'
    ? EVENT_STATUS_MAP[status as EventStatus]
    : REQUIREMENT_STATUS_MAP[status as RequirementStatus]

  return <Tag color={config.color}>{config.label}</Tag>
}
