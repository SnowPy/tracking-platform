import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Button, Space, Popconfirm, message, Select } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { getEventById, updateEvent, deleteEvent } from '../../api/events'
import { getEventProperties, createEventProperty, updateEventProperty, deleteEventProperty } from '../../api/eventProperties'
import StatusBadge from '../../components/StatusBadge'
import PropertyTable from '../../components/PropertyTable'
import type { TrackingEvent, EventProperty, EventStatus } from '../../types'
import type { PropertyItem } from '../../components/PropertyTable'

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [event, setEvent] = useState<TrackingEvent | null>(null)
  const [properties, setProperties] = useState<EventProperty[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [eventData, propData] = await Promise.all([
        getEventById(id),
        getEventProperties(id),
      ])
      setEvent(eventData)
      setProperties(propData)
    } catch (err: any) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [id])

  const handleStatusChange = async (status: EventStatus) => {
    if (!id) return
    setUpdatingStatus(true)
    try {
      await updateEvent(id, { status })
      message.success('状态已更新')
      await loadData()
    } catch (err: any) {
      message.error(err.message)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleDelete = async () => {
    if (!id) return
    try {
      await deleteEvent(id)
      message.success('事件已删除')
      navigate('/events')
    } catch (err: any) {
      message.error(err.message)
    }
  }

  if (!event) return null

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
    <div>
      <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/events')} style={{ padding: 0, marginBottom: 16 }}>
        返回事件列表
      </Button>

      <Card loading={loading} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ marginBottom: 16 }}>
              <code style={{ fontSize: 18, background: '#f5f5f5', padding: '2px 8px', borderRadius: 4 }}>{event.name}</code>
              <span style={{ marginLeft: 12, color: '#666' }}>{event.display_name}</span>
            </h2>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="状态">
                <Space>
                  <StatusBadge status={event.status} type="event" />
                  <Select
                    size="small"
                    value={event.status}
                    loading={updatingStatus}
                    onChange={handleStatusChange}
                    style={{ width: 90 }}
                    options={[
                      { value: 'draft', label: '草稿' },
                      { value: 'active', label: '启用' },
                      { value: 'deprecated', label: '废弃' },
                    ]}
                  />
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="分类">{event.categories?.name || '-'}</Descriptions.Item>
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
          </div>
          <Popconfirm title="确定删除此事件？" onConfirm={handleDelete} okText="确定" cancelText="取消">
            <Button danger>删除事件</Button>
          </Popconfirm>
        </div>
      </Card>

      <Card title="事件属性" loading={loading}>
        <PropertyTable
          dataSource={propItems}
          showRequired
          onCreate={async (values) => {
            await createEventProperty({ event_id: id!, ...values })
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
  )
}
