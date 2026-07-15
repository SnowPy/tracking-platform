import { useCallback, useEffect, useState } from 'react'
import { Button, Card, ColorPicker, Form, Input, InputNumber, message, Modal, Popconfirm, Space, Tooltip } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { getPropertyTypes, createPropertyType, updatePropertyType, deletePropertyType } from '../../api/propertyTypes'
import type { PropertyTypeConfig } from '../../types'
import { useProjectStore } from '../../stores/projectStore'
import ResizableTable from '../../components/ResizableTable'
import { formatError } from '../../utils/errors'
import { invalidatePropertyTypes } from '../../hooks/usePropertyTypes'

export default function PropertyTypePage() {
  const projectId = useProjectStore((s) => s.currentProjectId)
  const [types, setTypes] = useState<PropertyTypeConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PropertyTypeConfig | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try { setTypes(await getPropertyTypes(projectId)) } catch (error: unknown) { message.error(formatError(error)) }
    finally { setLoading(false) }
  }, [projectId])

  // Initial and project-driven fetching intentionally updates page state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  const openCreate = () => { setEditing(null); form.resetFields(); form.setFieldsValue({ color: '#1677ff', sort_order: types.length }); setModalOpen(true) }
  const openEdit = (r: PropertyTypeConfig) => { setEditing(r); form.setFieldsValue(r); setModalOpen(true) }

  const handleSubmit = async () => {
    const values = await form.validateFields()
    setSubmitting(true)
    try {
      if (editing) { await updatePropertyType(editing.id, projectId!, values); message.success('已更新') }
      else { await createPropertyType({ project_id: projectId!, ...values }); message.success('已创建') }
      await invalidatePropertyTypes(projectId!)
      setModalOpen(false)
      await load()
    } catch (error: unknown) { message.error(formatError(error)) }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string) => {
    try { await deletePropertyType(id, projectId!); await invalidatePropertyTypes(projectId!); message.success('已删除'); await load() }
    catch (error: unknown) { message.error(formatError(error)) }
  }

  return (
    <div>
      <div className="management-page-header">
        <h2>属性类型管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>添加类型</Button>
      </div>
      <Card>
        <ResizableTable resizeKey="property-types-v2" dataSource={types} rowKey="id" loading={loading} pagination={false} size="middle"
          columns={[
            { title: '标识', dataIndex: 'value', key: 'value', width: 180, render: (v: string) => <code>{v}</code> },
            { title: '显示名', dataIndex: 'label', key: 'label', width: 160 },
            { title: '颜色', dataIndex: 'color', key: 'color', width: 120, render: (c: string) => <Space><div style={{ width: 20, height: 20, borderRadius: 4, background: c }} /><code>{c}</code></Space> },
            { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 80 },
            {
              title: '操作', key: 'actions', width: 96, fixed: 'right' as const,
              render: (_: unknown, r: PropertyTypeConfig) => (
                <Space>
                  <Tooltip title="编辑类型">
                    <Button type="text" size="small" icon={<EditOutlined />} aria-label={`编辑类型 ${r.value}`} onClick={() => openEdit(r)} />
                  </Tooltip>
                  <Popconfirm title="确定删除此类型？" description="仍在使用该标识的属性将失去类型配置。" onConfirm={() => handleDelete(r.id)} okText="确定删除" cancelText="取消">
                    <Tooltip title="删除类型">
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label={`删除类型 ${r.value}`} />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
          scroll={{ x: 700 }}
        />
      </Card>
      <Modal
        title={editing ? '编辑类型' : '添加类型'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { if (!submitting) setModalOpen(false) }}
        confirmLoading={submitting}
        okText={editing ? '保存修改' : '添加类型'}
        cancelText="取消"
        mask={{ closable: !submitting }}
        closable={!submitting}
        keyboard={!submitting}
        cancelButtonProps={{ disabled: submitting }}
        destroyOnHidden
        forceRender
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="value" label="类型标识" rules={[{ required: true }, { pattern: /^[a-z][a-z0-9_]*$/, message: '小写字母开头' }]}>
            <Input placeholder="如 string, int64" />
          </Form.Item>
          <Form.Item name="label" label="显示名" rules={[{ required: true }]}>
            <Input placeholder="如 string, 数字" />
          </Form.Item>
          <Form.Item name="color" label="标签颜色" getValueFromEvent={(color) => color.toHexString()}>
            <ColorPicker showText />
          </Form.Item>
          <Form.Item name="sort_order" label="排序">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
