import { Button, Card, Dropdown, Modal, Space, Tag, Typography, type MenuProps } from 'antd'
import { CopyOutlined, DeleteOutlined, EditOutlined, MoreOutlined } from '@ant-design/icons'
import type { Requirement } from '../../types'
import {
  getRequirementDisplayName,
  getRequirementScope,
  getRequirementTechnicalName,
  REQUIREMENT_PRIORITY_META,
  REQUIREMENT_TYPE_META,
  TRACKING_TYPE_META,
} from './requirementPresentation'

const { Text } = Typography

interface RequirementCardProps {
  requirement: Requirement
  mode?: 'row' | 'board'
  onOpen: (requirement: Requirement) => void
  onEdit: (requirement: Requirement) => void
  onCopy: (requirement: Requirement) => void
  onDelete: (id: string) => Promise<void>
}

export default function RequirementCard({
  requirement,
  mode = 'row',
  onOpen,
  onEdit,
  onCopy,
  onDelete,
}: RequirementCardProps) {
  const displayName = getRequirementDisplayName(requirement)
  const technicalName = getRequirementTechnicalName(requirement)
  const trackingType = TRACKING_TYPE_META[requirement.tracking_type]
  const requirementType = REQUIREMENT_TYPE_META[requirement.modification_type]
  const priority = REQUIREMENT_PRIORITY_META[requirement.priority]

  const menuItems = [
    ...(requirement.status !== 'done'
      ? [{ key: 'edit', icon: <EditOutlined />, label: '编辑' }]
      : []),
    { key: 'copy', icon: <CopyOutlined />, label: '复制' },
    { type: 'divider' as const },
    { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true },
  ]

  const handleMenuClick: MenuProps['onClick'] = ({ key, domEvent }) => {
    domEvent.stopPropagation()
    if (key === 'edit') onEdit(requirement)
    if (key === 'copy') onCopy(requirement)
    if (key !== 'delete') return

    Modal.confirm({
      title: '删除需求？',
      content: `删除后无法恢复「${displayName}」。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => onDelete(requirement.id),
    })
  }

  const openRequirement = () => onOpen(requirement)

  return (
    <Card
      size="small"
      className={`requirement-card requirement-card-${mode}`}
      onClick={openRequirement}
    >
      <div className="requirement-card-main">
        <button
          type="button"
          className="requirement-card-title-button"
          onClick={(event) => {
            event.stopPropagation()
            openRequirement()
          }}
        >
          {displayName}
        </button>
        <Text code ellipsis className="requirement-card-technical">{technicalName}</Text>
      </div>

      <Space size={[4, 4]} wrap className="requirement-card-tags">
        <Tag color={trackingType.color}>{trackingType.label}</Tag>
        <Tag color={requirementType.color}>{requirementType.label}</Tag>
        <Tag color={priority.color}>优先级 {priority.label}</Tag>
      </Space>

      <div className="requirement-card-scope">
        <Text type="secondary" ellipsis>{getRequirementScope(requirement)}</Text>
        <Text type="secondary" className="requirement-card-updated">
          更新于 {new Date(requirement.updated_at).toLocaleString('zh-CN')}
        </Text>
      </div>

      <Dropdown menu={{ items: menuItems, onClick: handleMenuClick }} trigger={['click']}>
        <Button
          type="text"
          size="small"
          icon={<MoreOutlined />}
          aria-label="更多操作"
          onClick={(event) => event.stopPropagation()}
        />
      </Dropdown>
    </Card>
  )
}
