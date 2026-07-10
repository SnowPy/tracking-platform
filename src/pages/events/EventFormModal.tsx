import { useEffect, useState } from 'react'
import { Divider, Form, Input, message, Modal, Select, TreeSelect } from 'antd'
import { getCategories } from '../../api/categories'
import type { TrackingEvent, Category, EventStatus, Platform } from '../../types'
import { PLATFORM_OPTIONS } from '../../types'
import { formatError } from '../../utils/errors'

const { TextArea } = Input

interface EventFormModalProps {
  open: boolean
  editingRecord: TrackingEvent | null
  projectId: string
  onSubmit: (values: {
    name: string
    display_name: string
    category_id?: string | null
    description?: string
    status: EventStatus
    platforms?: Platform[]
    trigger_timing?: string
    notes?: string
  }) => Promise<void>
  onCancel: () => void
}

interface CategoryTreeOption {
  value: string
  title: string
  children: CategoryTreeOption[]
}

export default function EventFormModal({ open, editingRecord, projectId, onSubmit, onCancel }: EventFormModalProps) {
  const [form] = Form.useForm()
  const [categories, setCategories] = useState<Category[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      getCategories(projectId).then(setCategories).catch(() => {})
      if (editingRecord) {
        form.setFieldsValue({
          ...editingRecord,
          platforms: editingRecord.platforms || [],
        })
      } else {
        form.resetFields()
        form.setFieldsValue({ status: 'draft', platforms: [] })
      }
    }
  }, [open, editingRecord, form, projectId])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      await onSubmit(values)
      form.resetFields()
    } catch (error: unknown) {
      if (!(error && typeof error === 'object' && 'errorFields' in error)) message.error(formatError(error))
    } finally {
      setSubmitting(false)
    }
  }

  const categoryMap = new Map<string, CategoryTreeOption>(categories.map((category) => [category.id, {
    value: category.id,
    title: category.name,
    children: [],
  }]))
  const categoryTree: CategoryTreeOption[] = []
  categories.forEach((category) => {
    const node = categoryMap.get(category.id)!
    const parent = category.parent_id ? categoryMap.get(category.parent_id) : undefined
    if (parent) parent.children.push(node)
    else categoryTree.push(node)
  })

  return (
    <Modal
      title={editingRecord ? '编辑事件' : '创建事件'}
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={submitting}
      okText={editingRecord ? '保存修改' : '创建事件'}
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
          <Form.Item name="display_name" label="显示名称" rules={[{ required: true, message: '请输入显示名称' }]}>
            <Input placeholder="如 页面浏览、按钮点击" />
          </Form.Item>
          <Form.Item name="name" label="事件标识" rules={[
            { required: true, message: '请输入事件标识' },
            { pattern: /^[a-z][a-z0-9_]*$/, message: '请使用小写字母、数字、下划线，且以字母开头' },
          ]}>
            <Input disabled={Boolean(editingRecord)} placeholder="如 page_view, button_click" />
          </Form.Item>
          <Form.Item name="category_id" label="分类">
            <TreeSelect treeData={categoryTree} placeholder="选择分类" allowClear treeDefaultExpandAll />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select options={[
              { value: 'draft', label: '草稿' },
              { value: 'active', label: '启用' },
              { value: 'deprecated', label: '废弃' },
            ]} />
          </Form.Item>
        </div>

        <Divider titlePlacement="start" plain>行为定义</Divider>
        <div className="management-form-grid">
          <Form.Item className="management-form-span-2" name="description" label="业务说明">
            <TextArea rows={2} placeholder="说明事件追踪的业务行为和分析目的" />
          </Form.Item>
          <Form.Item className="management-form-span-2" name="trigger_timing" label="触发时机">
            <TextArea rows={2} placeholder="如：用户点击商品卡片时触发" />
          </Form.Item>
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
  )
}
