import { useEffect, useState } from 'react'
import { Card, message } from 'antd'
import PropertyTable from './PropertyTable'
import type { PropertyItem, PropertyCreateValues } from './PropertyTable'

interface PropertyListPageProps {
  title: string
  projectId: string
  fetchFn: (projectId: string) => Promise<PropertyItem[]>
  createFn: (values: PropertyCreateValues & { project_id: string }) => Promise<unknown>
  updateFn: (id: string, values: Partial<PropertyCreateValues>) => Promise<unknown>
  deleteFn: (id: string) => Promise<unknown>
  showRequired?: boolean
}

export default function PropertyListPage({
  title, projectId, fetchFn, createFn, updateFn, deleteFn, showRequired,
}: PropertyListPageProps) {
  const [data, setData] = useState<PropertyItem[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await fetchFn(projectId)
      setData(result)
    } catch (err: any) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData() }, [projectId])

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>{title}</h2>
      <Card>
        <PropertyTable
          dataSource={data}
          loading={loading}
          showRequired={showRequired}
          projectId={projectId}
          onCreate={async (values) => { await createFn({ project_id: projectId, ...values }); await loadData() }}
          onUpdate={async (id, values) => { await updateFn(id, values); await loadData() }}
          onDelete={async (id) => { await deleteFn(id); await loadData() }}
        />
      </Card>
    </div>
  )
}
