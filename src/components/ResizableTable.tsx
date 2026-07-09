import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ThHTMLAttributes } from 'react'
import { Button, Checkbox, Divider, Popover, Space, Table, Tooltip, Typography } from 'antd'
import { HolderOutlined, SettingOutlined } from '@ant-design/icons'
import type { TableProps } from 'antd'
import type { ColumnsType, ColumnType } from 'antd/es/table'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAuthStore } from '../stores/authStore'

const STORAGE_VERSION = 2
const STORAGE_PREFIX = 'tracking_platform:table_layout'
const LEGACY_WIDTH_STORAGE_PREFIX = 'tracking_platform:table_widths'
const DEFAULT_MIN_COLUMN_WIDTH = 48

type ColumnWidthMap = Record<string, number>

interface TableLayout {
  widths: ColumnWidthMap
  order: string[]
  hidden: string[]
}

interface StoredTableLayout extends Partial<TableLayout> {
  version?: number
}

interface ColumnMeta {
  key: string
  title: string
}

type ResizableColumn<RecordType> = ColumnType<RecordType> & {
  children?: ColumnsType<RecordType>
}

type ResizableTableProps<RecordType extends object> = Omit<TableProps<RecordType>, 'columns'> & {
  columns: ColumnsType<RecordType>
  resizeKey: string
  minColumnWidth?: number
}

interface HeaderCellProps extends ThHTMLAttributes<HTMLTableCellElement> {
  columnKey?: string
  columnWidth?: number | string
  minColumnWidth: number
  onResizeStart?: (columnKey: string, startWidth: number, startX: number) => void
}

interface SortableColumnItemProps {
  column: ColumnMeta
  checked: boolean
  disabled: boolean
  onToggle: (columnKey: string, checked: boolean) => void
}

function getStorageKey(userId: string | undefined, resizeKey: string) {
  return `${STORAGE_PREFIX}:v${STORAGE_VERSION}:${userId || 'anonymous'}:${resizeKey}`
}

function getLegacyStorageKey(userId: string | undefined, resizeKey: string) {
  return `${LEGACY_WIDTH_STORAGE_PREFIX}:v1:${userId || 'anonymous'}:${resizeKey}`
}

function createDefaultLayout(columnKeys: string[]): TableLayout {
  return { widths: {}, order: columnKeys, hidden: [] }
}

function getColumnKey<RecordType>(column: ResizableColumn<RecordType>, fallbackKey: string) {
  if (column.key !== undefined) return String(column.key)

  const dataIndex = column.dataIndex
  if (Array.isArray(dataIndex)) return dataIndex.join('.')
  if (dataIndex !== undefined) return String(dataIndex)

  return fallbackKey
}

function getNumberWidth(width: unknown) {
  if (typeof width === 'number' && Number.isFinite(width)) return width
  return undefined
}

function getTitleText(title: unknown, fallback: string) {
  if (typeof title === 'string' || typeof title === 'number') return String(title)
  return fallback
}

function getColumnMeta<RecordType>(columns: ColumnsType<RecordType>, path: number[] = []): ColumnMeta[] {
  return columns.flatMap((sourceColumn, index) => {
    const column = sourceColumn as ResizableColumn<RecordType>
    const columnKey = getColumnKey(column, [...path, index].join('.'))

    if (column.children) return getColumnMeta(column.children, [...path, index])

    return [{
      key: columnKey,
      title: getTitleText(column.title, columnKey),
    }]
  })
}

function sanitizeWidths(widths: unknown, columnKeys: string[]) {
  if (!widths || typeof widths !== 'object') return {}

  const columnKeySet = new Set(columnKeys)
  const nextWidths: ColumnWidthMap = {}
  Object.entries(widths).forEach(([key, value]) => {
    if (!columnKeySet.has(key)) return
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      nextWidths[key] = Math.round(value)
    }
  })
  return nextWidths
}

function normalizeLayout(layout: Partial<TableLayout> | undefined, columnKeys: string[]): TableLayout {
  const columnKeySet = new Set(columnKeys)
  const savedOrder = Array.isArray(layout?.order) ? layout.order.filter((key) => columnKeySet.has(key)) : []
  const missingKeys = columnKeys.filter((key) => !savedOrder.includes(key))
  const order = [...savedOrder, ...missingKeys]

  let hidden = Array.isArray(layout?.hidden)
    ? layout.hidden.filter((key) => columnKeySet.has(key))
    : []

  if (hidden.length >= columnKeys.length) {
    hidden = hidden.slice(0, Math.max(0, columnKeys.length - 1))
  }

  return {
    widths: sanitizeWidths(layout?.widths, columnKeys),
    order,
    hidden,
  }
}

function readJsonStorage(storageKey: string) {
  try {
    if (typeof localStorage === 'undefined') return undefined
    const raw = localStorage.getItem(storageKey)
    if (!raw) return undefined
    return JSON.parse(raw) as StoredTableLayout
  } catch {
    return undefined
  }
}

function readStoredLayout(storageKey: string, legacyStorageKey: string, columnKeys: string[]) {
  const stored = readJsonStorage(storageKey)
  if (stored?.version === STORAGE_VERSION) return normalizeLayout(stored, columnKeys)

  const legacy = readJsonStorage(legacyStorageKey)
  return normalizeLayout({ widths: legacy?.widths }, columnKeys)
}

function writeStoredLayout(storageKey: string, layout: TableLayout) {
  try {
    if (typeof localStorage === 'undefined') return

    const payload: StoredTableLayout = { version: STORAGE_VERSION, ...layout }
    localStorage.setItem(storageKey, JSON.stringify(payload))
  } catch {
    // localStorage may be unavailable in private mode or strict browser settings.
  }
}

function getOrderIndex(columnKey: string, orderIndexMap: Map<string, number>, fallbackIndex: number) {
  return orderIndexMap.get(columnKey) ?? fallbackIndex
}

function getColumnSortIndex<RecordType>(
  column: ResizableColumn<RecordType>,
  path: number[],
  orderIndexMap: Map<string, number>,
): number {
  if (!column.children) {
    const columnKey = getColumnKey(column, path.join('.'))
    return getOrderIndex(columnKey, orderIndexMap, path[path.length - 1] ?? 0)
  }

  return Math.min(
    ...column.children.map((child, index) => (
      getColumnSortIndex(child as ResizableColumn<RecordType>, [...path, index], orderIndexMap)
    )),
  )
}

function getTotalColumnWidth<RecordType>(columns: ColumnsType<RecordType>): number {
  return columns.reduce((total, sourceColumn) => {
    const column = sourceColumn as ResizableColumn<RecordType>
    if (column.children) return total + getTotalColumnWidth(column.children)
    return total + (getNumberWidth(column.width) ?? 0)
  }, 0)
}

function ResizableHeaderCell({
  children,
  columnKey,
  columnWidth,
  minColumnWidth,
  onResizeStart,
  className,
  ...restProps
}: HeaderCellProps) {
  const cellRef = useRef<HTMLTableCellElement | null>(null)

  const handleMouseDown = (event: MouseEvent<HTMLSpanElement>) => {
    if (!columnKey || !onResizeStart) return

    event.preventDefault()
    event.stopPropagation()

    const measuredWidth = cellRef.current?.getBoundingClientRect().width
    const startWidth = getNumberWidth(columnWidth) ?? Math.round(measuredWidth ?? minColumnWidth)
    onResizeStart(columnKey, Math.max(startWidth, minColumnWidth), event.clientX)
  }

  const nextClassName = ['resizable-table-header-cell', className].filter(Boolean).join(' ')

  return (
    <th ref={cellRef} className={nextClassName} {...restProps}>
      {children}
      {columnKey && (
        <span
          aria-hidden="true"
          className="resizable-table-handle"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={handleMouseDown}
        />
      )}
    </th>
  )
}

function SortableColumnItem({ column, checked, disabled, onToggle }: SortableColumnItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.key })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  }

  return (
    <div ref={setNodeRef} className="resizable-table-layout-row" style={style}>
      <span className="resizable-table-layout-drag-handle" {...attributes} {...listeners}>
        <HolderOutlined />
      </span>
      <Checkbox checked={checked} disabled={disabled} onChange={(event) => onToggle(column.key, event.target.checked)}>
        {column.title}
      </Checkbox>
    </div>
  )
}

export default function ResizableTable<RecordType extends object>({
  columns,
  resizeKey,
  minColumnWidth = DEFAULT_MIN_COLUMN_WIDTH,
  components,
  scroll,
  ...tableProps
}: ResizableTableProps<RecordType>) {
  const userId = useAuthStore((state) => state.user?.id)
  const storageKey = useMemo(() => getStorageKey(userId, resizeKey), [userId, resizeKey])
  const legacyStorageKey = useMemo(() => getLegacyStorageKey(userId, resizeKey), [userId, resizeKey])
  const columnMeta = useMemo(() => getColumnMeta(columns), [columns])
  const columnKeys = useMemo(() => columnMeta.map((column) => column.key), [columnMeta])
  const storedLayout = useMemo(
    () => readStoredLayout(storageKey, legacyStorageKey, columnKeys),
    [columnKeys, legacyStorageKey, storageKey],
  )
  const [layoutState, setLayoutState] = useState(() => ({
    storageKey,
    layout: storedLayout,
  }))
  const [resizingKey, setResizingKey] = useState<string | null>(null)
  const dragRef = useRef<{ columnKey: string; startWidth: number; startX: number } | null>(null)
  const layout = layoutState.storageKey === storageKey
    ? normalizeLayout(layoutState.layout, columnKeys)
    : storedLayout
  const layoutRef = useRef(layout)
  const hiddenSet = useMemo(() => new Set(layout.hidden), [layout.hidden])
  const visibleColumnCount = Math.max(0, columnKeys.length - layout.hidden.length)
  const layoutSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )

  useEffect(() => {
    layoutRef.current = layout
  }, [layout])

  const saveLayout = useCallback((nextLayout: TableLayout) => {
    const normalized = normalizeLayout(nextLayout, columnKeys)
    layoutRef.current = normalized
    setLayoutState({ storageKey, layout: normalized })
    writeStoredLayout(storageKey, normalized)
  }, [columnKeys, storageKey])

  const handleResizeStart = useCallback((columnKey: string, startWidth: number, startX: number) => {
    layoutRef.current = layout
    dragRef.current = { columnKey, startWidth, startX }
    setResizingKey(columnKey)
  }, [layout])

  useEffect(() => {
    if (!resizingKey) return

    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const setDraggedWidth = (clientX: number) => {
      const drag = dragRef.current
      if (!drag) return layoutRef.current

      const nextWidth = Math.max(minColumnWidth, Math.round(drag.startWidth + clientX - drag.startX))
      const currentLayout = layoutRef.current
      if (currentLayout.widths[drag.columnKey] === nextWidth) return currentLayout

      const nextLayout = {
        ...currentLayout,
        widths: { ...currentLayout.widths, [drag.columnKey]: nextWidth },
      }
      layoutRef.current = nextLayout
      setLayoutState({ storageKey, layout: nextLayout })
      return nextLayout
    }

    const handleMouseMove = (event: globalThis.MouseEvent) => {
      setDraggedWidth(event.clientX)
    }

    const handleMouseUp = (event: globalThis.MouseEvent) => {
      const latestLayout = setDraggedWidth(event.clientX)
      writeStoredLayout(storageKey, latestLayout)
      dragRef.current = null
      setResizingKey(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
    }
  }, [minColumnWidth, resizingKey, storageKey])

  const orderedColumnMeta = useMemo(() => {
    const columnMap = new Map(columnMeta.map((column) => [column.key, column]))
    return layout.order.map((columnKey) => columnMap.get(columnKey)).filter((column): column is ColumnMeta => Boolean(column))
  }, [columnMeta, layout.order])

  const handleColumnOrderChange = useCallback((event: DragEndEvent) => {
    if (!event.over) return

    const activeKey = String(event.active.id)
    const overKey = String(event.over.id)
    if (activeKey === overKey) return

    const oldIndex = layout.order.indexOf(activeKey)
    const newIndex = layout.order.indexOf(overKey)
    if (oldIndex < 0 || newIndex < 0) return

    saveLayout({
      ...layout,
      order: arrayMove(layout.order, oldIndex, newIndex),
    })
  }, [layout, saveLayout])

  const handleColumnVisibleChange = useCallback((columnKey: string, checked: boolean) => {
    const nextHidden = checked
      ? layout.hidden.filter((key) => key !== columnKey)
      : [...layout.hidden, columnKey]

    saveLayout({ ...layout, hidden: nextHidden })
  }, [layout, saveLayout])

  const handleResetWidths = useCallback(() => {
    saveLayout({ ...layout, widths: {} })
  }, [layout, saveLayout])

  const handleResetLayout = useCallback(() => {
    saveLayout(createDefaultLayout(columnKeys))
  }, [columnKeys, saveLayout])

  const preparedColumns = useMemo(() => {
    const orderIndexMap = new Map(layout.order.map((columnKey, index) => [columnKey, index]))

    const applyLayout = (sourceColumns: ColumnsType<RecordType>, path: number[] = []): ColumnsType<RecordType> => {
      const nextColumns: ResizableColumn<RecordType>[] = []

      sourceColumns.forEach((sourceColumn, index) => {
        const column = sourceColumn as ResizableColumn<RecordType>
        const columnPath = [...path, index]
        const columnKey = getColumnKey(column, columnPath.join('.'))

        if (column.children) {
          const children = applyLayout(column.children, columnPath)
          if (children.length > 0) nextColumns.push({ ...column, children })
          return
        }

        if (hiddenSet.has(columnKey)) return

        const columnWidth = layout.widths[columnKey] ?? column.width

        nextColumns.push({
          ...column,
          width: columnWidth,
          onHeaderCell: (headerColumn: Parameters<NonNullable<typeof column.onHeaderCell>>[0]) => {
            const baseProps = column.onHeaderCell?.(headerColumn) ?? {}
            return {
              ...baseProps,
              columnKey,
              columnWidth,
              minColumnWidth,
              onResizeStart: handleResizeStart,
            }
          },
        })
      })

      return nextColumns.sort((a, b) => (
        getColumnSortIndex(a, path, orderIndexMap) - getColumnSortIndex(b, path, orderIndexMap)
      ))
    }

    return applyLayout(columns)
  }, [columns, handleResizeStart, hiddenSet, layout.order, layout.widths, minColumnWidth])

  const mergedComponents = useMemo(() => ({
    ...components,
    header: {
      ...components?.header,
      cell: ResizableHeaderCell,
    },
  }), [components])

  const mergedScroll = useMemo(() => {
    const totalColumnWidth = getTotalColumnWidth(preparedColumns)
    if (!scroll || totalColumnWidth <= 0) return scroll
    if (typeof scroll.x === 'number') return { ...scroll, x: Math.max(scroll.x, totalColumnWidth) }
    if (scroll.x === undefined) return { ...scroll, x: totalColumnWidth }
    return scroll
  }, [preparedColumns, scroll])

  const layoutContent = (
    <div className="resizable-table-layout-panel">
      <Typography.Text strong>列显示与排序</Typography.Text>
      <div className="resizable-table-layout-list">
        <DndContext sensors={layoutSensors} collisionDetection={closestCenter} onDragEnd={handleColumnOrderChange}>
          <SortableContext items={orderedColumnMeta.map((column) => column.key)} strategy={verticalListSortingStrategy}>
            {orderedColumnMeta.map((column) => {
              const checked = !hiddenSet.has(column.key)
              const disabled = checked && visibleColumnCount <= 1

              return (
                <SortableColumnItem
                  key={column.key}
                  column={column}
                  checked={checked}
                  disabled={disabled}
                  onToggle={handleColumnVisibleChange}
                />
              )
            })}
          </SortableContext>
        </DndContext>
      </div>
      <Divider style={{ margin: '10px 0' }} />
      <Space>
        <Button size="small" onClick={handleResetWidths}>重置列宽</Button>
        <Button size="small" onClick={handleResetLayout}>恢复默认</Button>
      </Space>
    </div>
  )

  return (
    <div className="resizable-table">
      <div className="resizable-table-toolbar">
        <Popover content={layoutContent} trigger="click" placement="bottomRight">
          <Tooltip title="排版配置">
            <Button type="text" size="small" icon={<SettingOutlined />} aria-label="排版配置" />
          </Tooltip>
        </Popover>
      </div>
      <Table<RecordType>
        {...tableProps}
        columns={preparedColumns}
        components={mergedComponents}
        scroll={mergedScroll}
      />
    </div>
  )
}
