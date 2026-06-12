import { useState } from 'react'
import { Table, Button, Space, Modal, Form, Input, Select, Switch, Popconfirm, message, Tooltip } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { PropertyType } from '../types'
import PropertyTypeTag, { usePropertyTypeOptions } from './PropertyTypeTag'

const { TextArea } = Input

export interface PropertyItem {
  id: string
  name: string
  display_name?: string | null
  type: PropertyType | string
  description: string | null
  required?: boolean
  example_value: string | null
  sort_order?: number
}

interface PropertyCreateValues {
  name: string
  display_name?: string
  type: string
  description?: string
  required?: boolean
  example_value?: string
}

interface PropertyTableProps {
  dataSource: PropertyItem[]
  loading?: boolean
  showRequired?: boolean
  onCreate: (values: PropertyCreateValues) => Promise<void>
  onUpdate: (id: string, values: Partial<PropertyCreateValues>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export default function PropertyTable({ dataSource, loading, showRequired, onCreate, onUpdate, onDelete }: PropertyTableProps) {
  const typeOptions = usePropertyTypeOptions()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<PropertyItem | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const handleOpenCreate = () => {
    setEditingRecord(null)
    form.resetFields()
    form.setFieldsValue({ type: 'string', required: false })
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
      render: (type: PropertyType) => <PropertyTypeTag type={type} />,
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
      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey="id"
        loading={loading}
        pagination={false}
        size="middle"
        locale={{ emptyText: '暂无属性，点击上方按钮添加' }}
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
        </Form>
      </Modal>
    </>
  )
}
