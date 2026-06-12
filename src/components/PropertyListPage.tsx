import { useEffect, useState } from 'react'
import { Card, message } from 'antd'
import PropertyTable from './PropertyTable'
import type { PropertyItem, PropertyCreateValues } from './PropertyTable'

interface PropertyListPageProps {
  title: string
  fetchFn: () => Promise<PropertyItem[]>
  createFn: (values: PropertyCreateValues) => Promise<void>
  updateFn: (id: string, values: Partial<PropertyCreateValues>) => Promise<void>
  deleteFn: (id: string) => Promise<void>
  showRequired?: boolean
}

export default function PropertyListPage({
  title, fetchFn, createFn, updateFn, deleteFn, showRequired,
}: PropertyListPageProps) {
  const [data, setData] = useState<PropertyItem[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const result = await fetchFn()
      setData(result)
    } catch (err: any) {
      message.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>{title}</h2>
      <Card>
        <PropertyTable
          dataSource={data}
          loading={loading}
          showRequired={showRequired}
          onCreate={async (values) => { await createFn(values); await loadData() }}
          onUpdate={async (id, values) => { await updateFn(id, values); await loadData() }}
          onDelete={async (id) => { await deleteFn(id); await loadData() }}
        />
      </Card>
    </div>
  )
}
