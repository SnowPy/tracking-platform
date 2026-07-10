import { useEffect, useRef, useState } from 'react'
import {
  Button,
  Descriptions,
  Drawer,
  Empty,
  Input,
  Popconfirm,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  type TableColumnsType,
} from 'antd'
import { CopyOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import type { ProposedProperty, Requirement } from '../../types'
import StatusBadge from '../../components/StatusBadge'
import {
  getRequirementDisplayName,
  getRequirementPlatformText,
  getRequirementTechnicalName,
  REQUIREMENT_PRIORITY_META,
  REQUIREMENT_TYPE_META,
  TRACKING_TYPE_META,
} from './requirementPresentation'

const { Paragraph, Text, Title } = Typography
const { TextArea } = Input
const DRAWER_WIDTH_STORAGE_KEY = 'tracking-platform:requirement-drawer-width:v1'
const DEFAULT_DRAWER_WIDTH = 680
const MIN_DRAWER_WIDTH = 480
const MAX_DRAWER_WIDTH = 960
const DRAWER_VIEWPORT_MARGIN = 24
const KEYBOARD_RESIZE_STEP = 32

function getMaximumDrawerWidth() {
  return Math.min(MAX_DRAWER_WIDTH, window.innerWidth - DRAWER_VIEWPORT_MARGIN)
}

function clampDrawerWidth(width: number) {
  const maximumWidth = getMaximumDrawerWidth()
  const minimumWidth = Math.min(MIN_DRAWER_WIDTH, maximumWidth)
  return Math.min(maximumWidth, Math.max(minimumWidth, width))
}

function readStoredDrawerWidth() {
  try {
    const storedWidth = Number(localStorage.getItem(DRAWER_WIDTH_STORAGE_KEY))
    if (!Number.isFinite(storedWidth) || storedWidth <= 0) return clampDrawerWidth(DEFAULT_DRAWER_WIDTH)
    return clampDrawerWidth(storedWidth)
  } catch {
    return clampDrawerWidth(DEFAULT_DRAWER_WIDTH)
  }
}

interface RequirementDetailDrawerProps {
  open: boolean
  requirement: Requirement | null
  actionLoading: boolean
  onClose: () => void
  onEdit: (requirement: Requirement) => void
  onCopy: (requirement: Requirement) => void
  onDelete: (id: string) => Promise<void>
  onSaveComment: (requirement: Requirement, comment: string) => Promise<void>
  onSubmitForReview: (requirement: Requirement) => Promise<void>
  onReturnToDevelopment: (requirement: Requirement) => Promise<void>
  onApproveAndSync: (requirement: Requirement) => Promise<void>
}

function getPropertyActionTag(property: ProposedProperty) {
  if (property.action === 'delete') return <Tag color="red">待删除</Tag>
  if (property.action === 'modify') return <Tag color="orange">待修改</Tag>
  if (property.action === 'add') return <Tag color="green">新增</Tag>
  return <Tag>保留</Tag>
}

export default function RequirementDetailDrawer({
  open,
  requirement,
  actionLoading,
  onClose,
  onEdit,
  onCopy,
  onDelete,
  onSaveComment,
  onSubmitForReview,
  onReturnToDevelopment,
  onApproveAndSync,
}: RequirementDetailDrawerProps) {
  const [comment, setComment] = useState(requirement?.comment || '')
  const [drawerWidth, setDrawerWidth] = useState(readStoredDrawerWidth)
  const drawerWidthRef = useRef(drawerWidth)
  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const removeDragListenersRef = useRef<(() => void) | null>(null)

  const updateDrawerWidth = (width: number, shouldPersist = false) => {
    const nextWidth = clampDrawerWidth(width)
    drawerWidthRef.current = nextWidth
    setDrawerWidth(nextWidth)

    if (!shouldPersist) return
    try {
      localStorage.setItem(DRAWER_WIDTH_STORAGE_KEY, String(nextWidth))
    } catch {
      // The drawer remains resizable even when storage is unavailable.
    }
  }

  const stopDragging = () => {
    removeDragListenersRef.current?.()
    removeDragListenersRef.current = null
    dragStateRef.current = null
    document.body.style.removeProperty('cursor')
    document.body.style.removeProperty('user-select')
  }

  useEffect(() => {
    const handleViewportResize = () => updateDrawerWidth(drawerWidthRef.current)
    window.addEventListener('resize', handleViewportResize)
    return () => {
      window.removeEventListener('resize', handleViewportResize)
      stopDragging()
    }
  }, [])

  if (!requirement) return null

  const displayName = getRequirementDisplayName(requirement)
  const technicalName = getRequirementTechnicalName(requirement)
  const trackingType = TRACKING_TYPE_META[requirement.tracking_type]
  const requirementType = REQUIREMENT_TYPE_META[requirement.modification_type]
  const priority = REQUIREMENT_PRIORITY_META[requirement.priority]
  const platformText = getRequirementPlatformText(requirement.platforms || []) || '-'

  const footer = (
    <div className="requirement-drawer-footer">
      <Text type="secondary">状态操作会立即更新当前需求</Text>
      <Space>
        {requirement.status === 'pending' ? (
          <Button type="primary" loading={actionLoading} onClick={() => onSubmitForReview(requirement)}>
            提交验收
          </Button>
        ) : null}
        {requirement.status === 'in_progress' ? (
          <>
            <Button disabled={actionLoading} onClick={() => onReturnToDevelopment(requirement)}>
              退回开发
            </Button>
            <Button type="primary" loading={actionLoading} onClick={() => onApproveAndSync(requirement)}>
              验收通过并同步
            </Button>
          </>
        ) : null}
      </Space>
    </div>
  )

  const propertyColumns: TableColumnsType<ProposedProperty> = [
    { title: '属性名', dataIndex: 'name', width: '20%', ellipsis: true, render: (value: string) => <Text code>{value}</Text> },
    { title: '显示名', dataIndex: 'display_name', width: '18%', ellipsis: true, render: (value?: string) => value || '-' },
    { title: '类型', dataIndex: 'type', width: '12%', ellipsis: true },
    { title: '必填', dataIndex: 'required', width: '10%', render: (value: boolean) => value ? '是' : '否' },
    { title: '变更', width: '12%', render: (_: unknown, property: ProposedProperty) => getPropertyActionTag(property) },
    { title: '说明', dataIndex: 'description', width: '28%', ellipsis: true },
  ]

  return (
    <Drawer
      title={(
        <div>
          <Space size={8} wrap>
            <span>{displayName}</span>
            <StatusBadge status={requirement.status} type="requirement" />
          </Space>
          <div><Text code>{technicalName}</Text></div>
        </div>
      )}
      open={open}
      onClose={onClose}
      size={drawerWidth}
      footer={footer}
      extra={(
        <Space size="small">
          {requirement.status !== 'done' ? (
            <Button icon={<EditOutlined />} onClick={() => onEdit(requirement)}>编辑</Button>
          ) : null}
          <Button icon={<CopyOutlined />} onClick={() => onCopy(requirement)}>复制</Button>
          <Popconfirm title="删除需求？" description="删除后无法恢复。" onConfirm={() => onDelete(requirement.id)}>
            <Button danger icon={<DeleteOutlined />} aria-label="删除需求" />
          </Popconfirm>
        </Space>
      )}
    >
      <div
        className="requirement-drawer-resize-handle"
        style={{ right: drawerWidth - 5 }}
        role="separator"
        aria-label="调整详情抽屉宽度"
        aria-orientation="vertical"
        aria-valuemin={Math.min(MIN_DRAWER_WIDTH, getMaximumDrawerWidth())}
        aria-valuemax={getMaximumDrawerWidth()}
        aria-valuenow={drawerWidth}
        tabIndex={0}
        title="拖动调整宽度，双击恢复默认宽度"
        onMouseDown={(event) => {
          event.preventDefault()
          stopDragging()
          dragStateRef.current = { startX: event.clientX, startWidth: drawerWidthRef.current }
          document.body.style.cursor = 'col-resize'
          document.body.style.userSelect = 'none'

          const handleMouseMove = (moveEvent: MouseEvent) => {
            const dragState = dragStateRef.current
            if (!dragState) return
            updateDrawerWidth(dragState.startWidth + dragState.startX - moveEvent.clientX)
          }
          const handleMouseUp = () => {
            updateDrawerWidth(drawerWidthRef.current, true)
            stopDragging()
          }

          document.addEventListener('mousemove', handleMouseMove)
          document.addEventListener('mouseup', handleMouseUp)
          removeDragListenersRef.current = () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
          }
        }}
        onDoubleClick={() => updateDrawerWidth(DEFAULT_DRAWER_WIDTH, true)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault()
            updateDrawerWidth(drawerWidthRef.current + KEYBOARD_RESIZE_STEP, true)
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault()
            updateDrawerWidth(drawerWidthRef.current - KEYBOARD_RESIZE_STEP, true)
          }
          if (event.key === 'Home') {
            event.preventDefault()
            updateDrawerWidth(DEFAULT_DRAWER_WIDTH, true)
          }
        }}
      />

      <Space size={[4, 4]} wrap style={{ marginBottom: 16 }}>
        <Tag color={trackingType.color}>{trackingType.label}</Tag>
        <Tag color={requirementType.color}>{requirementType.label}</Tag>
        <Tag color={priority.color}>优先级 {priority.label}</Tag>
      </Space>

      <Descriptions column={2} size="small" bordered>
        <Descriptions.Item label="版本">{requirement.version || '-'}</Descriptions.Item>
        <Descriptions.Item label="目标平台">{platformText}</Descriptions.Item>
        <Descriptions.Item label="提交人">{requirement.profiles_requester?.display_name || '-'}</Descriptions.Item>
        <Descriptions.Item label="创建时间">{new Date(requirement.created_at).toLocaleString('zh-CN')}</Descriptions.Item>
      </Descriptions>

      <Title level={5} style={{ marginTop: 24 }}>业务定义</Title>
      <div className="requirement-detail-section">
        <Text strong>业务场景</Text>
        <Paragraph>{requirement.description || '未填写业务场景'}</Paragraph>
        {requirement.tracking_type === 'event' ? (
          <>
            <Text strong>触发时机</Text>
            <Paragraph style={{ marginBottom: 0 }}>{requirement.trigger_timing || '未填写触发时机'}</Paragraph>
          </>
        ) : null}
      </div>

      <Title level={5} style={{ marginTop: 24 }}>属性方案</Title>
      {requirement.proposed_properties?.length ? (
        <Table
          size="small"
          rowKey={(property) => property.existing_id || `${property.action || 'keep'}-${property.name}`}
          columns={propertyColumns}
          dataSource={requirement.proposed_properties}
          pagination={false}
          tableLayout="fixed"
          scroll={{ x: 620 }}
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="未配置属性" />
      )}

      <Tabs
        style={{ marginTop: 24 }}
        items={[
          {
            key: 'comment',
            label: '备注',
            children: (
              <div>
                <TextArea rows={4} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="添加需求备注" />
                <Button
                  type="primary"
                  style={{ marginTop: 8 }}
                  loading={actionLoading}
                  onClick={() => onSaveComment(requirement, comment)}
                >
                  保存备注
                </Button>
              </div>
            ),
          },
          {
            key: 'history',
            label: '操作记录',
            children: (
              <Space direction="vertical" size={4}>
                <Text type="secondary">创建于 {new Date(requirement.created_at).toLocaleString('zh-CN')}</Text>
                <Text type="secondary">更新于 {new Date(requirement.updated_at).toLocaleString('zh-CN')}</Text>
              </Space>
            ),
          },
        ]}
      />
    </Drawer>
  )
}
