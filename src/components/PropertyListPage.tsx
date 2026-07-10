import { useCallback, useEffect, useState } from 'react'
import { Card, message } from 'antd'
import PropertyTable from './PropertyTable'
import type { PropertyItem, PropertyCreateValues } from './PropertyTable'
import { formatError } from '../utils/errors'

interface PropertyListPageProps {
  title: string
  projectId: string
  fetchFn: (projectId: string) => Promise<PropertyItem[]>
  createFn: (values: PropertyCreateValues & { project_id: string }) => Promise<unknown>
  updateFn: (id: string, values: Partial<PropertyCreateValues>) => Promise<unknown>
  deleteFn: (id: string) => Promise<unknown>
  showRequired?: boolean
  tableResizeKey: string
}

export default function PropertyListPage({
  title, projectId, fetchFn, createFn, updateFn, deleteFn, showRequired, tableResizeKey,
}: PropertyListPageProps) {
  const [data, setData] = useState<PropertyItem[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchFn(projectId)
      setData(result)
    } catch (error: unknown) {
      message.error(formatError(error))
    } finally {
      setLoading(false)
    }
  }, [fetchFn, projectId])

  // Initial and project-driven fetching intentionally updates page state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadData() }, [loadData])

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>{title}</h2>
      <Card>
        <PropertyTable
          dataSource={data}
          loading={loading}
          showRequired={showRequired}
          projectId={projectId}
          resizeKey={`${tableResizeKey}-v2`}
          onCreate={async (values) => { await createFn({ project_id: projectId, ...values }); await loadData() }}
          onUpdate={async (id, values) => { await updateFn(id, values); await loadData() }}
          onDelete={async (id) => { await deleteFn(id); await loadData() }}
        />
      </Card>
    </div>
  )
}
