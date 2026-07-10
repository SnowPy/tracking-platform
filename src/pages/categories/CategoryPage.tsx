import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Form, Input, InputNumber, message, Modal, Popconfirm, Space, Tooltip, TreeSelect } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../api/categories'
import type { Category } from '../../types'
import { useProjectStore } from '../../stores/projectStore'
import ResizableTable from '../../components/ResizableTable'
import EmptyState from '../../components/EmptyState'
import { formatError } from '../../utils/errors'

interface CategoryNode extends Category {
  children?: CategoryNode[]
}

interface ParentOption {
  value: string
  title: string
  disabled: boolean
  children?: ParentOption[]
}

function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const nodeMap = new Map(categories.map((category) => [category.id, { ...category, children: [] as CategoryNode[] }]))
  const roots: CategoryNode[] = []

  categories.forEach((category) => {
    const node = nodeMap.get(category.id)!
    const parent = category.parent_id ? nodeMap.get(category.parent_id) : undefined
    if (parent) parent.children!.push(node)
    else roots.push(node)
  })

  const removeEmptyChildren = (nodes: CategoryNode[]): CategoryNode[] => nodes.map((node) => ({
    ...node,
    children: node.children?.length ? removeEmptyChildren(node.children) : undefined,
  }))
  return removeEmptyChildren(roots)
}

function buildParentOptions(nodes: CategoryNode[], editingId?: string, disabledBranch = false): ParentOption[] {
  return nodes.map((node) => {
    const disabled = disabledBranch || node.id === editingId
    return {
      value: node.id,
      title: node.name,
      disabled,
      children: node.children ? buildParentOptions(node.children, editingId, disabled) : undefined,
    }
  })
}

export default function CategoryPage() {
  const projectId = useProjectStore((s) => s.currentProjectId)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<Category | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const loadCategories = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await getCategories(projectId)
      setCategories(data)
    } catch (error: unknown) {
      message.error(formatError(error))
    } finally {
      setLoading(false)
    }
  }, [projectId])

  // Initial and project-driven fetching intentionally updates page state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadCategories() }, [loadCategories])

  const handleOpenCreate = () => {
    setEditingRecord(null)
    form.resetFields()
    form.setFieldsValue({ sort_order: 0 })
    setModalOpen(true)
  }

  const handleOpenEdit = (record: Category) => {
    setEditingRecord(record)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      if (editingRecord) {
        await updateCategory(editingRecord.id, values)
        message.success('更新成功')
      } else {
        await createCategory({ project_id: projectId!, ...values })
        message.success('创建成功')
      }
      setModalOpen(false)
      await loadCategories()
    } catch (error: unknown) {
      if (!(error && typeof error === 'object' && 'errorFields' in error)) message.error(formatError(error))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id)
      message.success('删除成功')
      await loadCategories()
    } catch (error: unknown) {
      message.error(formatError(error))
    }
  }

  const categoryTree = buildCategoryTree(categories)
  const treeData = buildParentOptions(categoryTree, editingRecord?.id)

  const columns: ColumnsType<CategoryNode> = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description', render: (v: string | null) => v || '-' },
    { title: '排序', dataIndex: 'sort_order', key: 'sort_order' },
    {
      title: '操作', key: 'actions', width: 96, fixed: 'right',
      render: (_: unknown, record: CategoryNode) => (
        <Space>
          <Tooltip title="编辑分类">
            <Button type="text" size="small" icon={<EditOutlined />} aria-label={`编辑分类 ${record.name}`} onClick={() => handleOpenEdit(record)} />
          </Tooltip>
          <Popconfirm title="确定删除？子分类也会受影响" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
            <Tooltip title="删除分类">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label={`删除分类 ${record.name}`} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div className="management-page-header">
        <h2>事件分类</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>添加分类</Button>
      </div>
      <Card>
        <ResizableTable
          resizeKey="categories-v2"
          columns={columns}
          dataSource={categoryTree}
          rowKey="id"
          loading={loading}
          pagination={false}
          scroll={{ x: 640 }}
          locale={{ emptyText: <EmptyState scene="no_data" itemName="分类" onAction={handleOpenCreate} actionLabel="添加分类" /> }}
        />
      </Card>

      <Modal
        title={editingRecord ? '编辑分类' : '添加分类'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        okText={editingRecord ? '保存修改' : '添加分类'}
        cancelText="取消"
        destroyOnHidden
        forceRender
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}>
            <Input placeholder="如 用户行为、页面浏览" />
          </Form.Item>
          <Form.Item name="parent_id" label="父分类">
            <TreeSelect treeData={treeData} placeholder="留空为顶级分类" allowClear treeDefaultExpandAll />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="分类描述（可选）" />
          </Form.Item>
          <Form.Item name="sort_order" label="排序">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
