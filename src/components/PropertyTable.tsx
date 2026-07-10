import { useMemo, useState } from 'react'
import { Button, Divider, Form, Input, message, Modal, Popconfirm, Select, Space, Switch, Tag, Tooltip } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { PropertyType, Platform } from '../types'
import { PLATFORM_OPTIONS } from '../types'
import PropertyTypeTag, { usePropertyTypeOptions } from './PropertyTypeTag'
import EmptyState from './EmptyState'
import ResizableTable from './ResizableTable'
import { formatError } from '../utils/errors'

const { TextArea } = Input

export interface PropertyItem {
  id: string
  name: string
  display_name?: string | null
  type: PropertyType | string
  description: string | null
  required?: boolean
  example_value: string | null
  platforms?: Platform[]
  notes?: string | null
  sort_order?: number
}

export interface PropertyCreateValues {
  name: string
  display_name?: string
  type: string
  description?: string
  required?: boolean
  example_value?: string
  platforms?: Platform[]
  notes?: string
}

interface PropertyTableProps {
  dataSource: PropertyItem[]
  loading?: boolean
  showRequired?: boolean
  projectId?: string
  resizeKey?: string
  onCreate: (values: PropertyCreateValues) => Promise<void>
  onUpdate: (id: string, values: Partial<PropertyCreateValues>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export default function PropertyTable({ dataSource, loading, showRequired, projectId, resizeKey = 'properties', onCreate, onUpdate, onDelete }: PropertyTableProps) {
  const typeOptions = usePropertyTypeOptions(projectId)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<PropertyItem | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>()
  const [platformFilter, setPlatformFilter] = useState<Platform>()
  const [form] = Form.useForm()

  const filteredData = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return dataSource.filter((property) => {
      const matchesSearch = !keyword || [property.name, property.display_name, property.description]
        .some((value) => value?.toLowerCase().includes(keyword))
      const matchesType = !typeFilter || property.type === typeFilter
      const matchesPlatform = !platformFilter || property.platforms?.includes(platformFilter)
      return matchesSearch && matchesType && matchesPlatform
    })
  }, [dataSource, platformFilter, search, typeFilter])

  const handleOpenCreate = () => {
    setEditingRecord(null)
    form.resetFields()
    form.setFieldsValue({ type: 'string', required: false, platforms: [] })
    setModalOpen(true)
  }

  const handleOpenEdit = (record: PropertyItem) => {
    setEditingRecord(record)
    form.setFieldsValue({
      name: record.name,
      display_name: record.display_name,
      type: record.type,
      description: record.description,
      required: record.required,
      example_value: record.example_value,
      platforms: record.platforms || [],
      notes: record.notes || '',
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      if (editingRecord) {
        await onUpdate(editingRecord.id, values)
        message.success('更新成功')
      } else {
        await onCreate(values)
        message.success('创建成功')
      }
      setModalOpen(false)
    } catch (error: unknown) {
      if (!(error && typeof error === 'object' && 'errorFields' in error)) message.error(formatError(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await onDelete(id)
      message.success('删除成功')
    } catch (error: unknown) {
      message.error(formatError(error))
    }
  }

  const columns: ColumnsType<PropertyItem> = [
    { title: '属性名', dataIndex: 'name', key: 'name', width: 140,
      render: (name: string) => <code style={{ fontSize: 13 }}>{name}</code>,
    },
    { title: '显示名', dataIndex: 'display_name', key: 'display_name', width: 120,
      render: (v: string | null) => v || '-',
    },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 90,
      render: (type: PropertyType) => <PropertyTypeTag type={type} projectId={projectId} />,
    },
    { title: '说明', dataIndex: 'description', key: 'description', ellipsis: true,
      render: (text) => text ? <Tooltip title={text}>{text}</Tooltip> : '-',
    },
    ...(showRequired ? [{
      title: '必填', dataIndex: 'required', key: 'required', width: 60,
      render: (v: boolean) => v ? '是' : '否',
    }] : []),
    {
      title: '示例值', dataIndex: 'example_value', key: 'example_value', width: 110,
      render: (text: string | null) => text || '-',
    },
    {
      title: '平台', dataIndex: 'platforms', key: 'platforms', width: 120,
      render: (platforms: Platform[] | undefined) => (platforms || []).map((p: string) => {
        const opt = PLATFORM_OPTIONS.find(o => o.value === p)
        return <Tag key={p} color={opt?.color} style={{ fontSize: 11 }}>{opt?.label || p}</Tag>
      }),
    },
    {
      title: '备注', dataIndex: 'notes', key: 'notes', width: 120, ellipsis: true,
      render: (text: string | null) => text ? <Tooltip title={text}>{text}</Tooltip> : '-',
    },
    {
      title: '操作', key: 'actions', width: 96, fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="编辑属性">
            <Button type="text" size="small" icon={<EditOutlined />} aria-label={`编辑属性 ${record.name}`} onClick={() => handleOpenEdit(record)} />
          </Tooltip>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
            <Tooltip title="删除属性">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label={`删除属性 ${record.name}`} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div className="management-filter-bar">
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
          添加属性
        </Button>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="搜索属性名、显示名或说明"
          style={{ width: 240 }}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          allowClear
          placeholder="全部类型"
          style={{ width: 130 }}
          value={typeFilter}
          options={typeOptions}
          onChange={setTypeFilter}
        />
        <Select
          allowClear
          placeholder="全部平台"
          style={{ width: 130 }}
          value={platformFilter}
          options={PLATFORM_OPTIONS.map((platform) => ({ value: platform.value, label: platform.label }))}
          onChange={setPlatformFilter}
        />
      </div>
      <ResizableTable
        resizeKey={resizeKey}
        columns={columns}
        dataSource={filteredData}
        rowKey="id"
        loading={loading}
        pagination={{
          pageSize: 10,
          hideOnSinglePage: true,
          showSizeChanger: false,
          showTotal: (total) => `共 ${total} 个属性`,
        }}
        size="middle"
        scroll={{ x: 900 }}
        locale={{ emptyText: <EmptyState scene="no_data" itemName="属性" onAction={handleOpenCreate} actionLabel="添加属性" /> }}
      />
      <Modal
        title={editingRecord ? '编辑属性' : '添加属性'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText={editingRecord ? '保存修改' : '添加属性'}
        cancelText="取消"
        mask={{ closable: !submitting }}
        destroyOnHidden
        forceRender
        width="min(760px, calc(100vw - 32px))"
        styles={{ body: { maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', paddingRight: 12 } }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Divider titlePlacement="start" plain>基础信息</Divider>
          <div className="management-form-grid">
            <Form.Item name="display_name" label="显示名">
              <Input placeholder="如 用户ID、页面URL" />
            </Form.Item>
            <Form.Item name="name" label="属性名" rules={[{ required: true, message: '请输入属性名' }]}>
              <Input disabled={Boolean(editingRecord)} placeholder="如 user_id、page_url" />
            </Form.Item>
            <Form.Item name="type" label="类型" rules={[{ required: true }]}>
              <Select options={typeOptions} />
            </Form.Item>
            <Form.Item name="example_value" label="示例值">
              <Input placeholder="如 vip、42、true" />
            </Form.Item>
          </div>

          <Divider titlePlacement="start" plain>使用定义</Divider>
          <div className="management-form-grid">
            <Form.Item className="management-form-span-2" name="description" label="说明">
              <TextArea rows={2} placeholder="描述属性含义、取值范围或使用场景" />
            </Form.Item>
            {showRequired ? (
              <Form.Item name="required" label="是否必填" valuePropName="checked">
                <Switch checkedChildren="必填" unCheckedChildren="可选" />
              </Form.Item>
            ) : null}
          </div>

          <Divider titlePlacement="start" plain>交付范围</Divider>
          <div className="management-form-grid">
            <Form.Item className="management-form-span-2" name="platforms" label="目标平台">
              <Select
                mode="multiple"
                placeholder="选择平台"
                allowClear
                options={PLATFORM_OPTIONS.map(p => ({ value: p.value, label: p.label }))}
              />
            </Form.Item>
            <Form.Item className="management-form-span-2" name="notes" label="备注">
              <TextArea rows={2} placeholder="补充说明" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </>
  )
}
