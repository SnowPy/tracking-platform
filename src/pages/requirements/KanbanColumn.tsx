import { useNavigate } from 'react-router-dom'
import { Button, Card, Popconfirm, Space, Tag, Typography, theme } from 'antd'
import { CopyOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { Requirement, RequirementStatus } from '../../types'
import { PLATFORM_OPTIONS } from '../../types'

const { Text } = Typography

const CARD_TITLE_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: 14,
  fontWeight: 600,
  lineHeight: '22px',
  cursor: 'pointer',
}

const OBJECT_NAME_STYLE: React.CSSProperties = {
  display: 'block',
  width: '100%',
  fontFamily: "'SF Mono', 'Cascadia Code', Consolas, 'Microsoft YaHei UI', monospace",
  fontSize: 13,
  lineHeight: '20px',
}

const META_TEXT_STYLE: React.CSSProperties = {
  fontSize: 12,
  lineHeight: '20px',
}

const TAG_STYLE: React.CSSProperties = {
  fontSize: 12,
  lineHeight: '20px',
}

const COLUMN_COLORS: Record<RequirementStatus, string> = {
  pending: '#1677ff',
  in_progress: '#faad14',
  done: '#52c41a',
  rejected: '#ff4d4f',
}

function getObjectName(item: Requirement) {
  return item.event_name || item.display_name || '未填写事件/属性名'
}

function getPlatformText(platforms: Requirement['platforms']) {
  if (!platforms || platforms.length === 0) return ''

  const selectedPlatforms = new Set(platforms)
  const hasAllPlatforms = PLATFORM_OPTIONS.every((option) => selectedPlatforms.has(option.value))
  if (hasAllPlatforms) return '全部平台'

  return platforms
    .map((platform) => PLATFORM_OPTIONS.find((option) => option.value === platform)?.label || platform)
    .join(' / ')
}

function getMetaText(item: Requirement) {
  return [item.version, getPlatformText(item.platforms)]
    .filter(Boolean)
    .join(' · ')
}

function DraggableCard({ item, onEdit, onDelete, onCopy }: {
  item: Requirement
  onEdit: (item: Requirement) => void
  onDelete: (id: string) => void
  onCopy: (item: Requirement) => void
}) {
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id })
  const dragTransform = transform
    ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
    : undefined

  const style: React.CSSProperties = {
    transform: dragTransform,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  }

  const objectName = getObjectName(item)
  const metaText = getMetaText(item)

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={style}>
      <Card
        size="small"
        variant="borderless"
        style={{ marginBottom: 10, outline: `1px solid ${token.colorBorderSecondary}` }}
        styles={{ body: { padding: 12 } }}
      >
        <div style={{ marginBottom: 6 }}>
          <Text
            strong
            ellipsis
            style={CARD_TITLE_STYLE}
            onClick={() => navigate(`/requirements/${item.id}`)}
          >
            {item.title}
          </Text>
        </div>

        <div style={{ marginBottom: 8 }}>
          <Text
            ellipsis
            style={{
              ...OBJECT_NAME_STYLE,
              color: objectName === '未填写事件/属性名' ? token.colorTextTertiary : token.colorText,
              background: token.colorFillQuaternary,
              borderRadius: 4,
              padding: '2px 6px',
            }}
          >
            {objectName}
          </Text>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Text type="secondary" ellipsis style={{ ...META_TEXT_STYLE, flex: 1, minWidth: 0 }}>
            {metaText}
          </Text>
          <Space size={4}>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              title="复制"
              onClick={(e) => { e.stopPropagation(); onCopy(item) }}
            />
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              title="编辑"
              onClick={(e) => { e.stopPropagation(); onEdit(item) }}
            />
            <Popconfirm title="确定删除？" onConfirm={() => onDelete(item.id)}>
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                title="删除"
                onClick={(e) => e.stopPropagation()}
              />
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
  onCopy: (item: Requirement) => void
}

export default function KanbanColumn({ status, label, items, count, onEdit, onDelete, onCopy }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const { token } = theme.useToken()

  return (
    <div
      ref={setNodeRef}
      style={{
        width: '100%',
        minWidth: 0,
        background: isOver ? token.colorPrimaryBg : token.colorFillQuaternary,
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
          <Text strong style={{ fontSize: 14, lineHeight: '22px' }}>{label}</Text>
        </Space>
        <Tag style={TAG_STYLE}>{count}</Tag>
      </div>
      <div style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
        {items.map((item) => (
          <DraggableCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} onCopy={onCopy} />
        ))}
        {items.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '24px 0',
            color: token.colorTextTertiary,
            fontSize: 14,
            lineHeight: '22px',
          }}>
            拖拽需求至此
          </div>
        )}
      </div>
    </div>
  )
}
