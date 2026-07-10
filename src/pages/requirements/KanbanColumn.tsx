import { Badge, Typography, theme } from 'antd'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { Requirement } from '../../types'
import RequirementCard from './RequirementCard'
import type { ActiveRequirementStatus } from './requirementPresentation'

const { Text } = Typography

const COLUMN_COLORS: Record<ActiveRequirementStatus, string> = {
  pending: '#1677ff',
  in_progress: '#faad14',
  done: '#52c41a',
}

interface DraggableRequirementCardProps {
  requirement: Requirement
  onOpen: (requirement: Requirement) => void
  onEdit: (requirement: Requirement) => void
  onCopy: (requirement: Requirement) => void
  onDelete: (id: string) => Promise<void>
}

function DraggableRequirementCard(props: DraggableRequirementCardProps) {
  const { listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: props.requirement.id,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      style={{
        transform: transform
          ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
          : undefined,
        opacity: isDragging ? 0.55 : 1,
        marginBottom: 10,
      }}
    >
      <RequirementCard {...props} mode="board" />
    </div>
  )
}

interface KanbanColumnProps {
  status: ActiveRequirementStatus
  label: string
  items: Requirement[]
  onOpen: (requirement: Requirement) => void
  onEdit: (requirement: Requirement) => void
  onCopy: (requirement: Requirement) => void
  onDelete: (id: string) => Promise<void>
}

export default function KanbanColumn({
  status,
  label,
  items,
  onOpen,
  onEdit,
  onCopy,
  onDelete,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const { token } = theme.useToken()

  return (
    <section
      ref={setNodeRef}
      className="requirement-kanban-column"
      style={{
        background: isOver ? token.colorPrimaryBg : token.colorFillQuaternary,
        borderColor: isOver ? COLUMN_COLORS[status] : 'transparent',
      }}
    >
      <header className="requirement-kanban-column-header">
        <div className="requirement-kanban-column-title">
          <span className="requirement-status-dot" style={{ background: COLUMN_COLORS[status] }} />
          <Text strong>{label}</Text>
        </div>
        <Badge count={items.length} showZero color={COLUMN_COLORS[status]} />
      </header>

      <div className="requirement-kanban-column-body">
        {items.map((requirement) => (
          <DraggableRequirementCard
            key={requirement.id}
            requirement={requirement}
            onOpen={onOpen}
            onEdit={onEdit}
            onCopy={onCopy}
            onDelete={onDelete}
          />
        ))}
        {items.length === 0 ? (
          <div className="requirement-kanban-empty">暂无需求</div>
        ) : null}
      </div>
    </section>
  )
}
