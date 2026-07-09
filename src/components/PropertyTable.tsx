import { useState } from 'react'
import { Button, Space, Modal, Form, Input, Select, Switch, Popconfirm, message, Tooltip, Tag } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { PropertyType, Platform } from '../types'
import { PLATFORM_OPTIONS } from '../types'
import PropertyTypeTag, { usePropertyTypeOptions } from './PropertyTypeTag'
import EmptyState from './EmptyState'
import ResizableTable from './ResizableTable'

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
  const [form] = Form.useForm()

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
    } catch (err: any) {
      if (err.message) message.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await onDelete(id)
      message.success('删除成功')
    } catch (err: any) {
      message.error(err.message)
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
      title: '操作', key: 'actions', width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)} />
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
          添加属性
        </Button>
      </div>
      <ResizableTable
        resizeKey={resizeKey}
        columns={columns}
        dataSource={dataSource}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="middle"
        locale={{ emptyText: <EmptyState scene="no_data" itemName="属性" onAction={handleOpenCreate} actionLabel="添加属性" /> }}
      />
      <Modal
        title={editingRecord ? '编辑属性' : '添加属性'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="属性名" rules={[{ required: true, message: '请输入属性名' }]}>
            <Input placeholder="如 user_id, page_url（英文标识）" />
          </Form.Item>
          <Form.Item name="display_name" label="显示名">
            <Input placeholder="如 用户ID, 页面URL（中文显示）" />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select options={typeOptions} />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <TextArea rows={2} placeholder="属性说明" />
          </Form.Item>
          {showRequired && (
            <Form.Item name="required" label="是否必填" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
          <Form.Item name="example_value" label="示例值">
            <Input placeholder="示例值" />
          </Form.Item>
          <Form.Item name="platforms" label="目标平台">
            <Select
              mode="multiple"
              placeholder="选择平台"
              allowClear
              options={PLATFORM_OPTIONS.map(p => ({ value: p.value, label: p.label }))}
            />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <TextArea rows={2} placeholder="补充说明" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
