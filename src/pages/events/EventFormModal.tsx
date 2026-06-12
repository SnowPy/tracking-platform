import { useEffect, useState } from 'react'
import { Modal, Form, Input, Select, TreeSelect, message } from 'antd'
import { getCategories } from '../../api/categories'
import type { TrackingEvent, Category, EventStatus } from '../../types'

const { TextArea } = Input

interface EventFormModalProps {
  open: boolean
  editingRecord: TrackingEvent | null
  onSubmit: (values: {
    name: string
    display_name: string
    category_id?: string | null
    description?: string
    status: EventStatus
  }) => Promise<void>
  onCancel: () => void
}

export default function EventFormModal({ open, editingRecord, onSubmit, onCancel }: EventFormModalProps) {
  const [form] = Form.useForm()
  const [categories, setCategories] = useState<Category[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      getCategories().then(setCategories).catch(() => {})
      if (editingRecord) {
        form.setFieldsValue(editingRecord)
      } else {
        form.resetFields()
        form.setFieldsValue({ status: 'draft' })
      }
    }
  }, [open, editingRecord, form])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      await onSubmit(values)
      form.resetFields()
    } catch (err: any) {
      if (err.message) message.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const categoryTree = categories.map((c) => ({ value: c.id, title: c.name, label: c.name }))

  return (
    <Modal
      title={editingRecord ? '编辑事件' : '创建事件'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={submitting}
      destroyOnClose
      width={560}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="name" label="事件标识" rules={[
          { required: true, message: '请输入事件标识' },
          { pattern: /^[a-z][a-z0-9_]*$/, message: '请使用小写字母、数字、下划线，且以字母开头' },
        ]}>
          <Input placeholder="如 page_view, button_click" />
        </Form.Item>
        <Form.Item name="display_name" label="显示名称" rules={[{ required: true, message: '请输入显示名称' }]}>
          <Input placeholder="如 页面浏览、按钮点击" />
        </Form.Item>
        <Form.Item name="category_id" label="分类">
          <TreeSelect treeData={categoryTree} placeholder="选择分类" allowClear />
        </Form.Item>
        <Form.Item name="status" label="状态" rules={[{ required: true }]}>
          <Select options={[
            { value: 'draft', label: '草稿' },
            { value: 'active', label: '启用' },
            { value: 'deprecated', label: '废弃' },
          ]} />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <TextArea rows={3} placeholder="事件描述：触发时机、业务场景等" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
