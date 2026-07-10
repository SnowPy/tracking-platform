import { useEffect, useState, useCallback } from 'react'
import { Modal, Form, Input, Select, Button, Space, Radio, Divider, message, Alert } from 'antd'
import { ThunderboltOutlined } from '@ant-design/icons'
import { getEvents } from '../../api/events'
import { getEventProperties } from '../../api/eventProperties'
import { getVersions } from '../../api/versions'
import { supabase } from '../../supabase/client'
import type { ProposedProperty, PropertyAction, TrackingEvent, EventProperty, Platform, TrackingType, RequirementType, Requirement } from '../../types'
import { PLATFORM_OPTIONS, TRACKING_TYPE_OPTIONS } from '../../types'
import { usePropertyTypeOptions } from '../../components/PropertyTypeTag'
import { useAiSuggestName } from '../../hooks/useAiSuggestName'
import { fetchSuggestedName } from '../../utils/aiSuggest'
import RequirementPropertyEditor, {
  type PropertyEditorField,
  type PropertyEditorValue,
} from './RequirementPropertyEditor'

const { TextArea } = Input

const TRACKING_TYPE_LABEL: Record<TrackingType, string> = {
  event: '事件',
  common_property: '公共属性',
  user_property: '用户属性',
}

const REQUIREMENT_TYPE_LABEL: Record<RequirementType, string> = {
  new: '新增',
  modify: '修改',
}

interface ExistingPropertyOption {
  id: string
  name: string
  display_name: string | null
  type: EventProperty['type']
  description: string | null
}

interface RequirementFormModalProps {
  open: boolean
  projectId: string
  editingValues?: {
    title?: string
    display_name?: string
    tracking_type?: string
    description?: string
    event_name?: string
    event_id?: string | null
    modification_type?: string
    proposed_properties?: ProposedProperty[]
    priority?: string
    version?: string | null
    platforms?: Platform[]
    trigger_timing?: string | null
  } | null
  copyFrom?: Requirement | null
  onSubmit: (values: {
    title: string
    display_name?: string
    tracking_type?: string
    description?: string
    event_name?: string
    event_id?: string | null
    modification_type: string
    proposed_properties: ProposedProperty[]
    priority: string
    version?: string | null
    platforms?: Platform[]
    trigger_timing?: string | null
  }) => Promise<void>
  onCancel: () => void
}

export default function RequirementFormModal({ open, projectId, editingValues, copyFrom, onSubmit, onCancel }: RequirementFormModalProps) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [trackingType, setTrackingType] = useState<TrackingType>('event')
  const [reqType, setReqType] = useState<RequirementType>('new')
  const [existingEvents, setExistingEvents] = useState<TrackingEvent[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [existingProperties, setExistingProperties] = useState<EventProperty[]>([])
  const [propActions, setPropActions] = useState<Record<string, PropertyAction>>({})
  const [propModifications, setPropModifications] = useState<Record<string, Partial<EventProperty>>>({})
  const [newProperties, setNewProperties] = useState<ProposedProperty[]>([])
  const [generatingPropIndex, setGeneratingPropIndex] = useState<number | null>(null)
  const [generatingModifyId, setGeneratingModifyId] = useState<string | null>(null)
  const [existingVersions, setExistingVersions] = useState<string[]>([])
  const [existingPropList, setExistingPropList] = useState<ExistingPropertyOption[]>([])
  const typeOptions = usePropertyTypeOptions(projectId)
  const isCopyMode = !!copyFrom

  // ─── AI 建议事件名/属性名 ──────────────────────────
  const displayName = Form.useWatch('display_name', form)
  const aiType = trackingType === 'event' ? 'event' as const
    : trackingType === 'common_property' ? 'common_property' as const
    : 'user_property' as const
  const aiSuggest = useAiSuggestName({ type: aiType, debounceMs: 0 })

  // 切换类型时重置 AI
  useEffect(() => {
    aiSuggest.reset()
  }, [trackingType])

  // ─── 标题自动生成 ──────────────────────────────────
  const autoTitle = useCallback((displayName: string) => {
    if (!displayName) return ''
    const modLabel = REQUIREMENT_TYPE_LABEL[reqType]
    const typeLabel = TRACKING_TYPE_LABEL[trackingType]
    return `${modLabel}-${typeLabel}-${displayName}`
  }, [reqType, trackingType])

  // 异步校验事件名
  const checkEventName = useCallback(async (_: any, value: string) => {
    if (!value || reqType !== 'new' || trackingType !== 'event') return
    const { data } = await supabase.from('events').select('name').eq('project_id', projectId).eq('name', value).maybeSingle()
    if (data) return Promise.reject(new Error(`事件名「${value}」已存在`))
  }, [reqType, trackingType, projectId])

  // 打开模态框时初始化表单（仅依赖 open，避免重复触发）
  useEffect(() => {
    if (!open) return
    getEvents({ projectId, page: 1 }).then(({ data }) => setExistingEvents(data)).catch(() => {})
    getVersions(projectId).then(vs => setExistingVersions(vs.map(v => v.name))).catch(() => {})

    if (copyFrom) {
      // ─── 复制模式：预填源需求的所有业务字段 ───
      const copyTrackingType = (copyFrom.tracking_type as TrackingType) || 'event'
      const copyReqType = (copyFrom.modification_type as RequirementType) || 'new'
      if (copyTrackingType !== 'event') loadExistingPropList(copyTrackingType)
      setTrackingType(copyTrackingType)
      setReqType(copyReqType)
      setExistingProperties([])
      setPropActions({})
      setPropModifications({})
      setNewProperties([])
      setExistingPropList([])

      // 处理 event_name：new 模式下加 _copy 后缀避免唯一约束冲突
      let copyEventName = copyFrom.event_name || ''
      if (copyReqType === 'new' && copyEventName) {
        copyEventName = copyEventName + '_copy'
      }

      // 构建预填值
      const prefillValues: Record<string, any> = {
        display_name: copyFrom.display_name || '',
        modification_type: copyReqType,
        description: copyFrom.description || '',
        priority: copyFrom.priority || 'medium',
        version: copyFrom.version || undefined,
        platforms: copyFrom.platforms || [],
        trigger_timing: copyFrom.trigger_timing || '',
      }

      if (copyTrackingType === 'event') {
        if (copyReqType === 'new') {
          prefillValues.event_name = copyEventName
          prefillValues.event_id = null
        } else {
          setSelectedEventId(copyFrom.event_id || null)
          prefillValues.event_id = copyFrom.event_id || undefined
          prefillValues.event_name = copyFrom.event_name || ''
          if (copyFrom.event_id) loadExistingProperties(copyFrom.event_id, false)
        }
      } else {
        // 公共属性 / 用户属性
        const propertyDefinition = copyFrom.proposed_properties?.[0]
        prefillValues.property_type = propertyDefinition?.type || 'string'
        prefillValues.property_description = copyFrom.description || propertyDefinition?.description || ''
        prefillValues.property_required = propertyDefinition?.required || false
        if (copyReqType === 'new') {
          prefillValues.property_name = copyEventName
          prefillValues.event_id = null
        } else {
          setSelectedEventId(copyFrom.event_id || null)
          prefillValues.property_name = copyFrom.event_id || undefined
          prefillValues.event_name = copyFrom.event_name || ''
        }
      }

      // 恢复 proposed_properties
      if (copyFrom.proposed_properties) {
        setNewProperties(copyFrom.proposed_properties.filter(p => p.action !== 'modify' && p.action !== 'delete'))
        const actions: Record<string, PropertyAction> = {}
        const mods: Record<string, Partial<EventProperty>> = {}
        copyFrom.proposed_properties.forEach(p => {
          if (p.existing_id && p.action) actions[p.existing_id] = p.action
          if (p.existing_id && p.action === 'modify') mods[p.existing_id] = {
            name: p.name, display_name: p.display_name, type: p.type as any,
            description: p.description, required: p.required,
          }
        })
        setPropActions(actions)
        setPropModifications(mods)
      }

      setTimeout(() => {
        form.setFieldsValue(prefillValues)
      }, 0)
    } else if (editingValues) {
      const editTrackingType = (editingValues.tracking_type as TrackingType) || 'event'
      if (editTrackingType !== 'event') loadExistingPropList(editTrackingType)
      setTrackingType((editingValues.tracking_type as TrackingType) || 'event')
      setReqType((editingValues.modification_type as RequirementType) || 'new')
      setSelectedEventId(editingValues.event_id || null)
      setExistingProperties([])
      setPropActions({})
      setPropModifications({})
      setNewProperties([])
      setExistingPropList([])

      const editFormValues: Record<string, unknown> = { ...editingValues }
      if (editTrackingType !== 'event') {
        const propertyDefinition = editingValues.proposed_properties?.[0]
        editFormValues.property_name = editingValues.modification_type === 'modify'
          ? editingValues.event_id
          : editingValues.event_name
        editFormValues.property_type = propertyDefinition?.type || 'string'
        editFormValues.property_description = editingValues.description || propertyDefinition?.description || ''
        editFormValues.property_required = propertyDefinition?.required || false
      }

      // 使用 setTimeout 确保状态先更新再填充表单
      setTimeout(() => {
        form.setFieldsValue(editFormValues)
      }, 0)

      if (editingValues.event_id && editingValues.modification_type === 'modify') {
        loadExistingProperties(editingValues.event_id, false)
      }
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
      setTrackingType('event')
      setReqType('new')
      setSelectedEventId(null)
      setExistingProperties([])
      setPropActions({})
      setPropModifications({})
      setNewProperties([])
      setExistingPropList([])
      form.resetFields()
      form.setFieldsValue({ priority: 'medium', modification_type: 'new', tracking_type: 'event' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const loadExistingProperties = async (eventId: string, resetActions = true) => {
    try {
      const props = await getEventProperties(eventId)
      setExistingProperties(props)
      if (resetActions) {
        setPropActions({})
        setPropModifications({})
      }
    } catch (err) { console.error('加载事件属性失败:', err); message.error('加载事件属性失败') }
  }

  // 加载已有属性列表（公共属性/用户属性修改模式）
  const loadExistingPropList = async (type: TrackingType) => {
    if (type === 'event') return
    const table = type === 'common_property' ? 'common_properties' : 'user_properties'
    try {
      const { data } = await supabase
        .from(table)
        .select('id, name, display_name, type, description')
        .eq('project_id', projectId)
        .order('name')
      setExistingPropList((data || []) as ExistingPropertyOption[])
    } catch (err) { console.error('加载已有属性列表失败:', err) }
  }

  // 切换埋点类型 — 重置整个表单为新页面
  const handleTrackingTypeChange = (type: TrackingType) => {
    setTrackingType(type)
    setSelectedEventId(null)
    setExistingProperties([])
    setNewProperties([])
    setPropActions({})
    setPropModifications({})
    setExistingPropList([])
    form.resetFields()
    form.setFieldsValue({ modification_type: reqType, priority: 'medium' })
    if (type !== 'event') loadExistingPropList(type)
  }

  // 切换需求类型
  const handleReqTypeChange = (type: RequirementType) => {
    setReqType(type)
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
    const selected = existingEvents.find(e => e.id === eventId)
    if (selected) {
      form.setFieldsValue({ display_name: selected.display_name })
    }
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

  const startModifyProperty = (property: EventProperty) => {
    setPropAction(property.id, 'modify')
    setPropModifications(prev => {
      if (prev[property.id]) return prev
      return {
        ...prev,
        [property.id]: {
          name: property.name,
          display_name: property.display_name,
          type: property.type,
          description: property.description || '',
          required: property.required,
        },
      }
    })
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

  // AI 生成单个属性的技术名
  const handleGeneratePropName = async (index: number) => {
    const prop = newProperties[index]
    if (!prop.display_name?.trim()) {
      message.warning('请先填写该属性的显示名')
      return
    }
    setGeneratingPropIndex(index)
    try {
      const name = await fetchSuggestedName(prop.display_name, 'event')
      updateNewProp(index, 'name', name)
    } catch (err: any) {
      message.error(err.message || 'AI 生成失败')
    } finally {
      setGeneratingPropIndex(null)
    }
  }

  // AI 生成修改模式下已有属性的新名称
  const handleGenerateModifyName = async (existingId: string, displayName: string) => {
    if (!displayName?.trim()) {
      message.warning('请先填写显示名')
      return
    }
    setGeneratingModifyId(existingId)
    try {
      const name = await fetchSuggestedName(displayName, 'event')
      updatePropMod(existingId, 'name', name)
    } catch (err: any) {
      message.error(err.message || 'AI 生成失败')
    } finally {
      setGeneratingModifyId(null)
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)

      // 自动生成标题
      const displayName = values.display_name || ''
      const title = autoTitle(displayName)

      // 组装 proposed_properties（仅事件类型需要）
      const allProps: ProposedProperty[] = []

      if (trackingType === 'event') {
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

        if (reqType === 'modify') {
          values.event_id = selectedEventId
          const selected = existingEvents.find(e => e.id === selectedEventId)
          values.event_name = selected?.name || values.event_name
        } else {
          values.event_id = null
        }
      }

      // 排除仅用于表单展示的字段，防止传入不存在的数据库列
      const {
        property_name, property_type, property_description, property_required,
        ...cleanValues
      } = values

      // 非事件类型复用 event_name/event_id，并用 proposed_properties 保存属性定义。
      if (!isEventType && property_name) {
        const selectedProperty = existingPropList.find(property => property.id === selectedEventId)
        const technicalName = reqType === 'modify'
          ? selectedProperty?.name || values.event_name
          : property_name

        cleanValues.event_name = technicalName
        cleanValues.event_id = reqType === 'modify' ? selectedEventId : null
        cleanValues.description = property_description || cleanValues.description
        allProps.push({
          name: technicalName,
          display_name: displayName,
          type: property_type || 'string',
          description: property_description || '',
          required: property_required || false,
          action: reqType === 'new' ? 'add' : 'modify',
          existing_id: reqType === 'modify' ? selectedEventId || undefined : undefined,
        })
      }

      await onSubmit({
        ...cleanValues,
        title,
        tracking_type: trackingType,
        modification_type: reqType,
        display_name: displayName,
        proposed_properties: allProps,
      })
      form.resetFields()
    } catch (err: any) {
      if (err.message && err.message !== 'VALIDATE_FAILED') message.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // 表单值变化监听
  const handleFormValuesChange = (changed: any) => {
    if (changed.modification_type !== undefined) handleReqTypeChange(changed.modification_type)
  }

  const isEventType = trackingType === 'event'
  const isNewType = reqType === 'new'

  // AI 流式生成 → 实时写入表单字段
  useEffect(() => {
    if (aiSuggest.source === 'ai' && aiSuggest.suggestedName) {
      const fieldName = isEventType ? 'event_name' : 'property_name'
      form.setFieldsValue({ [fieldName]: aiSuggest.suggestedName })
      form.validateFields([fieldName]).catch(() => {})
    }
  }, [aiSuggest.suggestedName, aiSuggest.source, isEventType, form])

  return (
    <Modal
      title={isCopyMode ? '复制需求' : editingValues ? '编辑需求' : '提交埋点需求'}
      open={open}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={submitting}
      okText={editingValues ? '保存修改' : isCopyMode ? '创建副本' : '提交需求'}
      cancelText="取消"
      mask={{ closable: !submitting }}
      destroyOnHidden
      width="min(920px, calc(100vw - 48px))"
      styles={{ body: { maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', paddingRight: 12 } }}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}
        onValuesChange={handleFormValuesChange}
      >
        {/* 复制模式提示横幅 */}
        {isCopyMode && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="复制模式"
            description={`已预填「${copyFrom!.display_name || copyFrom!.title}」的配置，请确认显示名、技术名和版本。`}
          />
        )}
        <Divider titlePlacement="start" plain>基础信息</Divider>
        {/* 埋点类型 — 事件 / 公共属性 / 用户属性 */}
        <Form.Item label="埋点类型" rules={[{ required: true }]}>
          <Radio.Group
            value={trackingType}
            onChange={(e) => handleTrackingTypeChange(e.target.value)}
          >
            {TRACKING_TYPE_OPTIONS.map(opt => (
              <Radio key={opt.value} value={opt.value}>{opt.label}</Radio>
            ))}
          </Radio.Group>
        </Form.Item>

        {/* 需求类型 — 新增 / 修改 */}
        <Form.Item name="modification_type" label="需求类型" rules={[{ required: true }]}>
          <Radio.Group>
            <Radio value="new">新增</Radio>
            <Radio value="modify">修改</Radio>
          </Radio.Group>
        </Form.Item>

        {/* 显示名 — 输入后 AI 自动推荐技术名 */}
        <Form.Item
          name="display_name"
          label="显示名"
          rules={[{ required: true, message: '请输入显示名' }]}
        >
          <Input placeholder="如：商品点击、用户等级、会员类型" />
        </Form.Item>

        <Divider titlePlacement="start" plain>技术定义</Divider>
        {/* ====== 事件类型的字段 ====== */}
        {isEventType && (
          <>
            {isNewType ? (
              <Form.Item
                name="event_name"
                label="事件名"
                rules={[
                  { required: true, message: '请输入事件名' },
                  { pattern: /^[a-z][a-z0-9_]*$/, message: '小写字母开头，仅字母数字下划线' },
                  { validator: checkEventName },
                ]}
                validateTrigger="onBlur"
              >
                <Input
                  placeholder="如 product_detail_view"
                  suffix={
                    <ThunderboltOutlined
                      spin={aiSuggest.isLoading}
                      onClick={() => {
                        const dn = displayName || form.getFieldValue('display_name')
                        if (!dn?.trim()) { message.warning('请先填写显示名'); return }
                        aiSuggest.trigger(dn)
                      }}
                      style={{
                        cursor: 'pointer',
                        color: aiSuggest.isLoading ? '#4f46e5' : '#bfbfbf',
                        fontSize: 14,
                        transition: 'color 0.2s',
                      }}
                      title="AI 生成事件名"
                    />
                  }
                  style={aiSuggest.source === 'ai' ? { borderColor: '#4f46e5', boxShadow: '0 0 0 2px rgba(79,70,229,0.1)' } : undefined}
                  onChange={(e) => {
                    if (e.target.value) aiSuggest.markManual(e.target.value)
                  }}
                />
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

            <Form.Item name="description" label="业务场景描述">
              <TextArea rows={2} placeholder="描述业务场景：希望追踪什么行为、用于什么分析目的" />
            </Form.Item>
          </>
        )}

        {/* ====== 公共属性/用户属性类型的字段 ====== */}
        {!isEventType && (
          <>
            {isNewType ? (
              <Form.Item
                name="property_name"
                label="属性名"
                rules={[
                  { required: true, message: '请输入属性名' },
                  { pattern: /^[a-z][a-z0-9_]*$/, message: '小写字母开头，仅字母数字下划线' },
                ]}
              >
                <Input
                  placeholder="如 user_level, login_count"
                  suffix={
                    <ThunderboltOutlined
                      spin={aiSuggest.isLoading}
                      onClick={() => {
                        const dn = displayName || form.getFieldValue('display_name')
                        if (!dn?.trim()) { message.warning('请先填写显示名'); return }
                        aiSuggest.trigger(dn)
                      }}
                      style={{
                        cursor: 'pointer',
                        color: aiSuggest.isLoading ? '#4f46e5' : '#bfbfbf',
                        fontSize: 14,
                        transition: 'color 0.2s',
                      }}
                      title="AI 生成属性名"
                    />
                  }
                  style={aiSuggest.source === 'ai' ? { borderColor: '#4f46e5', boxShadow: '0 0 0 2px rgba(79,70,229,0.1)' } : undefined}
                  onChange={(e) => {
                    if (e.target.value) aiSuggest.markManual(e.target.value)
                  }}
                />
              </Form.Item>
            ) : (
              <Form.Item name="property_name" label="选择已有属性" rules={[{ required: true, message: '请选择要修改的属性' }]}>
                <Select
                  showSearch
                  placeholder={`搜索选择已有${TRACKING_TYPE_LABEL[trackingType]}`}
                  optionFilterProp="label"
                  onChange={(val) => {
                    setSelectedEventId(val)
                    const selected = existingPropList.find(p => p.id === val)
                    if (selected) {
                      form.setFieldsValue({
                        event_name: selected.name,
                        display_name: selected.display_name || selected.name,
                        property_type: selected.type,
                        property_description: selected.description || '',
                      })
                    }
                  }}
                  options={existingPropList.map(p => ({
                    value: p.id,
                    label: `${p.name}${p.display_name ? ` (${p.display_name})` : ''}`,
                  }))}
                />
              </Form.Item>
            )}
            <Form.Item name="property_type" label="属性类型" initialValue="string">
              <Select options={typeOptions} />
            </Form.Item>
            <Form.Item name="property_description" label="属性说明">
              <TextArea rows={2} placeholder="描述属性的含义和用途" />
            </Form.Item>
            <Form.Item name="property_required" label="是否必填" initialValue={false}>
              <Select options={[
                { value: false, label: '可选' }, { value: true, label: '必填' },
              ]} />
            </Form.Item>
          </>
        )}

        <Divider titlePlacement="start" plain>交付范围</Divider>
        {/* 公共字段 */}
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
            popupRender={(menu) => (
              <>
                <div style={{ padding: '4px 8px', borderBottom: '1px solid #f0f0f0' }}>
                  <Space>
                    <Button size="small" type="link" onClick={() => {
                      form.setFieldValue('platforms', PLATFORM_OPTIONS.map(p => p.value))
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

        {isEventType && (
          <Form.Item name="trigger_timing" label="触发时机">
            <TextArea rows={2} placeholder="如：用户点击商品卡片时触发" />
          </Form.Item>
        )}

        {isEventType && (
          <RequirementPropertyEditor
            projectId={projectId}
            existingProperties={!isNewType && selectedEventId ? existingProperties : []}
            propertyActions={propActions}
            propertyModifications={propModifications}
            newProperties={newProperties}
            typeOptions={typeOptions}
            generatingNewIndex={generatingPropIndex}
            generatingExistingId={generatingModifyId}
            isAppendingToExistingEvent={!isNewType && Boolean(selectedEventId)}
            onStartModify={startModifyProperty}
            onSetExistingAction={setPropAction}
            onUpdateExisting={(propertyId: string, field: PropertyEditorField, value: PropertyEditorValue) => updatePropMod(propertyId, field, value)}
            onGenerateExistingName={handleGenerateModifyName}
            onAddNew={addNewProp}
            onUpdateNew={(index: number, field: PropertyEditorField, value: PropertyEditorValue) => updateNewProp(index, field, value)}
            onGenerateNewName={handleGeneratePropName}
            onRemoveNew={removeNewProp}
          />
        )}
      </Form>
    </Modal>
  )
}
