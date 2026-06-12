import { useNavigate } from 'react-router-dom'
import { Card, Tag, Button, Space, Popconfirm, Typography } from 'antd'
import { EditOutlined, DeleteOutlined, UserOutlined, CheckOutlined } from '@ant-design/icons'
import { useDroppable, useDraggable } from '@dnd-kit/core'
import type { Requirement, RequirementStatus, RequirementPriority } from '../../types'
import { PLATFORM_OPTIONS } from '../../types'

const { Text, Paragraph } = Typography

const COLUMN_COLORS: Record<RequirementStatus, string> = {
  pending: '#1677ff',
  in_progress: '#faad14',
  done: '#52c41a',
  rejected: '#ff4d4f',
}

const PRIORITY_TAGS: Record<RequirementPriority, { color: string; label: string }> = {
  high: { color: 'red', label: '高' },
  medium: { color: 'orange', label: '中' },
  low: { color: 'default', label: '低' },
}

function DraggableCard({ item, onEdit, onDelete, onMarkDone }: {
  item: Requirement
  onEdit: (item: Requirement) => void
  onDelete: (id: string) => void
  onMarkDone: (item: Requirement) => void
}) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id })

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  }

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={style}>
      <Card
        size="small"
        style={{ marginBottom: 8 }}
        styles={{ body: { padding: 12 } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <Text strong style={{ flex: 1, fontSize: 13, lineHeight: '20px', cursor: 'pointer' }}
            onClick={() => navigate(`/requirements/${item.id}`)}>{item.title}</Text>
          <Space size={4}>
            <Tag color={item.modification_type === 'new' ? 'blue' : 'green'} style={{ marginLeft: 0 }}>
              {item.modification_type === 'new' ? '新增' : '修改'}
            </Tag>
            <Tag color={PRIORITY_TAGS[item.priority]?.color}>
              {PRIORITY_TAGS[item.priority]?.label}
            </Tag>
          </Space>
        </div>
        {(item.version || (item.platforms && item.platforms.length > 0)) && (
          <Space size={2} wrap style={{ marginBottom: 4 }}>
            {item.version && <Tag style={{ fontSize: 10 }}>📦 {item.version}</Tag>}
            {(item.platforms || []).map((p: string) => {
              const opt = PLATFORM_OPTIONS.find(o => o.value === p)
              return <Tag key={p} color={opt?.color} style={{ fontSize: 10 }}>{opt?.label || p}</Tag>
            })}
          </Space>
        )}
        {item.event_name && (
          <Tag style={{ marginBottom: 4, fontSize: 12 }}>{item.event_name}</Tag>
        )}
        {item.description && (
          <Paragraph
            ellipsis={{ rows: 2 }}
            style={{ fontSize: 12, color: '#666', marginBottom: 8 }}
          >
            {item.description}
          </Paragraph>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary" style={{ fontSize: 11 }}>
            <UserOutlined style={{ marginRight: 2 }} />
            {item.profiles_requester?.display_name || '-'}
          </Text>
          <Space size="small">
            {item.status !== 'done' && (
              <Button
                type="link" size="small"
                icon={<CheckOutlined style={{ color: '#52c41a' }} />}
                onClick={(e) => { e.stopPropagation(); onMarkDone(item) }}
              />
            )}
            <Button type="link" size="small" icon={<EditOutlined />}
              onClick={(e) => { e.stopPropagation(); onEdit(item) }} />
            <Popconfirm title="确定删除？" onConfirm={() => onDelete(item.id)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />}
                onClick={(e) => e.stopPropagation()} />
            </Popconfirm>
          </Space>
        </div>
      </Card>
    </div>
  )
}

interface KanbanColumnProps {
  status: RequirementStatus
  label: string
  items: Requirement[]
  count: number
  onEdit: (item: Requirement) => void
  onDelete: (id: string) => void
  onMarkDone: (item: Requirement) => void
}

export default function KanbanColumn({ status, label, items, count, onEdit, onDelete, onMarkDone }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: '1 1 0',
        minWidth: 280,
        maxWidth: 360,
        background: isOver ? '#f0f5ff' : '#fafafa',
        borderRadius: 8,
        padding: '12px',
        transition: 'background 0.2s',
        border: isOver ? `2px dashed ${COLUMN_COLORS[status]}` : '2px dashed transparent',
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        padding: '0 4px',
      }}>
        <Space>
          <div style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: COLUMN_COLORS[status],
          }} />
          <Text strong>{label}</Text>
        </Space>
        <Tag>{count}</Tag>
      </div>
      <div style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
        {items.map((item) => (
          <DraggableCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} onMarkDone={onMarkDone} />
        ))}
        {items.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '24px 0',
            color: '#ccc',
            fontSize: 14,
          }}>
            拖拽需求至此
          </div>
        )}
      </div>
    </div>
  )
}
