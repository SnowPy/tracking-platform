import { useEffect, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, Card, Dropdown, Input, message, Popconfirm, Select, Space, Tooltip, Typography, type MenuProps } from 'antd'
import { PlusOutlined, SearchOutlined, DeleteOutlined, EyeOutlined, MoreOutlined, EditOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { getEvents, createEvent, updateEvent, deleteEvent } from '../../api/events'
import { getCategories } from '../../api/categories'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/EmptyState'
import ResizableTable from '../../components/ResizableTable'
import type { TrackingEvent, Category, EventStatus, Platform } from '../../types'
import { PLATFORM_OPTIONS } from '../../types'
import EventFormModal from './EventFormModal'
import { useProjectStore } from '../../stores/projectStore'
import { useDebounce } from '../../hooks/useDebounce'
import { formatError } from '../../utils/errors'

const { Text } = Typography

const EVENT_STATUS_OPTIONS = [
  { value: 'draft', label: '草稿' },
  { value: 'active', label: '启用' },
  { value: 'deprecated', label: '废弃' },
] satisfies { value: EventStatus; label: string }[]

function getInitialStatus(search: string): EventStatus | undefined {
  const status = new URLSearchParams(search).get('status')
  return EVENT_STATUS_OPTIONS.some((option) => option.value === status) ? status as EventStatus : undefined
}

export default function EventListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const projectId = useProjectStore((s) => s.currentProjectId)
  const [events, setEvents] = useState<TrackingEvent[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<{ category_id?: string; status?: EventStatus; search?: string }>(() => ({
    status: getInitialStatus(location.search),
  }))
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<TrackingEvent | null>(null)

  const loadData = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const { data, count } = await getEvents({ projectId, ...filters, search: debouncedSearch || undefined, page })
      setEvents(data)
      setTotal(count)
    } catch (error: unknown) {
      message.error(formatError(error))
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, projectId, page, filters])

  // Initial and filter-driven fetching intentionally updates page state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    if (projectId) {
      getCategories(projectId).then(setCategories).catch(() => {})
    }
  }, [projectId])

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
      await createEvent({ project_id: projectId!, ...values })
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
    } catch (error: unknown) {
      message.error(formatError(error))
    }
  }

  const columns: ColumnsType<TrackingEvent> = [
    {
      title: '事件', key: 'event', width: 210,
      render: (_: unknown, record: TrackingEvent) => (
        <div className="management-identity">
          <Text strong ellipsis={{ tooltip: record.display_name }}>{record.display_name}</Text>
          <Text code ellipsis={{ tooltip: record.name }}>{record.name}</Text>
        </div>
      ),
    },
    {
      title: '分类', dataIndex: ['categories', 'name'], key: 'category', width: 100,
      render: (name: string | undefined) => name || '-',
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 78,
      render: (status: EventStatus) => <StatusBadge status={status} type="event" />,
    },
    { title: '业务说明', dataIndex: 'description', key: 'description', width: 180, ellipsis: true, className: 'event-list-secondary-column', render: (value: string | null) => value || '-' },
    {
      title: '平台', key: 'platforms', width: 120, className: 'event-list-secondary-column',
      render: (_: unknown, record: TrackingEvent) => {
        const labels = (record.platforms || []).map((platform) => (
          PLATFORM_OPTIONS.find((option) => option.value === platform)?.label || platform
        ))
        return labels.length > 0 ? labels.join(' / ') : '-'
      },
    },
    {
      title: '更新时间', dataIndex: 'updated_at', key: 'updated_at', width: 150,
      render: (val: string) => val ? new Date(val).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作', key: 'actions', width: 110,
      render: (_, record) => {
        const menuItems: MenuProps['items'] = [
            { key: 'edit', icon: <EditOutlined />, label: '编辑' },
            { type: 'divider' as const },
            {
              key: 'delete',
              icon: <DeleteOutlined />,
              label: <Popconfirm title="确定删除？关联属性会一并删除" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消" onPopupClick={(e) => e.stopPropagation()}>
                删除
              </Popconfirm>,
              danger: true,
            },
          ]
        return (
          <Space size="small" onClick={(e) => e.stopPropagation()}>
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/events/${record.id}`)}>
              查看
            </Button>
            <Dropdown menu={{
              items: menuItems,
              onClick: ({ key, domEvent }) => {
                domEvent.stopPropagation()
                if (key === 'edit') handleEdit(record)
              },
            }} trigger={['click']}>
              <Tooltip title="更多操作">
                <Button type="text" size="small" icon={<MoreOutlined />} aria-label="更多操作" onClick={(e) => e.preventDefault()} />
              </Tooltip>
            </Dropdown>
          </Space>
        )
      },
    },
  ]

  return (
    <div>
      <div className="management-page-header">
        <h2>事件管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>创建事件</Button>
      </div>
      <Card>
        <div className="management-filter-bar">
          <Input
            placeholder="搜索事件名/显示名"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 240 }}
            value={searchInput}
            onChange={(e) => { setSearchInput(e.target.value); setPage(1) }}
          />
          <Select
            placeholder="按分类筛选"
            allowClear
            style={{ width: 160 }}
            value={filters.category_id}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(val) => { setFilters((f) => ({ ...f, category_id: val })); setPage(1) }}
          />
          <Select
            placeholder="按状态筛选"
            allowClear
            style={{ width: 120 }}
            value={filters.status}
            options={EVENT_STATUS_OPTIONS}
            onChange={(val) => { setFilters((f) => ({ ...f, status: val })); setPage(1) }}
          />
          {(searchInput || filters.category_id || filters.status) ? (
            <Button onClick={() => {
              setSearchInput('')
              setFilters({})
              setPage(1)
            }}>重置</Button>
          ) : null}
          <Text type="secondary">共 {total} 个事件</Text>
        </div>
        <div className="event-list-table-scroll">
          <ResizableTable
            resizeKey="events-v2"
            columns={columns}
            dataSource={events}
            rowKey="id"
            loading={loading}
            onRow={(record) => ({
              onClick: () => navigate(`/events/${record.id}`),
              onKeyDown: (event) => {
                if (event.currentTarget !== event.target) return
                if (event.key === 'Enter' || event.key === ' ') navigate(`/events/${record.id}`)
              },
              role: 'link',
              tabIndex: 0,
              style: { cursor: 'pointer' },
            })}
            pagination={{
              current: page,
              pageSize: 20,
              total,
              onChange: (p) => setPage(p),
              showTotal: (t) => `共 ${t} 个事件`,
            }}
            size="middle"
            locale={{ emptyText: <EmptyState scene="no_data" itemName="事件" onAction={handleCreate} actionLabel="创建事件" /> }}
          />
        </div>
      </Card>

      <EventFormModal
        open={modalOpen}
        editingRecord={editingRecord}
        projectId={projectId!}
        onSubmit={handleSubmit}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  )
}
