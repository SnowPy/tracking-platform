import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Table, Button, Input, Select, Space, Popconfirm, Tag, message } from 'antd'
import { PlusOutlined, SearchOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { getEvents, createEvent, updateEvent, deleteEvent } from '../../api/events'
import { getCategories } from '../../api/categories'
import StatusBadge from '../../components/StatusBadge'
import type { TrackingEvent, Category, EventStatus, Platform } from '../../types'
import { PLATFORM_OPTIONS } from '../../types'
import EventFormModal from './EventFormModal'

export default function EventListPage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<TrackingEvent[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<{ category_id?: string; status?: string; search?: string }>({})
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<TrackingEvent | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const { data, count } = await getEvents({ ...filters, page })
      setEvents(data)
      setTotal(count)
    } catch (err: any) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    getCategories().then(setCategories).catch(() => {})
  }, [])

  const handleCreate = () => {
    setEditingRecord(null)
    setModalOpen(true)
  }

  const handleEdit = (record: TrackingEvent) => {
    setEditingRecord(record)
    setModalOpen(true)
  }

  const handleSubmit = async (values: {
    name: string
    display_name: string
    category_id?: string | null
    description?: string
    status: EventStatus
    platforms?: Platform[]
    trigger_timing?: string
    notes?: string
  }) => {
    if (editingRecord) {
      await updateEvent(editingRecord.id, values)
      message.success('更新成功')
    } else {
      await createEvent(values)
      message.success('创建成功')
    }
    setModalOpen(false)
    await loadData()
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteEvent(id)
      message.success('删除成功')
      await loadData()
    } catch (err: any) {
      message.error(err.message)
    }
  }

  const columns: ColumnsType<TrackingEvent> = [
    { title: '事件标识', dataIndex: 'name', key: 'name', width: 160,
      render: (name: string) => <code style={{ fontSize: 13 }}>{name}</code>,
    },
    { title: '显示名称', dataIndex: 'display_name', key: 'display_name', width: 140 },
    {
      title: '分类', dataIndex: ['categories', 'name'], key: 'category', width: 120,
      render: (name: string | undefined) => name || '-',
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (status: EventStatus) => <StatusBadge status={status} type="event" />,
    },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '平台', key: 'platforms', width: 130,
      render: (_: unknown, r: TrackingEvent) => (r.platforms || []).map((p: string) => {
        const opt = PLATFORM_OPTIONS.find(o => o.value === p)
        return <Tag key={p} color={opt?.color} style={{ fontSize: 11 }}>{opt?.label || p}</Tag>
      }),
    },
    { title: '触发时机', dataIndex: 'trigger_timing', key: 'trigger_timing', width: 120, ellipsis: true, render: (v: string) => v || '-' },
    {
      title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 180,
      render: (val: string) => val ? new Date(val).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作', key: 'actions', width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/events/${record.id}`)}>
            查看
          </Button>
          <Button type="link" size="small" onClick={() => handleEdit(record)}>编辑</Button>
          <Popconfirm title="确定删除？关联属性会一并删除" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>事件管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>创建事件</Button>
      </div>
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="搜索事件名/显示名"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 220 }}
            onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value || undefined })); setPage(1) }}
          />
          <Select
            placeholder="按分类筛选"
            allowClear
            style={{ width: 160 }}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(val) => { setFilters((f) => ({ ...f, category_id: val })); setPage(1) }}
          />
          <Select
            placeholder="按状态筛选"
            allowClear
            style={{ width: 120 }}
            options={[
              { value: 'draft', label: '草稿' },
              { value: 'active', label: '启用' },
              { value: 'deprecated', label: '废弃' },
            ]}
            onChange={(val) => { setFilters((f) => ({ ...f, status: val })); setPage(1) }}
          />
        </Space>
        <Table
          columns={columns}
          dataSource={events}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            onChange: (p) => setPage(p),
            showTotal: (t) => `共 ${t} 个事件`,
          }}
          size="middle"
        />
      </Card>

      <EventFormModal
        open={modalOpen}
        editingRecord={editingRecord}
        onSubmit={handleSubmit}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  )
}
