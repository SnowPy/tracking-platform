import { useEffect, useState } from 'react'
import { Card, Table, Button, Modal, Form, Input, ColorPicker, Space, Popconfirm, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { getPropertyTypes, createPropertyType, updatePropertyType, deletePropertyType } from '../../api/propertyTypes'
import type { PropertyTypeConfig } from '../../types'
import { useProjectStore } from '../../stores/projectStore'

export default function PropertyTypePage() {
  const projectId = useProjectStore((s) => s.currentProjectId)
  const [types, setTypes] = useState<PropertyTypeConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PropertyTypeConfig | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const load = async () => {
    if (!projectId) return
    setLoading(true)
    try { setTypes(await getPropertyTypes(projectId)) } catch (e: any) { message.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [projectId])

  const openCreate = () => { setEditing(null); form.resetFields(); form.setFieldsValue({ color: '#1677ff' }); setModalOpen(true) }
  const openEdit = (r: PropertyTypeConfig) => { setEditing(r); form.setFieldsValue(r); setModalOpen(true) }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    setSubmitting(true)
    try {
      if (editing) { await updatePropertyType(editing.id, values); message.success('已更新') }
      else { await createPropertyType({ project_id: projectId!, ...values }); message.success('已创建') }
      setModalOpen(false)
      await load()
    } catch (e: any) { message.error(e.message) }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string) => {
    try { await deletePropertyType(id); message.success('已删除'); await load() }
    catch (e: any) { message.error(e.message) }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2>属性类型管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>添加类型</Button>
      </div>
      <Card>
        <Table dataSource={types} rowKey="id" loading={loading} pagination={false} size="middle"
          columns={[
            { title: '标识', dataIndex: 'value', width: 140, render: (v: string) => <code>{v}</code> },
            { title: '显示名', dataIndex: 'label', width: 120 },
            { title: '颜色', dataIndex: 'color', width: 80, render: (c: string) => <div style={{ width: 20, height: 20, borderRadius: 4, background: c }} /> },
            { title: '排序', dataIndex: 'sort_order', width: 60 },
            {
              title: '操作', width: 120,
              render: (_: any, r: PropertyTypeConfig) => (
                <Space>
                  <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
                  <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.id)}>
                    <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>
      <Modal title={editing ? '编辑类型' : '添加类型'} open={modalOpen} onOk={handleSubmit} onCancel={() => setModalOpen(false)} confirmLoading={submitting} destroyOnClose>
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="value" label="类型标识" rules={[{ required: true }, { pattern: /^[a-z][a-z0-9_]*$/, message: '小写字母开头' }]}>
            <Input placeholder="如 string, int64" />
          </Form.Item>
          <Form.Item name="label" label="显示名" rules={[{ required: true }]}>
            <Input placeholder="如 string, 数字" />
          </Form.Item>
          <Form.Item name="color" label="标签颜色">
            <ColorPicker />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
