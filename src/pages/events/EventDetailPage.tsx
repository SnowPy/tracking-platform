import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Card, Descriptions, Empty, message, Modal, Popconfirm, Select, Space, Tag, Typography } from 'antd'
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons'
import { getEventById, updateEvent, deleteEvent } from '../../api/events'
import { getEventProperties, createEventProperty, updateEventProperty, deleteEventProperty } from '../../api/eventProperties'
import PropertyTable from '../../components/PropertyTable'
import type { TrackingEvent, EventProperty, EventStatus } from '../../types'
import { PLATFORM_OPTIONS } from '../../types'
import type { PropertyItem } from '../../components/PropertyTable'
import { useProjectStore } from '../../stores/projectStore'
import EventFormModal from './EventFormModal'
import { formatError } from '../../utils/errors'

const { Text } = Typography

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const projectId = useProjectStore((s) => s.currentProjectId)
  const [event, setEvent] = useState<TrackingEvent | null>(null)
  const [properties, setProperties] = useState<EventProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [editing, setEditing] = useState(false)
  const [modal, modalContextHolder] = Modal.useModal()

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [eventData, propData] = await Promise.all([
        getEventById(id),
        getEventProperties(id),
      ])
      setEvent(eventData)
      setProperties(propData)
    } catch (error: unknown) {
      message.error(formatError(error))
    } finally {
      setLoading(false)
    }
  }, [id])

  // Initial and route-driven fetching intentionally updates page state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData() }, [loadData])

  const commitStatusChange = async (status: EventStatus) => {
    if (!id) return
    setUpdatingStatus(true)
    try {
      await updateEvent(id, { status })
      message.success('状态已更新')
      await loadData()
    } catch (error: unknown) {
      message.error(formatError(error))
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleStatusChange = (status: EventStatus) => {
    if (!event || status === event.status) return
    const nextStatusLabel = status === 'draft' ? '草稿' : status === 'active' ? '启用' : '废弃'
    modal.confirm({
      title: '确认变更事件状态？',
      content: `事件状态将更新为“${nextStatusLabel}”。`,
      okText: '确认变更',
      cancelText: '取消',
      onOk: () => commitStatusChange(status),
    })
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteEvent(id)
      message.success('事件已删除')
      navigate('/events')
    } catch (error: unknown) {
      message.error(formatError(error))
    }
  }

  if (loading && !event) {
    return <Card loading style={{ minHeight: 260 }} />
  }

  if (!event) {
    return (
      <Empty description="未找到该事件">
        <Button onClick={() => navigate('/events')}>返回事件列表</Button>
      </Empty>
    )
  }

  const propItems: PropertyItem[] = properties.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    description: p.description,
    required: p.required,
    example_value: p.example_value,
    sort_order: p.sort_order,
  }))

  return (
    <>
      {modalContextHolder}
      <div>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/events')} style={{ padding: 0, marginBottom: 16 }}>
        返回事件列表
      </Button>

      <Card loading={loading} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ margin: '0 0 4px' }}>{event.display_name}</h2>
              <Text code>{event.name}</Text>
            </div>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="状态">
                <Select
                  size="small"
                  value={event.status}
                  loading={updatingStatus}
                  onChange={handleStatusChange}
                  style={{ width: 96 }}
                  options={[
                    { value: 'draft', label: '草稿' },
                    { value: 'active', label: '启用' },
                    { value: 'deprecated', label: '废弃' },
                  ]}
                />
              </Descriptions.Item>
              <Descriptions.Item label="分类">{event.categories?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="目标平台">
                {(event.platforms || []).length > 0
                  ? (event.platforms || []).map((p: string) => {
                      const opt = PLATFORM_OPTIONS.find(o => o.value === p)
                      return <Tag key={p} color={opt?.color}>{opt?.label || p}</Tag>
                    })
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="触发时机">{event.trigger_timing || '-'}</Descriptions.Item>
              <Descriptions.Item label="版本">v{event.version}</Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {event.created_at ? new Date(event.created_at).toLocaleString('zh-CN') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {event.updated_at ? new Date(event.updated_at).toLocaleString('zh-CN') : '-'}
              </Descriptions.Item>
            </Descriptions>
            {event.description && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: '#fafafa', borderRadius: 6 }}>
                <strong>描述：</strong>{event.description}
              </div>
            )}
            {event.notes && (
              <div style={{ marginTop: 12, padding: '12px 16px', background: '#fffbe6', borderRadius: 6 }}>
                <strong>备注：</strong>{event.notes}
              </div>
            )}
          </div>
          <Space>
            <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>编辑事件</Button>
            <Popconfirm title="确定删除此事件？" description="关联属性也会被删除，此操作无法恢复。" onConfirm={handleDelete} okText="确定删除" cancelText="取消">
              <Button danger>删除事件</Button>
            </Popconfirm>
          </Space>
        </div>
      </Card>

      <Card title="事件属性" loading={loading}>
        <PropertyTable
          dataSource={propItems}
          showRequired
          projectId={projectId!}
          resizeKey="event-detail-properties-v2"
          onCreate={async (values) => {
            await createEventProperty({ project_id: projectId!, event_id: id!, ...values })
            await loadData()
          }}
          onUpdate={async (propId, values) => {
            await updateEventProperty(propId, values)
            await loadData()
          }}
          onDelete={async (propId) => {
            await deleteEventProperty(propId)
            await loadData()
          }}
        />
      </Card>
      </div>

      <EventFormModal
        open={editing}
        editingRecord={event}
        projectId={projectId!}
        onSubmit={async (values) => {
          await updateEvent(event.id, values)
          message.success('事件信息已更新')
          setEditing(false)
          await loadData()
        }}
        onCancel={() => setEditing(false)}
      />
    </>
  )
}
