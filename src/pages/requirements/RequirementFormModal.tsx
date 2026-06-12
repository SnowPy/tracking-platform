import { useEffect, useState, useCallback } from 'react'
import { Modal, Form, Input, Select, Button, Space, Radio, Tag, Divider, message, Switch } from 'antd'
import { PlusOutlined, MinusCircleOutlined, CheckOutlined, EditOutlined, DeleteOutlined, CloseOutlined } from '@ant-design/icons'
import { getEvents } from '../../api/events'
import { getEventProperties } from '../../api/eventProperties'
import { getVersions } from '../../api/versions'
import { supabase } from '../../supabase/client'
import type { ProposedProperty, PropertyAction, TrackingEvent, EventProperty, Platform } from '../../types'
import { PLATFORM_OPTIONS } from '../../types'
import PropertyTypeTag, { usePropertyTypeOptions } from '../../components/PropertyTypeTag'

const { TextArea } = Input

interface RequirementFormModalProps {
  open: boolean
  editingValues?: {
    title?: string
    description?: string
    event_name?: string
    event_id?: string | null
    modification_type?: 'new' | 'modify'
    proposed_properties?: ProposedProperty[]
    priority?: string
    version?: string | null
    platforms?: Platform[]
    trigger_timing?: string | null
  } | null
  onSubmit: (values: {
    title: string
    description?: string
    event_name?: string
    event_id?: string | null
    modification_type: 'new' | 'modify'
    proposed_properties: ProposedProperty[]
    priority: string
    version?: string | null
    platforms?: Platform[]
    trigger_timing?: string | null
  }) => Promise<void>
  onCancel: () => void
}

export default function RequirementFormModal({ open, editingValues, onSubmit, onCancel }: RequirementFormModalProps) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [modType, setModType] = useState<'new' | 'modify'>('new')
  const [existingEvents, setExistingEvents] = useState<TrackingEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [existingProperties, setExistingProperties] = useState<EventProperty[]>([])
  const [propActions, setPropActions] = useState<Record<string, PropertyAction>>({})       // existing_id → action
  const [propModifications, setPropModifications] = useState<Record<string, Partial<EventProperty>>>({}) // existing_id → new values
  const [newProperties, setNewProperties] = useState<ProposedProperty[]>([])
  const [checkingName, setCheckingName] = useState(false)
  const [existingVersions, setExistingVersions] = useState<string[]>([])
  const typeOptions = usePropertyTypeOptions()

  // 异步校验事件名
  const checkEventName = useCallback(async (_: any, value: string) => {
    if (!value || modType !== 'new') return
    setCheckingName(true)
    try {
      const { data } = await supabase.from('events').select('name').eq('name', value).maybeSingle()
      if (data) return Promise.reject(new Error(`事件名「${value}」已存在`))
    } finally {
      setCheckingName(false)
    }
  }, [modType])

  useEffect(() => {
    if (open) {
      getEvents({ page: 1 }).then(({ data }) => setExistingEvents(data)).catch(() => {})
      // 加载已有版本号列表
      getVersions().then(vs => setExistingVersions(vs.map(v => v.name))).catch(() => {})
      if (editingValues) {
        form.setFieldsValue(editingValues)
        setModType(editingValues.modification_type || 'new')
        setSelectedEventId(editingValues.event_id || null)
        if (editingValues.event_id && editingValues.modification_type === 'modify') {
          loadExistingProperties(editingValues.event_id)
        }
        // 加载已有的 proposed_properties 到 newProperties
        if (editingValues.proposed_properties) {
          setNewProperties(editingValues.proposed_properties.filter(p => p.action !== 'modify' && p.action !== 'delete'))
          const actions: Record<string, PropertyAction> = {}
          const mods: Record<string, Partial<EventProperty>> = {}
          editingValues.proposed_properties.forEach(p => {
            if (p.existing_id && p.action) actions[p.existing_id] = p.action
            if (p.existing_id && p.action === 'modify') mods[p.existing_id] = {
              name: p.name, display_name: p.display_name, type: p.type as any,
              description: p.description, required: p.required,
            }
          })
          setPropActions(actions)
          setPropModifications(mods)
        }
      } else {
        form.resetFields()
        form.setFieldsValue({ priority: 'medium', modification_type: 'new' })
        setModType('new')
        setSelectedEventId(null)
        setExistingProperties([])
        setPropActions({})
        setPropModifications({})
        setNewProperties([])
      }
    }
  }, [open, editingValues, form])

  const loadExistingProperties = async (eventId: string) => {
    try {
      const props = await getEventProperties(eventId)
      setExistingProperties(props)
      setPropActions({})
      setPropModifications({})
    } catch { message.error('加载事件属性失败') }
  }

  // 切换修改类型
  const handleModTypeChange = (type: 'new' | 'modify') => {
    setModType(type)
    if (type === 'new') {
      setSelectedEventId(null)
      setExistingProperties([])
      form.setFieldsValue({ event_id: null })
    }
  }

  // 选中已有事件
  const handleEventSelect = (eventId: string) => {
    setSelectedEventId(eventId)
    loadExistingProperties(eventId)
  }

  // 对已有属性的操作
  const setPropAction = (existingId: string, action: PropertyAction) => {
    setPropActions(prev => ({ ...prev, [existingId]: action }))
    if (action === 'keep') {
      setPropModifications(prev => { const n = { ...prev }; delete n[existingId]; return n })
    }
  }

  const updatePropMod = (existingId: string, field: string, value: any) => {
    setPropActions(prev => ({ ...prev, [existingId]: 'modify' }))
    setPropModifications(prev => ({
      ...prev,
      [existingId]: { ...(prev[existingId] || {}), [field]: value },
    }))
  }

  // 新增属性
  const addNewProp = () => {
    setNewProperties(prev => [...prev, { name: '', display_name: '', type: 'string', description: '', required: false }])
  }

  const updateNewProp = (index: number, field: string, value: any) => {
    setNewProperties(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }

  const removeNewProp = (index: number) => {
    setNewProperties(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      // 组装 proposed_properties
      const allProps: ProposedProperty[] = []

      // 已有属性（modified/deleted）
      existingProperties.forEach(ep => {
        const action = propActions[ep.id] || 'keep'
        if (action === 'delete') {
          allProps.push({ name: ep.name, type: ep.type as any, description: ep.description || '', required: ep.required, action: 'delete', existing_id: ep.id })
        } else if (action === 'modify') {
          const mod = propModifications[ep.id] || {}
          allProps.push({
            name: (mod as any).name || ep.name,
            display_name: (mod as any).display_name !== undefined ? (mod as any).display_name : (ep.display_name || ''),
            type: (mod as any).type || ep.type,
            description: (mod as any).description !== undefined ? (mod as any).description : (ep.description || ''),
            required: (mod as any).required !== undefined ? (mod as any).required : ep.required,
            action: 'modify',
            existing_id: ep.id,
          })
        }
      })

      // 新增属性
      newProperties.filter(p => p.name.trim()).forEach(p => {
        allProps.push({ ...p, action: 'add' })
      })

      if (modType === 'modify') {
        values.event_id = selectedEventId
        const selected = existingEvents.find(e => e.id === selectedEventId)
        values.event_name = selected?.name || values.event_name
      } else {
        values.event_id = null
      }

      await onSubmit({ ...values, proposed_properties: allProps })
      form.resetFields()
    } catch (err: any) {
      if (err.message && err.message !== 'VALIDATE_FAILED') message.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={editingValues ? '编辑需求' : '提交埋点需求'}
      open={open}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={submitting}
      destroyOnClose
      width={700}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}
        onValuesChange={(changed) => {
          if (changed.modification_type !== undefined) handleModTypeChange(changed.modification_type)
        }}
      >
        <Form.Item name="title" label="需求标题" rules={[{ required: true, message: '请输入需求标题' }]}>
          <Input placeholder="如：新增商品详情页浏览埋点" />
        </Form.Item>
        <Form.Item name="description" label="业务场景描述">
          <TextArea rows={2} placeholder="描述业务场景：希望追踪什么行为、用于什么分析目的" />
        </Form.Item>

        <Form.Item name="modification_type" label="需求类型" rules={[{ required: true }]}>
          <Radio.Group>
            <Radio value="new">新增事件</Radio>
            <Radio value="modify">修改已有事件</Radio>
          </Radio.Group>
        </Form.Item>

        {modType === 'new' ? (
          <Form.Item
            name="event_name"
            label="建议事件名"
            rules={[
              { required: true, message: '请输入建议事件名' },
              { pattern: /^[a-z][a-z0-9_]*$/, message: '小写字母开头，仅字母数字下划线' },
              { validator: checkEventName },
            ]}
            validateTrigger="onBlur"
          >
            <Input placeholder="如 product_detail_view" suffix={checkingName ? '校验中...' : null} />
          </Form.Item>
        ) : (
          <Form.Item name="event_id" label="选择事件" rules={[{ required: true, message: '请选择要修改的事件' }]}>
            <Select
              showSearch
              placeholder="搜索选择已有事件"
              optionFilterProp="label"
              onChange={(id) => handleEventSelect(id)}
              options={existingEvents.map((e) => ({
                value: e.id,
                label: `${e.name} (${e.display_name})`,
              }))}
            />
          </Form.Item>
        )}

        <Form.Item name="priority" label="优先级" rules={[{ required: true }]}>
          <Select options={[
            { value: 'high', label: '高' },
            { value: 'medium', label: '中' },
            { value: 'low', label: '低' },
          ]} />
        </Form.Item>

        <Form.Item name="version" label="版本号">
          <Select
            showSearch
            allowClear
            placeholder="选择版本号"
            filterOption={(input, option) => (option?.label as string || '').toLowerCase().includes(input.toLowerCase())}
            options={existingVersions.map(v => ({ value: v, label: v }))}
          />
        </Form.Item>

        <Form.Item name="platforms" label="目标平台">
          <Select
            mode="multiple"
            placeholder="选择平台"
            allowClear
            options={PLATFORM_OPTIONS.map(p => ({ value: p.value, label: p.label }))}
            dropdownRender={(menu) => (
              <>
                <div style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>
                  <Space>
                    <Button size="small" type="link" onClick={() => {
                      const allValues = PLATFORM_OPTIONS.map(p => p.value)
                      form.setFieldValue('platforms', allValues)
                    }}>全选</Button>
                    <Button size="small" type="link" onClick={() => {
                      form.setFieldValue('platforms', [])
                    }}>清空</Button>
                  </Space>
                </div>
                {menu}
              </>
            )}
          />
        </Form.Item>

        <Form.Item name="trigger_timing" label="触发时机">
          <TextArea rows={2} placeholder="如：用户点击商品卡片时触发" />
        </Form.Item>

        {/* ====== 已有属性管理（修改模式） ====== */}
        {modType === 'modify' && selectedEventId && existingProperties.length > 0 && (
          <>
            <Divider plain style={{ fontSize: 13, marginTop: 16 }}>已有属性</Divider>
            <div style={{ marginBottom: 12, fontSize: 12, color: '#999' }}>
              点击操作按钮标记：保留 / 修改 / 删除。默认保留。
            </div>
            {existingProperties.map((ep) => {
              const action = propActions[ep.id] || 'keep'
              const mod = propModifications[ep.id]
              return (
                <div key={ep.id} style={{
                  border: '1px solid #f0f0f0',
                  borderRadius: 6,
                  padding: 10,
                  marginBottom: 8,
                  background: action === 'delete' ? '#fff1f0' : action === 'modify' ? '#fffbe6' : '#fff',
                }}>
                  {/* 头部：属性名 + 操作按钮 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: action === 'modify' ? 8 : 0 }}>
                    <Space size={4}>
                      <code style={{ fontWeight: 500 }}>{ep.name}</code>
                      {ep.display_name && <Tag style={{ fontSize: 11 }}>{ep.display_name}</Tag>}
                      <PropertyTypeTag type={ep.type as any} />
                      {ep.required && <Tag color="red" style={{ fontSize: 11 }}>必填</Tag>}
                    </Space>
                    <Space size={4}>
                      <Button size="small" type={action === 'keep' ? 'primary' : 'default'}
                        icon={<CheckOutlined />} onClick={() => setPropAction(ep.id, 'keep')}>保留</Button>
                      <Button size="small" type={action === 'modify' ? 'primary' : 'default'}
                        icon={<EditOutlined />} onClick={() => {
                          setPropAction(ep.id, 'modify')
                          setPropModifications(prev => ({
                            ...prev,
                            [ep.id]: { name: ep.name, display_name: ep.display_name, type: ep.type, description: ep.description || '', required: ep.required },
                          }))
                        }}>修改</Button>
                      <Button size="small" danger={action === 'delete'} type={action === 'delete' ? 'primary' : 'default'}
                        icon={action === 'delete' ? <CloseOutlined /> : <DeleteOutlined />}
                        onClick={() => setPropAction(ep.id, action === 'delete' ? 'keep' : 'delete')}>
                        {action === 'delete' ? '已标记删除' : '删除'}
                      </Button>
                    </Space>
                  </div>

                  {/* 修改表单 */}
                  {action === 'modify' && (
                    <div style={{ marginTop: 8, padding: '8px 12px', background: '#fff', borderRadius: 4, border: '1px dashed #faad14' }}>
                      <Space wrap size={[8, 4]}>
                        <div>
                          <span style={{ fontSize: 11, color: '#999' }}>属性名</span>
                          <Input size="small" style={{ width: 100 }} value={mod?.name || ''}
                            onChange={e => updatePropMod(ep.id, 'name', e.target.value)} />
                        </div>
                        <div>
                          <span style={{ fontSize: 11, color: '#999' }}>显示名</span>
                          <Input size="small" style={{ width: 100 }} value={(mod as any)?.display_name || ''}
                            onChange={e => updatePropMod(ep.id, 'display_name', e.target.value)} />
                        </div>
                        <div>
                          <span style={{ fontSize: 11, color: '#999' }}>类型</span>
                          <Select size="small" style={{ width: 90 }} value={mod?.type || ep.type}
                            onChange={v => updatePropMod(ep.id, 'type', v)} options={typeOptions} />
                        </div>
                        <div>
                          <span style={{ fontSize: 11, color: '#999' }}>说明</span>
                          <Input size="small" style={{ width: 120 }} value={(mod as any)?.description || ''}
                            onChange={e => updatePropMod(ep.id, 'description', e.target.value)} />
                        </div>
                        <div>
                          <span style={{ fontSize: 11, color: '#999' }}>必填</span>
                          <Switch size="small" checked={(mod as any)?.required !== undefined ? (mod as any)?.required : ep.required}
                            onChange={v => updatePropMod(ep.id, 'required', v)} />
                        </div>
                      </Space>
                    </div>
                  )}
                </div>
              )
            })}
          </>
        )}

        {/* ====== 新增属性 ====== */}
        <Divider plain style={{ fontSize: 13, marginTop: 16 }}>
          新增属性 {modType === 'modify' && selectedEventId ? '（将追加到事件）' : ''}
        </Divider>
        {newProperties.map((prop, idx) => (
          <Space key={idx} style={{ display: 'flex', marginBottom: 8, flexWrap: 'wrap' }} align="baseline">
            <Input placeholder="属性名" style={{ width: 100 }} value={prop.name}
              onChange={e => updateNewProp(idx, 'name', e.target.value)} />
            <Input placeholder="显示名" style={{ width: 100 }} value={prop.display_name || ''}
              onChange={e => updateNewProp(idx, 'display_name', e.target.value)} />
            <Select style={{ width: 90 }} value={prop.type}
              onChange={v => updateNewProp(idx, 'type', v)} options={typeOptions} />
            <Input placeholder="说明" style={{ width: 120 }} value={prop.description}
              onChange={e => updateNewProp(idx, 'description', e.target.value)} />
            <Select style={{ width: 70 }} value={prop.required}
              onChange={v => updateNewProp(idx, 'required', v)} options={[
                { value: false, label: '可选' }, { value: true, label: '必填' },
              ]} />
            <MinusCircleOutlined onClick={() => removeNewProp(idx)} style={{ color: '#ff4d4f' }} />
          </Space>
        ))}
        <Button type="dashed" onClick={addNewProp} block icon={<PlusOutlined />}>添加属性</Button>
      </Form>
    </Modal>
  )
}
