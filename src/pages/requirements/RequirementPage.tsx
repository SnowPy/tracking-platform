import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Badge,
  Button,
  Input,
  List,
  message,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Skeleton,
  Space,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import {
  AppstoreOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { createRequirement, deleteRequirement, getRequirements, updateRequirement } from '../../api/requirements'
import { syncRequirementToTrackingAsset } from '../../api/requirementSync'
import { createVersion, deleteVersion, getVersions } from '../../api/versions'
import type { Version } from '../../api/versions'
import EmptyState from '../../components/EmptyState'
import type {
  Platform,
  ProposedProperty,
  Requirement,
  RequirementPriority,
  RequirementType,
  TrackingType,
} from '../../types'
import { PLATFORM_OPTIONS, TRACKING_TYPE_OPTIONS } from '../../types'
import { useProjectStore } from '../../stores/projectStore'
import KanbanColumn from './KanbanColumn'
import RequirementCard from './RequirementCard'
import RequirementDetailDrawer from './RequirementDetailDrawer'
import RequirementFormModal from './RequirementFormModal'
import {
  ACTIVE_REQUIREMENT_STATUSES,
  REQUIREMENT_PRIORITY_META,
  REQUIREMENT_STATUS_LABELS,
  REQUIREMENT_TYPE_META,
  TRACKING_TYPE_META,
  filterRequirements,
  sortRequirements,
  type ActiveRequirementStatus,
} from './requirementPresentation'

const { Text } = Typography
const PREFERENCES_KEY = 'tracking-platform:requirement-workbench:v1'
const KANBAN_COLUMN_GAP = 16
const KANBAN_MIN_COLUMN_WIDTH = 280
const KANBAN_FALLBACK_COLUMN_WIDTH = 360

type ViewMode = 'workspace' | 'kanban'

interface WorkbenchPreferences {
  version: 1
  viewMode: ViewMode
  activeStatus: ActiveRequirementStatus
  filterVersion?: string
  filterPlatform?: Platform
  filterTrackingType?: TrackingType
  filterRequirementType?: RequirementType
  filterPriority?: RequirementPriority
}

const DEFAULT_PREFERENCES: WorkbenchPreferences = {
  version: 1,
  viewMode: 'workspace',
  activeStatus: 'pending',
}

function readPreferences(): WorkbenchPreferences {
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY)
    if (!stored) return DEFAULT_PREFERENCES

    const parsed = JSON.parse(stored) as Partial<WorkbenchPreferences>
    if (parsed.version !== 1) return DEFAULT_PREFERENCES

    const viewMode = parsed.viewMode === 'kanban' ? 'kanban' : 'workspace'
    const activeStatus = ACTIVE_REQUIREMENT_STATUSES.includes(parsed.activeStatus as ActiveRequirementStatus)
      ? parsed.activeStatus as ActiveRequirementStatus
      : 'pending'

    return { ...DEFAULT_PREFERENCES, ...parsed, viewMode, activeStatus }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

interface RequirementCardListProps {
  requirements: Requirement[]
  emptyItemName: string
  onCreate: () => void
  onOpen: (requirement: Requirement) => void
  onEdit: (requirement: Requirement) => void
  onCopy: (requirement: Requirement) => void
  onDelete: (id: string) => Promise<void>
}

function RequirementCardList({
  requirements,
  emptyItemName,
  onCreate,
  onOpen,
  onEdit,
  onCopy,
  onDelete,
}: RequirementCardListProps) {
  if (requirements.length === 0) {
    return (
      <EmptyState
        scene="no_data"
        itemName={emptyItemName}
        onAction={onCreate}
        actionLabel="提交需求"
      />
    )
  }

  return (
    <div className="requirement-workspace-list">
      {requirements.map((requirement) => (
        <RequirementCard
          key={requirement.id}
          requirement={requirement}
          onOpen={onOpen}
          onEdit={onEdit}
          onCopy={onCopy}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error && 'message' in error) {
    return String(error.message)
  }
  return '操作失败，请稍后重试'
}

export default function RequirementPage() {
  const projectId = useProjectStore((state) => state.currentProjectId)
  const [searchParams, setSearchParams] = useSearchParams()
  const [initialPreferences] = useState(readPreferences)
  const [requirements, setRequirements] = useState<Requirement[]>([])
  const [allVersions, setAllVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>(initialPreferences.viewMode)
  const [activeStatus, setActiveStatus] = useState<ActiveRequirementStatus>(initialPreferences.activeStatus)
  const [searchText, setSearchText] = useState('')
  const [filterVersion, setFilterVersion] = useState<string | undefined>(initialPreferences.filterVersion)
  const [filterPlatform, setFilterPlatform] = useState<Platform | undefined>(initialPreferences.filterPlatform)
  const [filterTrackingType, setFilterTrackingType] = useState<TrackingType | undefined>(initialPreferences.filterTrackingType)
  const [filterRequirementType, setFilterRequirementType] = useState<RequirementType | undefined>(initialPreferences.filterRequirementType)
  const [filterPriority, setFilterPriority] = useState<RequirementPriority | undefined>(initialPreferences.filterPriority)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<Requirement | null>(null)
  const [copyFromRecord, setCopyFromRecord] = useState<Requirement | null>(null)
  const [versionModalOpen, setVersionModalOpen] = useState(false)
  const [newVersionName, setNewVersionName] = useState('')
  const kanbanBoardRef = useRef<HTMLDivElement | null>(null)
  const deferredSearchText = useDeferredValue(searchText)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const loadData = useCallback(async () => {
    if (!projectId) {
      setRequirements([])
      return
    }

    setLoading(true)
    try {
      setRequirements(await getRequirements(projectId))
    } catch (error) {
      message.error(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const loadVersions = useCallback(async () => {
    if (!projectId) {
      setAllVersions([])
      return
    }

    try {
      const nextVersions = await getVersions(projectId)
      setAllVersions(nextVersions)
      setFilterVersion((currentVersion) => {
        if (!currentVersion) return undefined
        return nextVersions.some((version) => version.name === currentVersion)
          ? currentVersion
          : undefined
      })
    } catch (error) {
      message.error(`加载版本失败：${getErrorMessage(error)}`)
    }
  }, [projectId])

  useEffect(() => {
    let isCancelled = false

    const loadInitialData = async () => {
      if (!projectId) return

      try {
        const [nextRequirements, nextVersions] = await Promise.all([
          getRequirements(projectId),
          getVersions(projectId),
        ])
        if (isCancelled) return

        setRequirements(nextRequirements)
        setAllVersions(nextVersions)
        setFilterVersion((currentVersion) => {
          if (!currentVersion) return undefined
          return nextVersions.some((version) => version.name === currentVersion)
            ? currentVersion
            : undefined
        })
      } catch (error) {
        if (!isCancelled) message.error(getErrorMessage(error))
      } finally {
        if (!isCancelled) setLoading(false)
      }
    }

    void loadInitialData()
    return () => { isCancelled = true }
  }, [projectId])

  useEffect(() => {
    const preferences: WorkbenchPreferences = {
      version: 1,
      viewMode,
      activeStatus,
      filterVersion,
      filterPlatform,
      filterTrackingType,
      filterRequirementType,
      filterPriority,
    }
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
  }, [
    activeStatus,
    filterPlatform,
    filterPriority,
    filterRequirementType,
    filterTrackingType,
    filterVersion,
    viewMode,
  ])

  useEffect(() => {
    if (viewMode !== 'kanban') return

    const board = kanbanBoardRef.current
    if (!board) return

    const updateColumnWidth = () => {
      const boardWidth = Math.floor(board.getBoundingClientRect().width)
      const availableWidth = boardWidth - KANBAN_COLUMN_GAP * (ACTIVE_REQUIREMENT_STATUSES.length - 1)
      const nextWidth = Math.max(KANBAN_MIN_COLUMN_WIDTH, Math.floor(availableWidth / ACTIVE_REQUIREMENT_STATUSES.length))
      board.style.setProperty('--kanban-column-width', `${nextWidth}px`)
    }

    updateColumnWidth()
    const observer = new ResizeObserver(updateColumnWidth)
    observer.observe(board)
    window.addEventListener('resize', updateColumnWidth)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateColumnWidth)
    }
  }, [viewMode])

  const filteredRequirements = useMemo(() => {
    const filtered = filterRequirements(requirements, {
      query: deferredSearchText,
      version: filterVersion,
      platform: filterPlatform,
      trackingType: filterTrackingType,
      requirementType: filterRequirementType,
      priority: filterPriority,
    })
    return sortRequirements(filtered)
  }, [
    deferredSearchText,
    filterPlatform,
    filterPriority,
    filterRequirementType,
    filterTrackingType,
    filterVersion,
    requirements,
  ])

  const groupedRequirements = useMemo(() => {
    const groups: Record<ActiveRequirementStatus, Requirement[]> = {
      pending: [],
      in_progress: [],
      done: [],
    }
    for (const requirement of filteredRequirements) {
      groups[requirement.status as ActiveRequirementStatus].push(requirement)
    }
    return groups
  }, [filteredRequirements])

  const selectedRequirementId = searchParams.get('detail')
  const selectedRequirement = useMemo(
    () => requirements.find((requirement) => requirement.id === selectedRequirementId) || null,
    [requirements, selectedRequirementId],
  )

  const hasFilters = Boolean(
    searchText
    || filterVersion
    || filterPlatform
    || filterTrackingType
    || filterRequirementType
    || filterPriority,
  )

  const updateDetailParam = useCallback((id?: string) => {
    const next = new URLSearchParams(searchParams)
    if (id) next.set('detail', id)
    else next.delete('detail')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const openDetail = (requirement: Requirement) => {
    updateDetailParam(requirement.id)
  }

  const closeDetail = () => {
    updateDetailParam()
  }

  const openCreate = () => {
    setEditingRecord(null)
    setCopyFromRecord(null)
    setModalOpen(true)
  }

  const openEdit = (requirement: Requirement) => {
    if (requirement.status === 'done') return
    closeDetail()
    setEditingRecord(requirement)
    setCopyFromRecord(null)
    setModalOpen(true)
  }

  const openCopy = (requirement: Requirement) => {
    closeDetail()
    setCopyFromRecord(requirement)
    setEditingRecord(null)
    setModalOpen(true)
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
      await updateRequirement(editingRecord.id, values)
      message.success('需求已更新')
    } else {
      await createRequirement({ project_id: projectId!, ...values })
      message.success(copyFromRecord ? '需求已复制' : '需求已提交')
    }

    setModalOpen(false)
    setEditingRecord(null)
    setCopyFromRecord(null)
    await Promise.all([loadData(), loadVersions()])
  }

  const handleDelete = async (id: string) => {
    await deleteRequirement(id)
    if (selectedRequirementId === id) closeDetail()
    message.success('需求已删除')
    await loadData()
  }

  const handleStatusUpdate = async (
    requirement: Requirement,
    status: ActiveRequirementStatus,
    successMessage: string,
  ) => {
    setActionLoading(true)
    try {
      await updateRequirement(requirement.id, { status })
      message.success(successMessage)
      await loadData()
    } catch (error) {
      message.error(getErrorMessage(error))
    } finally {
      setActionLoading(false)
    }
  }

  const handleApproveAndSync = async (requirement: Requirement) => {
    if (!projectId) return

    const confirmed = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        title: '验收通过并同步？',
        content: `将把「${requirement.display_name || requirement.title}」同步到埋点资产。同步成功后需求才会进入已完成。`,
        okText: '验收并同步',
        cancelText: '取消',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      })
    })
    if (!confirmed) return

    setActionLoading(true)
    try {
      const result = await syncRequirementToTrackingAsset(requirement, projectId)
      await updateRequirement(requirement.id, { status: 'done' })
      const actionLabel = result.action === 'created' ? '创建' : '更新'
      message.success(`验收完成，已${actionLabel}「${result.assetName}」`)
      await loadData()
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      message.error(`同步失败，需求仍处于待验收：${errorMessage}`)
      await loadData()
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveComment = async (requirement: Requirement, comment: string) => {
    setActionLoading(true)
    try {
      await updateRequirement(requirement.id, { comment: comment.trim() })
      message.success('备注已保存')
      await loadData()
    } catch (error) {
      message.error(getErrorMessage(error))
    } finally {
      setActionLoading(false)
    }
  }

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over) return

    const targetStatus = over.id as ActiveRequirementStatus
    if (!ACTIVE_REQUIREMENT_STATUSES.includes(targetStatus)) return

    const requirement = requirements.find((item) => item.id === active.id)
    if (!requirement || requirement.status === targetStatus) return

    if (requirement.status === 'done') {
      message.info('已完成需求不能通过拖拽回退')
      return
    }
    if (targetStatus === 'done') {
      message.info('请打开需求并使用“验收通过并同步”完成需求')
      return
    }

    const isValidTransition = (
      requirement.status === 'pending' && targetStatus === 'in_progress'
    ) || (
      requirement.status === 'in_progress' && targetStatus === 'pending'
    )
    if (!isValidTransition) return

    const successMessage = targetStatus === 'in_progress' ? '需求已提交验收' : '需求已退回开发'
    await handleStatusUpdate(requirement, targetStatus, successMessage)
  }

  const handleAddVersion = async () => {
    if (!projectId || !newVersionName.trim()) return
    try {
      await createVersion(projectId, newVersionName.trim())
      setNewVersionName('')
      message.success('版本已添加')
      await loadVersions()
    } catch (error) {
      message.error(getErrorMessage(error))
    }
  }

  const handleDeleteVersion = async (id: string) => {
    try {
      await deleteVersion(id)
      message.success('版本已删除')
      await loadVersions()
    } catch (error) {
      message.error(getErrorMessage(error))
    }
  }

  const clearFilters = () => {
    setSearchText('')
    setFilterVersion(undefined)
    setFilterPlatform(undefined)
    setFilterTrackingType(undefined)
    setFilterRequirementType(undefined)
    setFilterPriority(undefined)
  }

  const commonCardActions = {
    onOpen: openDetail,
    onEdit: openEdit,
    onCopy: openCopy,
    onDelete: handleDelete,
  }

  return (
    <div className="requirement-workbench">
      <header className="requirement-workbench-header">
        <Space size={12}>
          <h2>埋点需求</h2>
          <Segmented
            value={viewMode}
            onChange={(value) => setViewMode(value as ViewMode)}
            options={[
              { value: 'workspace', icon: <UnorderedListOutlined />, label: '工作台' },
              { value: 'kanban', icon: <AppstoreOutlined />, label: '看板' },
            ]}
          />
        </Space>
        <Space>
          <Tooltip title="版本管理">
            <Button icon={<SettingOutlined />} aria-label="版本管理" onClick={() => setVersionModalOpen(true)} />
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>提交需求</Button>
        </Space>
      </header>

      <div className="requirement-filter-bar">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="搜索显示名、技术名或业务场景"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          className="requirement-search-input"
        />
        <Select
          allowClear
          showSearch
          placeholder="全部版本"
          value={filterVersion}
          onChange={setFilterVersion}
          options={allVersions.map((version) => ({ value: version.name, label: version.name }))}
          className="requirement-filter-select"
          optionFilterProp="label"
        />
        <Select
          allowClear
          placeholder="全部平台"
          value={filterPlatform}
          onChange={setFilterPlatform}
          options={PLATFORM_OPTIONS.map((platform) => ({ value: platform.value, label: platform.label }))}
          className="requirement-filter-select"
        />
        <Select
          allowClear
          placeholder="全部埋点类型"
          value={filterTrackingType}
          onChange={setFilterTrackingType}
          options={TRACKING_TYPE_OPTIONS}
          className="requirement-filter-select-wide"
        />
        <Select
          allowClear
          placeholder="新增/修改"
          value={filterRequirementType}
          onChange={setFilterRequirementType}
          options={[
            { value: 'new', label: '新增' },
            { value: 'modify', label: '修改' },
          ]}
          className="requirement-filter-select"
        />
        <Select
          allowClear
          placeholder="全部优先级"
          value={filterPriority}
          onChange={setFilterPriority}
          options={[
            { value: 'high', label: '高优先级' },
            { value: 'medium', label: '中优先级' },
            { value: 'low', label: '低优先级' },
          ]}
          className="requirement-filter-select"
        />
        <Button disabled={!hasFilters} onClick={clearFilters}>重置</Button>
        <Text type="secondary">共 {filteredRequirements.length} 条</Text>
      </div>

      {hasFilters ? (
        <Space size={[4, 4]} wrap className="requirement-active-filters">
          <Text type="secondary">当前筛选：</Text>
          {filterVersion ? <Tag closable onClose={() => setFilterVersion(undefined)}>版本 {filterVersion}</Tag> : null}
          {filterPlatform ? <Tag closable onClose={() => setFilterPlatform(undefined)}>{PLATFORM_OPTIONS.find((item) => item.value === filterPlatform)?.label}</Tag> : null}
          {filterTrackingType ? <Tag closable onClose={() => setFilterTrackingType(undefined)}>{TRACKING_TYPE_META[filterTrackingType].label}</Tag> : null}
          {filterRequirementType ? <Tag closable onClose={() => setFilterRequirementType(undefined)}>{REQUIREMENT_TYPE_META[filterRequirementType].label}</Tag> : null}
          {filterPriority ? <Tag closable onClose={() => setFilterPriority(undefined)}>优先级 {REQUIREMENT_PRIORITY_META[filterPriority].label}</Tag> : null}
        </Space>
      ) : null}

      {viewMode === 'workspace' ? (
        <>
          <Tabs
            activeKey={activeStatus}
            onChange={(key) => setActiveStatus(key as ActiveRequirementStatus)}
            items={ACTIVE_REQUIREMENT_STATUSES.map((status) => ({
              key: status,
              label: (
                <Space size={6}>
                  {REQUIREMENT_STATUS_LABELS[status]}
                  <Badge count={groupedRequirements[status].length} showZero overflowCount={999} />
                </Space>
              ),
            }))}
          />

          {loading ? (
            <div className="requirement-loading-list">
              <Skeleton active paragraph={{ rows: 2 }} />
              <Skeleton active paragraph={{ rows: 2 }} />
              <Skeleton active paragraph={{ rows: 2 }} />
            </div>
          ) : deferredSearchText.trim() ? (
            filteredRequirements.length > 0 ? (
              <div className="requirement-search-results">
                <Text type="secondary">搜索结果已按状态分组</Text>
                {ACTIVE_REQUIREMENT_STATUSES.map((status) => {
                  const statusRequirements = groupedRequirements[status]
                  if (statusRequirements.length === 0) return null
                  return (
                    <section key={status} className="requirement-result-group">
                      <div className="requirement-result-group-header">
                        <h3>{REQUIREMENT_STATUS_LABELS[status]}</h3>
                        <Badge count={statusRequirements.length} />
                      </div>
                      <RequirementCardList
                        requirements={statusRequirements}
                        emptyItemName={REQUIREMENT_STATUS_LABELS[status]}
                        onCreate={openCreate}
                        {...commonCardActions}
                      />
                    </section>
                  )
                })}
              </div>
            ) : (
              <EmptyState scene="no_data" itemName="匹配需求" onAction={clearFilters} actionLabel="清除筛选" />
            )
          ) : (
            <RequirementCardList
              requirements={groupedRequirements[activeStatus]}
              emptyItemName={REQUIREMENT_STATUS_LABELS[activeStatus]}
              onCreate={openCreate}
              {...commonCardActions}
            />
          )}
        </>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div
            ref={kanbanBoardRef}
            className="requirement-kanban-board"
            style={{
              gridTemplateColumns: `repeat(${ACTIVE_REQUIREMENT_STATUSES.length}, var(--kanban-column-width, ${KANBAN_FALLBACK_COLUMN_WIDTH}px))`,
            }}
          >
            {ACTIVE_REQUIREMENT_STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                label={REQUIREMENT_STATUS_LABELS[status]}
                items={groupedRequirements[status]}
                {...commonCardActions}
              />
            ))}
          </div>
        </DndContext>
      )}

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
            onChange={(event) => setNewVersionName(event.target.value)}
            onPressEnter={handleAddVersion}
          />
          <Button type="primary" onClick={handleAddVersion}>添加</Button>
        </Space.Compact>
        <List
          size="small"
          dataSource={allVersions}
          renderItem={(version) => (
            <List.Item
              actions={[
                <Popconfirm key="delete" title="删除版本？" onConfirm={() => handleDeleteVersion(version.id)}>
                  <Button type="link" size="small" danger icon={<DeleteOutlined />} aria-label={`删除版本 ${version.name}`} />
                </Popconfirm>,
              ]}
            >
              {version.name}
            </List.Item>
          )}
          locale={{ emptyText: <EmptyState scene="no_data" itemName="版本" /> }}
        />
      </Modal>

      <RequirementDetailDrawer
        key={selectedRequirement?.id || 'empty'}
        open={Boolean(selectedRequirement)}
        requirement={selectedRequirement}
        actionLoading={actionLoading}
        onClose={closeDetail}
        onEdit={openEdit}
        onCopy={openCopy}
        onDelete={handleDelete}
        onSaveComment={handleSaveComment}
        onSubmitForReview={(requirement) => handleStatusUpdate(requirement, 'in_progress', '需求已提交验收')}
        onReturnToDevelopment={(requirement) => handleStatusUpdate(requirement, 'pending', '需求已退回开发')}
        onApproveAndSync={handleApproveAndSync}
      />

      <RequirementFormModal
        open={modalOpen}
        projectId={projectId || ''}
        editingValues={editingRecord ? {
          title: editingRecord.title,
          display_name: editingRecord.display_name || '',
          tracking_type: editingRecord.tracking_type,
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
        onCancel={() => {
          setModalOpen(false)
          setEditingRecord(null)
          setCopyFromRecord(null)
        }}
      />
    </div>
  )
}
