import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card, Button, Table, Segmented, Space, Tag, message, Modal, Popconfirm, Select, Input, List, Dropdown } from 'antd'
import { PlusOutlined, DeleteOutlined, UnorderedListOutlined, AppstoreOutlined, EyeOutlined, SettingOutlined, MoreOutlined, EditOutlined, CheckOutlined, CopyOutlined } from '@ant-design/icons'
import {
  DndContext, closestCorners, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import { supabase } from '../../supabase/client'
import { getRequirements, createRequirement, updateRequirement, deleteRequirement } from '../../api/requirements'
import { getEventById } from '../../api/events'
import { createEventProperty, updateEventProperty, deleteEventProperty } from '../../api/eventProperties'
import { getVersions, createVersion, deleteVersion } from '../../api/versions'
import type { Version } from '../../api/versions'
import StatusBadge from '../../components/StatusBadge'
import EmptyState from '../../components/EmptyState'
import type { Requirement, RequirementStatus, RequirementPriority, ProposedProperty, Platform } from '../../types'
import { PLATFORM_OPTIONS } from '../../types'
import RequirementFormModal from './RequirementFormModal'
import KanbanColumn from './KanbanColumn'
import { useProjectStore } from '../../stores/projectStore'

const STATUSES: RequirementStatus[] = ['pending', 'in_progress', 'done']
const STATUS_LABELS: Record<RequirementStatus, string> = {
  pending: '待开发',
  in_progress: '待验收',
  done: '已完成',
  rejected: '已拒绝',
}
const PRIORITY_TAGS: Record<RequirementPriority, { color: string; label: string }> = {
  high: { color: 'red', label: '高' },
  medium: { color: 'orange', label: '中' },
  low: { color: 'default', label: '低' },
}

export default function RequirementPage() {
  const navigate = useNavigate()
  const projectId = useProjectStore((s) => s.currentProjectId)
  const [searchParams, setSearchParams] = useSearchParams()
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<Requirement | null>(null)
  const [copyFromRecord, setCopyFromRecord] = useState<Requirement | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [filterPlatform, setFilterPlatform] = useState<Platform | undefined>()
  const [filterVersion, setFilterVersion] = useState<string | undefined>()
  const [allVersions, setAllVersions] = useState<Version[]>([])
  const [versionModalOpen, setVersionModalOpen] = useState(false)
  const [newVersionName, setNewVersionName] = useState('')

  // 加载版本列表并默认选最新
  const loadVersions = useCallback(async () => {
    if (!projectId) return
    try {
      const versions = await getVersions(projectId)
      setAllVersions(versions)
      if (versions.length > 0 && !filterVersion) {
        setFilterVersion(versions[0].name) // 默认最新
      }
    } catch (err) { console.error('加载版本列表失败:', err) }
  }, [projectId])

  useEffect(() => { loadVersions() }, [loadVersions])

  const handleAddVersion = async () => {
    if (!newVersionName.trim() || !projectId) return
    try {
      await createVersion(projectId, newVersionName.trim())
      message.success('版本已添加')
      setNewVersionName('')
      await loadVersions()
    } catch (e: any) { message.error(e.message) }
  }

  const handleDeleteVersion = async (id: string) => {
    try {
      await deleteVersion(id)
      message.success('版本已删除')
      await loadVersions()
    } catch (e: any) { message.error(e.message) }
  }

  // 筛选后的需求
  const filtered = requirements.filter(r => {
    if (filterPlatform && (!r.platforms || !r.platforms.includes(filterPlatform))) return false
    if (filterVersion && r.version !== filterVersion) return false
    return true
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const loadData = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const data = await getRequirements(projectId)
      setRequirements(data)
    } catch (err: any) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { loadData() }, [loadData])

  // 检测 URL 参数 ?copy=:id（从详情页跳转过来）
  useEffect(() => {
    const copyId = searchParams.get('copy')
    if (copyId && requirements.length > 0) {
      const record = requirements.find((r) => r.id === copyId)
      if (record) {
        setCopyFromRecord(record)
        setEditingRecord(null)
        setModalOpen(true)
        // 清除 URL 参数
        const next = new URLSearchParams(searchParams)
        next.delete('copy')
        setSearchParams(next, { replace: true })
      }
    }
  }, [searchParams, requirements])

  // 需求完成时自动同步
  const syncRequirement = async (req: Requirement) => {
    try {
      const trackingType = (req as any).tracking_type || 'event'

      if (trackingType === 'event') {
        // === 事件同步逻辑 ===
        if (req.modification_type === 'new') {
          const { data: newEvent, error: createErr } = await supabase
            .from('events')
            .insert({
              project_id: projectId!,
              name: req.event_name!,
              display_name: req.display_name || req.title,
              description: req.description,
              status: 'active',
              platforms: req.platforms || [],
              trigger_timing: req.trigger_timing || null,
            })
            .select()
            .single()
          if (createErr) throw createErr

          if (req.proposed_properties && req.proposed_properties.length > 0) {
            await supabase.from('event_properties').insert(
              req.proposed_properties.map((p: ProposedProperty) => ({
                project_id: projectId!,
                event_id: newEvent.id,
                name: p.name,
                display_name: p.display_name || p.name,
                type: p.type,
                description: p.description,
                required: p.required,
              }))
            )
          }
          message.success(`事件「${newEvent.name}」已创建，属性已同步`)
        } else if (req.modification_type === 'modify' && req.event_id) {
          const { error: updateErr } = await supabase
            .from('events')
            .update({
              updated_at: new Date().toISOString(),
              platforms: req.platforms || [],
              trigger_timing: req.trigger_timing || null,
            })
            .eq('id', req.event_id)
          if (updateErr) throw updateErr

          let deletedCount = 0, modifiedCount = 0, addedCount = 0
          if (req.proposed_properties && req.proposed_properties.length > 0) {
            for (const p of req.proposed_properties) {
              if (p.action === 'delete' && p.existing_id) {
                await deleteEventProperty(p.existing_id)
                deletedCount++
              } else if (p.action === 'modify' && p.existing_id) {
                await updateEventProperty(p.existing_id, {
                  name: p.name, display_name: p.display_name,
                  type: p.type, description: p.description, required: p.required,
                })
                modifiedCount++
              } else if (p.action === 'add' || !p.action) {
                await createEventProperty({
                  project_id: projectId!,
                  event_id: req.event_id, name: p.name,
                  display_name: p.display_name || p.name,
                  type: p.type, description: p.description, required: p.required,
                })
                addedCount++
              }
            }
          }
          const event = await getEventById(req.event_id)
          const parts = []
          if (addedCount > 0) parts.push(`新增 ${addedCount} 个`)
          if (modifiedCount > 0) parts.push(`修改 ${modifiedCount} 个`)
          if (deletedCount > 0) parts.push(`删除 ${deletedCount} 个`)
          message.success(`事件「${event.name}」已更新${parts.length > 0 ? '：' + parts.join('，') : ''}`)
        }
      } else if (trackingType === 'common_property') {
        // === 公共属性同步逻辑 ===
        const tableName = 'common_properties'
        if (req.modification_type === 'new') {
          const { data: newProp, error: createErr } = await supabase
            .from(tableName)
            .insert({
              project_id: projectId!,
              name: req.event_name!,
              display_name: req.display_name || req.title,
              type: (req as any).property_type || 'string',
              description: req.description,
              platforms: req.platforms || [],
            })
            .select()
            .single()
          if (createErr) throw createErr
          message.success(`公共属性「${(newProp as any).name}」已创建`)
        } else if (req.modification_type === 'modify' && req.event_id) {
          const { error: updateErr } = await supabase
            .from(tableName)
            .update({
              name: req.event_name,
              display_name: req.display_name || req.title,
              description: req.description,
              platforms: req.platforms || [],
              updated_at: new Date().toISOString(),
            })
            .eq('id', req.event_id)
          if (updateErr) throw updateErr
          message.success('公共属性已更新')
        }
      } else if (trackingType === 'user_property') {
        // === 用户属性同步逻辑 ===
        const tableName = 'user_properties'
        if (req.modification_type === 'new') {
          const { data: newProp, error: createErr } = await supabase
            .from(tableName)
            .insert({
              project_id: projectId!,
              name: req.event_name!,
              display_name: req.display_name || req.title,
              type: (req as any).property_type || 'string',
              description: req.description,
              platforms: req.platforms || [],
            })
            .select()
            .single()
          if (createErr) throw createErr
          message.success(`用户属性「${(newProp as any).name}」已创建`)
        } else if (req.modification_type === 'modify' && req.event_id) {
          const { error: updateErr } = await supabase
            .from(tableName)
            .update({
              name: req.event_name,
              display_name: req.display_name || req.title,
              description: req.description,
              platforms: req.platforms || [],
              updated_at: new Date().toISOString(),
            })
            .eq('id', req.event_id)
          if (updateErr) throw updateErr
          message.success('用户属性已更新')
        }
      }
    } catch (err: any) {
      if (err?.code === '23505') {
        message.error(`「${req.event_name || req.display_name || req.title}」已存在，请勿重复同步`)
      } else {
        message.error(`同步失败: ${err.message}`)
      }
      return
    }
  }

  const handleSubmit = async (values: {
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
  }) => {
    if (editingRecord) {
      await updateRequirement(editingRecord.id, values as any)
      message.success('更新成功')
    } else {
      await createRequirement({ project_id: projectId!, ...values } as any)
      message.success(copyFromRecord ? '复制成功' : '需求已提交')
    }
    setModalOpen(false)
    setCopyFromRecord(null)
    await loadData()
    loadVersions()
  }

  // 处理拖拽（状态变更）
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const targetStatus = over.id as RequirementStatus

    if (STATUSES.includes(targetStatus)) {
      const item = requirements.find((r) => r.id === activeId)
      if (!item || item.status === targetStatus) return

      // 如果拖到 done，询问是否同步
      if (targetStatus === 'done') {
        const confirmed = await new Promise<boolean>((resolve) => {
          Modal.confirm({
            title: '确认完成需求',
            content: item.modification_type === 'new'
              ? `将自动创建事件「${item.event_name}」并同步 ${item.proposed_properties?.length || 0} 个属性，确认？`
              : `将自动更新事件属性（新增/修改/删除），确认？`,
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          })
        })
        if (!confirmed) return
      }

      // 乐观更新
      setRequirements((prev) =>
        prev.map((r) => (r.id === activeId ? { ...r, status: targetStatus } : r))
      )
      setSyncing(true)
      try {
        await updateRequirement(activeId, { status: targetStatus })

        // 如果变为 done，自动同步
        if (targetStatus === 'done') {
          const updatedItem = { ...item, status: 'done' as RequirementStatus }
          await syncRequirement(updatedItem)
        } else {
          message.success(`状态已更新为「${STATUS_LABELS[targetStatus]}」`)
        }
      } catch (err: any) {
        message.error(err.message)
        await loadData()
      } finally {
        setSyncing(false)
      }
    }
  }

  // 手动标记完成
  const handleMarkDone = async (req: Requirement) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: '确认完成需求',
        content: req.modification_type === 'new'
          ? `将自动创建事件「${req.event_name}」并同步属性，确认？`
          : `将自动更新事件属性（新增/修改/删除），确认？`,
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      })
    })
    if (!confirmed) return

    setSyncing(true)
    try {
      await updateRequirement(req.id, { status: 'done' })
      const updatedItem = { ...req, status: 'done' as RequirementStatus }
      await syncRequirement(updatedItem)
      await loadData()
    } catch (err: any) {
      message.error(err.message)
    } finally {
      setSyncing(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteRequirement(id)
      message.success('删除成功')
      await loadData()
    } catch (err: any) {
      message.error(err.message)
    }
  }

  const kanbanData = STATUSES.reduce((acc, status) => {
    acc[status] = filtered.filter((r) => r.status === status)
    return acc
  }, {} as Record<RequirementStatus, Requirement[]>)

  const tableColumns = [
    { title: '标题', dataIndex: 'title', key: 'title', width: 200,
      render: (v: string, r: Requirement) => <a onClick={() => navigate(`/requirements/${r.id}`)}>{v}</a>,
    },
    {
      title: '类型', dataIndex: 'modification_type', key: 'modification_type', width: 70,
      render: (v: string) => v === 'new' ? <Tag color="blue">新增</Tag> : <Tag color="green">修改</Tag>,
    },
    {
      title: '埋点', dataIndex: 'tracking_type', key: 'tracking_type', width: 70, responsive: ['sm' as const] as ('sm')[],
      render: (v: string) => {
        const labels: Record<string, { color: string; label: string }> = {
          event: { color: 'purple', label: '事件' },
          common_property: { color: 'cyan', label: '公共属性' },
          user_property: { color: 'geekblue', label: '用户属性' },
        }
        const opt = labels[v] || { color: 'default', label: v || '事件' }
        return <Tag color={opt.color}>{opt.label}</Tag>
      },
    },
    { title: '显示名', dataIndex: 'display_name', key: 'display_name', width: 100, responsive: ['sm' as const] as ('sm')[], render: (v: string) => v || '-' },
    { title: '事件/属性', dataIndex: 'event_name', key: 'event_name', width: 130, responsive: ['md' as const] as ('md')[], render: (v: string) => v || '-' },
    { title: '版本', dataIndex: 'version', key: 'version', width: 70, responsive: ['md' as const] as ('md')[], render: (v: string) => v || '-' },
    {
      title: '平台', key: 'platforms', width: 110, responsive: ['lg' as const] as ('lg')[],
      render: (_: unknown, r: Requirement) => (r.platforms || []).map((p: string) => {
        const opt = PLATFORM_OPTIONS.find(o => o.value === p)
        return <Tag key={p} color={opt?.color} style={{ fontSize: 11 }}>{opt?.label || p}</Tag>
      }),
    },
    {
      title: '优先级', dataIndex: 'priority', key: 'priority', width: 55,
      render: (p: RequirementPriority) => <Tag color={PRIORITY_TAGS[p]?.color}>{PRIORITY_TAGS[p]?.label}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 75,
      render: (s: RequirementStatus) => <StatusBadge status={s} type="requirement" />,
    },
    {
      title: '提交人', key: 'requester', width: 70, responsive: ['sm' as const] as ('sm')[],
      render: (_: unknown, r: Requirement) => r.profiles_requester?.display_name || '-',
    },
    {
      title: '操作', key: 'actions', width: 130,
      render: (_: unknown, record: Requirement) => {
        const menuItems = {
          items: [
            ...(record.status !== 'done' ? [{ key: 'done', icon: <CheckOutlined />, label: '标记完成', onClick: (e: any) => { e.domEvent.stopPropagation(); handleMarkDone(record) } }] : []),
            { key: 'edit', icon: <EditOutlined />, label: '编辑', onClick: (e: any) => { e.domEvent.stopPropagation(); setEditingRecord(record); setCopyFromRecord(null); setModalOpen(true) } },
            { key: 'copy', icon: <CopyOutlined />, label: '复制', onClick: (e: any) => { e.domEvent.stopPropagation(); setCopyFromRecord(record); setEditingRecord(null); setModalOpen(true) } },
            { type: 'divider' as const },
            {
              key: 'delete',
              icon: <DeleteOutlined />,
              label: <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)} onPopupClick={(e) => e.stopPropagation()}>
                删除
              </Popconfirm>,
              danger: true,
              onClick: (e: any) => { e.domEvent.stopPropagation() },
            },
          ],
        }
        return (
          <Space size="small" onClick={(e) => e.stopPropagation()}>
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/requirements/${record.id}`)}>详情</Button>
            <Dropdown menu={menuItems} trigger={['click']}>
              <Button type="link" size="small" icon={<MoreOutlined />} onClick={(e) => e.preventDefault()} />
            </Dropdown>
          </Space>
        )
      },
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space>
          <h2 style={{ margin: 0 }}>埋点需求</h2>
          <Segmented
            value={viewMode}
            onChange={(val) => setViewMode(val as 'kanban' | 'list')}
            options={[
              { value: 'kanban', icon: <AppstoreOutlined />, label: '看板' },
              { value: 'list', icon: <UnorderedListOutlined />, label: '列表' },
            ]}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingRecord(null); setModalOpen(true) }}>
          提交需求
        </Button>
      </div>

      {syncing && (
        <div style={{ marginBottom: 16, padding: '8px 16px', background: '#fff7e6', borderRadius: 6, border: '1px solid #ffd591' }}>
          正在同步事件...
        </div>
      )}

      <Space style={{ marginBottom: 12, minHeight: 32 }} wrap>
        <Select
          placeholder="按平台筛选"
          allowClear
          style={{ width: 130 }}
          value={filterPlatform}
          onChange={setFilterPlatform}
          options={PLATFORM_OPTIONS.map(p => ({ value: p.value, label: p.label }))}
        />
        <Select
          showSearch
          allowClear
          placeholder="选择版本"
          style={{ width: 160 }}
          value={filterVersion}
          onChange={(val) => setFilterVersion(val)}
          filterOption={(input, option) => (option?.label as string || '').toLowerCase().includes(input.toLowerCase())}
          options={allVersions.map(v => ({ value: v.name, label: v.name }))}
        />
        <Button size="small" icon={<SettingOutlined />} onClick={() => setVersionModalOpen(true)}>
          版本管理
        </Button>
        <Tag>共 {filtered.length} 条</Tag>
      </Space>

      {viewMode === 'kanban' ? (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 360px))',
            justifyContent: 'start',
            alignItems: 'start',
            gap: 16,
            minHeight: '60vh',
            overflowX: 'auto',
            paddingBottom: 4,
          }}>
            {STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                label={STATUS_LABELS[status]}
                items={kanbanData[status]}
                count={kanbanData[status].length}
                onEdit={(record) => { setEditingRecord(record); setCopyFromRecord(null); setModalOpen(true) }}
                onDelete={handleDelete}
                onCopy={(record) => { setCopyFromRecord(record); setEditingRecord(null); setModalOpen(true) }}
              />
            ))}
          </div>
        </DndContext>
      ) : (
        <Card>
          <Table
            columns={tableColumns}
            dataSource={filtered}
            rowKey="id"
            loading={loading || syncing}
            onRow={(record) => ({
              onClick: () => navigate(`/requirements/${record.id}`),
              style: { cursor: 'pointer' },
            })}
            pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条需求` }}
            size="middle"
            scroll={{ x: 800 }}
            locale={{ emptyText: <EmptyState scene="no_data" itemName="埋点需求" onAction={() => { setEditingRecord(null); setModalOpen(true) }} actionLabel="提交需求" /> }}
          />
        </Card>
      )}

      {/* 版本管理 Modal */}
      <Modal
        title="版本管理"
        open={versionModalOpen}
        onCancel={() => setVersionModalOpen(false)}
        footer={null}
        width={400}
      >
        <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
          <Input
            placeholder="输入新版本号，如 2.4.0"
            value={newVersionName}
            onChange={e => setNewVersionName(e.target.value)}
            onPressEnter={handleAddVersion}
          />
          <Button type="primary" onClick={handleAddVersion}>添加</Button>
        </Space.Compact>
        <List
          size="small"
          dataSource={allVersions}
          renderItem={(v) => (
            <List.Item
              actions={[
                <Popconfirm title="确定删除？" onConfirm={() => handleDeleteVersion(v.id)}>
                  <Button type="link" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>,
              ]}
            >
              {v.name}
            </List.Item>
          )}
          locale={{ emptyText: <EmptyState scene="no_data" itemName="版本" /> }}
        />
      </Modal>

      <RequirementFormModal
        open={modalOpen}
        projectId={projectId!}
        editingValues={editingRecord ? {
          title: editingRecord.title,
          display_name: editingRecord.display_name || '',
          tracking_type: editingRecord.tracking_type || 'event',
          description: editingRecord.description || '',
          event_name: editingRecord.event_name || '',
          event_id: editingRecord.event_id,
          modification_type: editingRecord.modification_type,
          proposed_properties: editingRecord.proposed_properties,
          priority: editingRecord.priority,
          version: editingRecord.version,
          platforms: editingRecord.platforms,
          trigger_timing: editingRecord.trigger_timing,
        } : null}
        copyFrom={copyFromRecord}
        onSubmit={handleSubmit}
        onCancel={() => { setModalOpen(false); setEditingRecord(null); setCopyFromRecord(null) }}
      />
    </div>
  )
}
