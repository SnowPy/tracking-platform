import { useEffect, useState } from 'react'
import { Card, Button, Modal, Form, Input, TreeSelect, Space, message, Popconfirm, Table } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../api/categories'
import type { Category } from '../../types'
import { useProjectStore } from '../../stores/projectStore'

export default function CategoryPage() {
  const projectId = useProjectStore((s) => s.currentProjectId)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<Category | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const loadCategories = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await getCategories(projectId)
      setCategories(data)
    } catch (err: any) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCategories() }, [projectId])

  const handleOpenCreate = () => {
    setEditingRecord(null)
    form.resetFields()
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
    } catch (err: any) {
      if (err.message) message.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id)
      message.success('删除成功')
      await loadCategories()
    } catch (err: any) {
      message.error(err.message)
    }
  }

  const treeData = categories.map((c) => ({
    value: c.id,
    title: c.name,
    label: c.name,
  }))

  const columns = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description', render: (v: string | null) => v || '-' },
    { title: '排序', dataIndex: 'sort_order', key: 'sort_order' },
    {
      title: '操作', key: 'actions', width: 160,
      render: (_: unknown, record: Category) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleOpenEdit(record)} />
          <Popconfirm title="确定删除？子分类也会受影响" onConfirm={() => handleDelete(record.id)} okText="确定" cancelText="取消">
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>事件分类</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>添加分类</Button>
      </div>
      <Card>
        <Table columns={columns} dataSource={categories} rowKey="id" loading={loading} pagination={false} />
      </Card>

      <Modal
        title={editingRecord ? '编辑分类' : '添加分类'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="分类名称" rules={[{ required: true, message: '请输入分类名称' }]}>
            <Input placeholder="如 用户行为、页面浏览" />
          </Form.Item>
          <Form.Item name="parent_id" label="父分类">
            <TreeSelect treeData={treeData} placeholder="留空为顶级分类" allowClear />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="分类描述（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
